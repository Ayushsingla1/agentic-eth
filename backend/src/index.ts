import express from "express";
import axios from "axios";
import { HfInference } from "@huggingface/inference";
import cors from "cors";
import { ethers } from "ethers";
import { ABI } from "./config.js";
import 'dotenv/config';

const app = express();

app.use(express.json());
app.use(cors());

interface ResponseType {
    success: boolean;
    msg: string | number | object;
}

const hf = new HfInference(process.env.HUGGING_FACE);
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const contractABI = ABI;

const RPC_URL = 'https://rpc.blaze.soniclabs.com';
const contractAddress = "0x894f819425e78cA3d7a3b877c088120D0b3Efc75";
const privateKey = process.env.PRIVATE_KEY;

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let contract: ethers.Contract;


if (!privateKey) {
    console.error("Private key not found in environment variables");
    process.exit(1);
}

try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddress, contractABI, wallet);
} catch (error) {
    console.error("Failed to initialize blockchain connection:", error);
    process.exit(1);
}

async function getCryptoPrices(ids = "sonic"): Promise<ResponseType> {
    try {
        const { data } = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=SUSDT`);
        if (!data) {
            return { success: false, msg: "No price data received" };
        }
        return { success: true, msg: data };
    } catch (error) {
        console.error("Failed to fetch crypto prices:", error);
        return { success: false, msg: "Failed to fetch crypto prices" };
    }
}

async function getEthPrice(ids = "ethereum"): Promise<ResponseType> {
    try {
        const { data } = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=SUSDT`);
        if (!data?.price) {
            return { success: false, msg: "Invalid price data received" };
        }
        return { success: true, msg: String(data.price) };
    } catch (error) {
        console.error("Failed to get ETH price:", error);
        return { success: false, msg: "Failed to fetch ETH price" };
    }
}

async function updatePrice(): Promise<ResponseType> {
    try {
        const priceResponse = await getEthPrice();
        if (!priceResponse.success) {
            return priceResponse;
        }

        const tx = await contract.submitPrice(ethers.parseEther(priceResponse.msg as string));
        if (!tx) {
            return { success: false, msg: "Transaction failed to initiate" };
        }

        const receipt = await tx.wait();
        if (!receipt.status) {
            return { success: false, msg: "Transaction failed to confirm" };
        }

        return { success: true, msg: tx.hash };
    } catch (error) {
        console.error("Price update failed:", error);
        return { success: false, msg: "Failed to update price" };
    }
}

async function mintToken(amount: string): Promise<ResponseType> {
    try {
        if (!amount || isNaN(parseInt(amount))) {
            return { success: false, msg: "Invalid amount specified" };
        }

        const tx = await contract.getRewards(parseInt(amount));
        if (!tx) {
            return { success: false, msg: "Transaction failed to initiate" };
        }

        const receipt = await tx.wait();
        if (!receipt.status) {
            return { success: false, msg: "Transaction failed to confirm" };
        }

        return { success: true, msg: tx.hash };
    } catch (error) {
        console.error("Token minting failed:", error);
        return { success: false, msg: "Failed to mint tokens" };
    }
}

async function getTokenCount(): Promise<ResponseType> {
    try {
        const count = await contract.getRewardCount();
        if (count === undefined) {
            return { success: false, msg: "Invalid token count received" };
        }
        return { success: true, msg: parseInt(count) };
    } catch (error) {
        console.error("Token count retrieval failed:", error);
        return { success: false, msg: "Failed to get token count" };
    }
}

async function stakeAmount(amount: string , address : string): Promise<ResponseType> {
    try {
        if (!amount || isNaN(parseFloat(amount))) {
            return { success: false, msg: "Invalid stake amount specified" };
        }

        const tx = await contract.stakeMore(ethers.parseEther(amount), { 
            value: ethers.parseEther(amount)
        });
        
        if (!tx) {
            return { success: false, msg: "Staking transaction failed to initiate" };
        }

        const receipt = await tx.wait();
        if (!receipt.status) {
            return { success: false, msg: "Staking transaction failed to confirm" };
        }

        return { success: true, msg: `Transaction completed successfully, hash: ${tx.hash}` };
    } catch (error) {
        console.error("Staking operation failed:", error);
        return { success: false, msg: "Failed to stake tokens" };
    }
}

