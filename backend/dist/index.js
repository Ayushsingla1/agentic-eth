"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const inference_1 = require("@huggingface/inference");
const cors_1 = __importDefault(require("cors"));
const ethers_1 = require("ethers");
const config_1 = require("./config");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
require('dotenv').config();
const hf = new inference_1.HfInference("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");
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const contractABI = config_1.ABI;
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const contractAddress = "0x7DEC0110252C2B22f0e69fe33D4155260042469c";
const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
function getCryptoPrices() {
    return __awaiter(this, arguments, void 0, function* (ids = "ethereum,bitcoin") {
        try {
            const { data } = yield axios_1.default.get(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`);
            return data;
        }
        catch (error) {
            console.error("Error fetching crypto prices:", error);
            // throw new Error("Failed to fetch crypto prices");
        }
    });
}
function getEthPrice() {
    return __awaiter(this, arguments, void 0, function* (ids = "ethereum") {
        try {
            const { data } = yield axios_1.default.get(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`);
            console.log(data.ethereum.usd);
            console.log(typeof String(data.ethereum.usd));
            const res = String(data.ethereum.usd);
            return res;
        }
        catch (error) {
            console.log("Error fetching crypto prices", error);
        }
    });
}
function updatePrice() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const price = yield getEthPrice();
            const tx = yield contract.submitPrice(ethers_1.ethers.parseEther(price));
            yield tx.wait();
            console.log(tx.hash);
        }
        catch (e) {
            console.log("unable to update price : ", e);
        }
    });
}
function stakeAmount(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = yield contract.stakeMore(ethers_1.ethers.parseEther(amount), { value: ethers_1.ethers.parseEther(amount) });
        yield tx.wait();
        return `Transaction done succesfully , your transaction hash is ${tx.hash}`;
    });
}
function unstakeAmount(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = yield contract.unstake(ethers_1.ethers.parseEther(amount));
        yield tx.wait();
        return `Transaction done succesfully , your transaction hash is ${tx.hash}`;
    });
}
function getHistoricalData() {
    return __awaiter(this, arguments, void 0, function* (coin = "ethereum", days = 7) {
        try {
            const { data } = yield axios_1.default.get(`${COINGECKO_API}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`);
            console.log(data.prices);
            return data.prices;
        }
        catch (error) {
            console.error("Error fetching historical data:", error);
            throw new Error("Failed to fetch historical data");
        }
    });
}
function getMarketSentiment(text) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const response = yield hf.request({
                model: "finiteautomata/bertweet-base-sentiment-analysis",
                inputs: text,
            });
            //@ts-ignore
            return ((_a = response[0]) === null || _a === void 0 ? void 0 : _a.label) || "neutral";
        }
        catch (error) {
            console.error("Error classifying sentiment:", error);
            throw new Error("Failed to classify sentiment");
        }
    });
}
function analyzeNewsImpact() {
    return __awaiter(this, arguments, void 0, function* (coin = "ethereum") {
        try {
            const news = yield axios_1.default.get(`${COINGECKO_API}/events`);
            const sentiments = yield Promise.all(news.data.slice(0, 5).map((article) => __awaiter(this, void 0, void 0, function* () {
                const sentiment = yield getMarketSentiment(article.title);
                return sentiment;
            })));
            return {
                sentiments,
                headlines: news.data.slice(0, 5).map((n) => n.title),
            };
        }
        catch (error) {
            console.error("Error analyzing news impact:", error);
            throw new Error("Failed to analyze news impact");
        }
    });
}
function predictPrice(historicalPrices) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const prompt = `Given the last 5 prices: ${historicalPrices.slice(-5).join(", ")}, predict trend:`;
            const response = yield hf.textGeneration({
                model: "microsoft/DialoGPT-medium",
                inputs: prompt,
                parameters: { max_length: 50 },
            });
            console.log(response);
            return response.generated_text;
        }
        catch (error) {
            console.error("Error predicting price:", error);
            throw new Error("Failed to predict price");
        }
    });
}
app.post("/query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userQuery } = req.body;
    console.log(userQuery);
    try {
        const intent = yield hf.request({
            model: "facebook/bart-large-mnli",
            inputs: userQuery,
            parameters: {
                candidate_labels: ["price", "sentiment", "prediction", "news", "staking", "unstake"],
            },
        });
        //@ts-ignore
        const queryType = intent.labels[0];
        console.log(intent);
        console.log("Query type:", queryType);
        switch (queryType) {
            case "price":
                const prices = yield getCryptoPrices();
                const price = prices.ethereum.usd;
                return res.json({ type: "price", data: `Current price of ethereum is : $${price}` });
            case "sentiment":
                const sentiment = yield getMarketSentiment(userQuery);
                const response = `According to my study the current sentiment of ethereum is ${sentiment}`;
                return res.json({ type: "sentiment", data: response });
            case "prediction":
                const history = yield getHistoricalData();
                const prediction = yield predictPrice(history.map((p) => p[1]));
                return res.json({ type: "prediction", data: prediction });
            case "news":
                const news = yield analyzeNewsImpact();
                return res.json({ type: "news", data: news });
            case "staking":
                const number = userQuery.match(/\d+(\.\d+)?/g);
                console.log(typeof number[0]);
                if (number) {
                    const response = yield stakeAmount(number[0]);
                    return res.json({ type: "staking", data: response });
                }
                else {
                    return res.json({ type: "staking", data: "As you stake more amount of money you'll be given priority points and this will give you better yields" });
                }
            case "unstaked":
                const amount = userQuery.match(/\d+(\.\d+)?/g);
                if (amount) {
                    const response = yield unstakeAmount(amount);
                    return res.json({ type: "unstaking", data: response });
                }
                else {
                    return res.json({ type: "unstaking", data: "You can unstake some amount of tokens from the amount that you have staked" });
                }
            default:
                return res.status(400).json({ error: "Unknown query type" });
        }
    }
    catch (error) {
        console.error("Error processing query:", error.message);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
}));
setInterval(updatePrice, 16 * 60 * 1000);
app.listen(3000, () => console.log("Server running on port 3000"));
