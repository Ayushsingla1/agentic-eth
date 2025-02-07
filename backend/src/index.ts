import express from "express";
import axios from "axios";
import { HfInference } from "@huggingface/inference";
import cors from "cors";
import { ethers } from "ethers";
import { ABI } from "./config";
const app = express();

app.use(express.json());
app.use(cors());
require('dotenv').config();

const hf = new HfInference("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");
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const contractABI = ABI;

const RPC_URL = 'https://sepolia.base.org';
const contractAddress = "0x7dec0110252c2b22f0e69fe33d4155260042469c";
const privateKey = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(privateKey!,provider);
const contract = new ethers.Contract(contractAddress,contractABI,wallet);


async function getCryptoPrices(ids = "ethereum,bitcoin") {
  try {
    const { data } = await axios.get(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`);
    return data;
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    // throw new Error("Failed to fetch crypto prices");
  }
}

async function getEthPrice(ids = "ethereum") {
  try{
    const {data} = await axios.get(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`)
    console.log(data.ethereum.usd)
    console.log(typeof String(data.ethereum.usd))
    const res = String(data.ethereum.usd);
    return res;
  }
  catch(error) {
    console.log("Error fetching crypto prices",error);
  }
}

async function updatePrice() {
  try{
    const price = await getEthPrice();
    const tx = await contract.submitPrice(ethers.parseEther(price!));
    await tx.wait();
    console.log(tx.hash);
  }catch(e){
    console.log("unable to update price : " ,e);
  } 
}

async function stakeAmount(amount : string){
  const tx = await contract.stakeMore(ethers.parseEther(amount) , { value: ethers.parseEther(amount) });
  await tx.wait();
  return `Transaction done succesfully , your transaction hash is ${tx.hash}`;
}

async function unstakeAmount(amount : string){
  const tx = await contract.unstake(ethers.parseEther(amount));
  await tx.wait();
  return `Transaction done succesfully , your transaction hash is ${tx.hash}`;
}

async function getHistoricalData(coin = "ethereum", days = 7) {
  try {
    const { data } = await axios.get(`${COINGECKO_API}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`);
    console.log(data.prices);
    return data.prices;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    throw new Error("Failed to fetch historical data");
  }
}

async function getMarketSentiment(text: string) {
  try {
    const response = await hf.request({
      model: "finiteautomata/bertweet-base-sentiment-analysis",
      inputs: text,
    });

    //@ts-ignore
    return response[0]?.label || "neutral";
  } catch (error) {
    console.error("Error classifying sentiment:", error);
    throw new Error("Failed to classify sentiment");
  }
}

async function analyzeNewsImpact(coin = "ethereum") {
  try {
    const news = await axios.get(`${COINGECKO_API}/events`);
    const sentiments = await Promise.all(
      news.data.slice(0, 5).map(async (article: any) => {
        const sentiment = await getMarketSentiment(article.title);
        return sentiment;
      })
    );
    return {
      sentiments,
      headlines: news.data.slice(0, 5).map((n: any) => n.title),
    };
  } catch (error) {
    console.error("Error analyzing news impact:", error);
    throw new Error("Failed to analyze news impact");
  }
}

async function predictPrice(historicalPrices: number[]) {
  try {
    const prompt = `Given the last 5 prices: ${historicalPrices.slice(-5).join(", ")}, predict trend:`;
    const response = await hf.textGeneration({
      model: "microsoft/DialoGPT-medium",
      inputs: prompt,
      parameters: { max_length: 50 },
    });
    console.log(response)
    return response.generated_text;
  } catch (error) {
    console.error("Error predicting price:", error);
    throw new Error("Failed to predict price");
  }
}

app.post("/query", async (req : any, res : any) => {
  const { userQuery } = req.body;
  console.log(userQuery);
  try {
    const intent = await hf.request({
      model: "facebook/bart-large-mnli",
      inputs: userQuery,
      parameters: {
        candidate_labels: ["price", "sentiment", "prediction", "news" , "staking","unstake"],
      },
    });

    //@ts-ignore
    const queryType = intent.labels[0];
    console.log(intent)
    console.log("Query type:", queryType);
    switch (queryType) {
      case "price":
        const prices = await getCryptoPrices();
        const price = prices.ethereum.usd;
        return res.json({ type: "price", data: `Current price of ethereum is : $${price}` });

      case "sentiment":
        const sentiment = await getMarketSentiment(userQuery);
        const response = `According to my study the current sentiment of ethereum is ${sentiment}`;
        return res.json({ type: "sentiment", data: response });

      case "prediction":
        const history = await getHistoricalData();
        const prediction = await predictPrice(history.map((p: any) => p[1]));
        return res.json({ type: "prediction", data: prediction });

      case "news":
        const news = await analyzeNewsImpact();
        return res.json({ type: "news", data: news });

      case "staking":
        const number = userQuery.match(/\d+(\.\d+)?/g);
        console.log(typeof number[0]);
        if(number){
          const response = await stakeAmount(number[0]);
          return res.json({type : "staking" , data : response});
        }
        else{
          return res.json({type : "staking" , data : "As you stake more amount of money you'll be given priority points and this will give you better yields"})
        }

      case "unstaked":
        const amount = userQuery.match(/\d+(\.\d+)?/g);
        if(amount){
          const response = await unstakeAmount(amount);
          return res.json({type : "unstaking" , data : response});
        }
        else{
          return res.json({type : "unstaking" , data : "You can unstake some amount of tokens from the amount that you have staked"})
        }

      default:
        return res.status(400).json({ error: "Unknown query type" });
    }
  } catch (error : any) {
    console.error("Error processing query:", error.message);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});


setInterval(updatePrice, 16 * 60 * 1000);
app.listen(3000, () => console.log("Server running on port 3000"));