async function unstakeAmount(amount: string , account : string): Promise<ResponseType> {
    try {
        if (!amount || isNaN(parseFloat(amount))) {
            return { success: false, msg: "Invalid unstake amount specified" };
        }

        const tx = await contract.unstake(ethers.parseEther(amount));
        if (!tx) {
            return { success: false, msg: "Unstaking transaction failed to initiate" };
        }

        const receipt = await tx.wait();
        if (!receipt.status) {
            return { success: false, msg: "Unstaking transaction failed to confirm" };
        }
        return { success: true, msg: `Transaction completed successfully, hash: ${tx.hash}` };
    } catch (error) {
        console.error("Unstaking operation failed:", error);
        return { success: false, msg: "Failed to unstake tokens" };
    }
}

async function getHistoricalData(coin = "ethereum", days = 7) {
    try {
        const { data } = await axios.get(
            `${COINGECKO_API}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`
        );
        return data.prices;
    } catch (error) {
        console.error("Error fetching historical data:", error);
        return null;
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
        return "neutral";
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
        return null;
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
        return response.generated_text;
    } catch (error) {
        console.error("Error predicting price:", error);
        return null;
    }
}

app.post("/query", async (req: any, res: any) => {
    const { userQuery , userId } = req.body;
    console.log(userQuery);
    
    try {
        const intent = await hf.request({
            model: "facebook/bart-large-mnli",
            inputs: userQuery,
            parameters: {
                candidate_labels: ["price", "sentiment", "prediction", "news", "staking", "unstake", "reward"],
            },
        });

        //@ts-ignore
        const queryType = intent.labels[0];
        console.log("Query type:", queryType);

        switch (queryType) {
            case "price":
                const prices = await getCryptoPrices();
                if (!prices.success) {
                    return res.json({ type: "price", data: "Unable to fetch prices at this time" });
                }
                const price = (prices.msg as any).price;
                return res.json({ type: "price", data: `Current price of ethereum is : $${price}` });

            case "sentiment":
                const sentiment = await getMarketSentiment(userQuery);
                const response = `According to my study the current sentiment of ethereum is ${sentiment}`;
                return res.json({ type: "sentiment", data: response });

            case "prediction":
                const history = await getHistoricalData();
                if (!history) {
                    return res.json({ type: "prediction", data: "Unable to fetch historical data" });
                }
                const prediction = await predictPrice(history.map((p: any) => p[1]));
                return res.json({ type: "prediction", data: prediction });

            case "news":
                const news = await analyzeNewsImpact();
                if (!news) {
                    return res.json({ type: "news", data: "Unable to fetch news data" });
                }
                return res.json({ type: "news", data: news });

            case "staking":
                const number = userQuery.match(/\d+(\.\d+)?/g);
                if (number) {
                    const stakeResponse = await stakeAmount(number[0],userId);
                    if (!stakeResponse.success) {
                        return res.json({ type: "staking", data: stakeResponse.msg });
                    }
                    return res.json({ type: "staking", data: stakeResponse.msg });
                } else {
                    return res.json({ 
                        type: "staking", 
                        data: "As you stake more amount of money you'll be given priority points and this will give you better yields"
                    });
                }

            case "unstake":
                const amount = userQuery.match(/\d+(\.\d+)?/g);
                if (amount) {
                    const unstakeResponse = await unstakeAmount(amount[0],userId);
                    if (!unstakeResponse.success) {
                        return res.json({ type: "unstaking", data: unstakeResponse.msg });
                    }
                    return res.json({ type: "unstaking", data: unstakeResponse.msg });
                } else {
                    return res.json({
                        type: "unstaking",
                        data: "You can unstake some amount of tokens from the amount that you have staked"
                    });
                }

            case "reward":
                const tokenCount = userQuery.match(/\d+(\.\d+)?/g);
                if (tokenCount) {
                    const mintResponse = await mintToken(tokenCount[0]);
                    if (!mintResponse.success) {
                        return res.json({ type: "reward", data: mintResponse.msg });
                    }
                    return res.json({ type: "reward", data: `You've been minted ${tokenCount} tokens` });
                } else {
                    const countResponse = await getTokenCount();
                    if (!countResponse.success) {
                        return res.json({ type: "rewardCount", data: countResponse.msg });
                    }
                    return res.json({ type: "rewardCount", data: `You have a total of ${countResponse.msg} amount of tokens` });
                }

            default:
                return res.status(400).json({ type: "error", data: "Unknown query type" });
        }
    } catch (error) {
        console.error("Error processing query:", error);
        return res.status(500).json({ type: "error", data: "Internal Server Error" });
    }
});


setInterval(updatePrice, 16 * 60 * 1000);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



