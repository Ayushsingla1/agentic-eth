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
const config_js_1 = require("./config.js");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
require('dotenv').config();
const hf = new inference_1.HfInference(process.env.HUGGING_FACE);
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const contractABI = config_js_1.ABI;
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const contractAddress = "0x7DEC0110252C2B22f0e69fe33D4155260042469c";
const privateKey = process.env.PRIVATE_KEY;
let provider;
let wallet;
let contract;
if (!privateKey) {
    console.error("Private key not found in environment variables");
    process.exit(1);
}
try {
    provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers_1.ethers.Wallet(privateKey, provider);
    contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
}
catch (error) {
    console.error("Failed to initialize blockchain connection:", error);
    process.exit(1);
}
function getCryptoPrices() {
    return __awaiter(this, arguments, void 0, function* (ids = "ethereum,bitcoin") {
        try {
            const { data } = yield axios_1.default.get(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`);
            if (!data) {
                return { success: false, msg: "No price data received" };
            }
            return { success: true, msg: data };
        }
        catch (error) {
            console.error("Failed to fetch crypto prices:", error);
            return { success: false, msg: "Failed to fetch crypto prices" };
        }
    });
}
function getEthPrice() {
    return __awaiter(this, arguments, void 0, function* (ids = "ethereum") {
        var _a;
        try {
            const { data } = yield axios_1.default.get(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`);
            if (!((_a = data === null || data === void 0 ? void 0 : data.ethereum) === null || _a === void 0 ? void 0 : _a.usd)) {
                return { success: false, msg: "Invalid price data received" };
            }
            return { success: true, msg: String(data.ethereum.usd) };
        }
        catch (error) {
            console.error("Failed to get ETH price:", error);
            return { success: false, msg: "Failed to fetch ETH price" };
        }
    });
}
function updatePrice() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const priceResponse = yield getEthPrice();
            if (!priceResponse.success) {
                return priceResponse;
            }
            const tx = yield contract.submitPrice(ethers_1.ethers.parseEther(priceResponse.msg));
            if (!tx) {
                return { success: false, msg: "Transaction failed to initiate" };
            }
            const receipt = yield tx.wait();
            if (!receipt.status) {
                return { success: false, msg: "Transaction failed to confirm" };
            }
            return { success: true, msg: tx.hash };
        }
        catch (error) {
            console.error("Price update failed:", error);
            return { success: false, msg: "Failed to update price" };
        }
    });
}
function mintToken(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!amount || isNaN(parseInt(amount))) {
                return { success: false, msg: "Invalid amount specified" };
            }
            const tx = yield contract.getRewards(parseInt(amount));
            if (!tx) {
                return { success: false, msg: "Transaction failed to initiate" };
            }
            const receipt = yield tx.wait();
            if (!receipt.status) {
                return { success: false, msg: "Transaction failed to confirm" };
            }
            return { success: true, msg: tx.hash };
        }
        catch (error) {
            console.error("Token minting failed:", error);
            return { success: false, msg: "Failed to mint tokens" };
        }
    });
}
function getTokenCount() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const count = yield contract.getRewardCount();
            if (count === undefined) {
                return { success: false, msg: "Invalid token count received" };
            }
            return { success: true, msg: parseInt(count) };
        }
        catch (error) {
            console.error("Token count retrieval failed:", error);
            return { success: false, msg: "Failed to get token count" };
        }
    });
}
function stakeAmount(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!amount || isNaN(parseFloat(amount))) {
                return { success: false, msg: "Invalid stake amount specified" };
            }
            const tx = yield contract.stakeMore(ethers_1.ethers.parseEther(amount), {
                value: ethers_1.ethers.parseEther(amount)
            });
            if (!tx) {
                return { success: false, msg: "Staking transaction failed to initiate" };
            }
            const receipt = yield tx.wait();
            if (!receipt.status) {
                return { success: false, msg: "Staking transaction failed to confirm" };
            }
            return { success: true, msg: `Transaction completed successfully, hash: ${tx.hash}` };
        }
        catch (error) {
            console.error("Staking operation failed:", error);
            return { success: false, msg: "Failed to stake tokens" };
        }
    });
}
function unstakeAmount(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!amount || isNaN(parseFloat(amount))) {
                return { success: false, msg: "Invalid unstake amount specified" };
            }
            const tx = yield contract.unstake(ethers_1.ethers.parseEther(amount));
            if (!tx) {
                return { success: false, msg: "Unstaking transaction failed to initiate" };
            }
            const receipt = yield tx.wait();
            if (!receipt.status) {
                return { success: false, msg: "Unstaking transaction failed to confirm" };
            }
            return { success: true, msg: `Transaction completed successfully, hash: ${tx.hash}` };
        }
        catch (error) {
            console.error("Unstaking operation failed:", error);
            return { success: false, msg: "Failed to unstake tokens" };
        }
    });
}
function getHistoricalData() {
    return __awaiter(this, arguments, void 0, function* (coin = "ethereum", days = 7) {
        try {
            const { data } = yield axios_1.default.get(`${COINGECKO_API}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`);
            return data.prices;
        }
        catch (error) {
            console.error("Error fetching historical data:", error);
            return null;
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
            return "neutral";
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
            return null;
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
            return response.generated_text;
        }
        catch (error) {
            console.error("Error predicting price:", error);
            return null;
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
                candidate_labels: ["price", "sentiment", "prediction", "news", "staking", "unstake", "reward"],
            },
        });
        //@ts-ignore
        const queryType = intent.labels[0];
        console.log("Query type:", queryType);
        switch (queryType) {
            case "price":
                const prices = yield getCryptoPrices();
                if (!prices.success) {
                    return res.json({ type: "price", data: "Unable to fetch prices at this time" });
                }
                const price = prices.msg.ethereum.usd;
                return res.json({ type: "price", data: `Current price of ethereum is : $${price}` });
            case "sentiment":
                const sentiment = yield getMarketSentiment(userQuery);
                const response = `According to my study the current sentiment of ethereum is ${sentiment}`;
                return res.json({ type: "sentiment", data: response });
            case "prediction":
                const history = yield getHistoricalData();
                if (!history) {
                    return res.json({ type: "prediction", data: "Unable to fetch historical data" });
                }
                const prediction = yield predictPrice(history.map((p) => p[1]));
                return res.json({ type: "prediction", data: prediction });
            case "news":
                const news = yield analyzeNewsImpact();
                if (!news) {
                    return res.json({ type: "news", data: "Unable to fetch news data" });
                }
                return res.json({ type: "news", data: news });
            case "staking":
                const number = userQuery.match(/\d+(\.\d+)?/g);
                if (number) {
                    const stakeResponse = yield stakeAmount(number[0]);
                    if (!stakeResponse.success) {
                        return res.json({ type: "staking", data: stakeResponse.msg });
                    }
                    return res.json({ type: "staking", data: stakeResponse.msg });
                }
                else {
                    return res.json({
                        type: "staking",
                        data: "As you stake more amount of money you'll be given priority points and this will give you better yields"
                    });
                }
            case "unstake":
                const amount = userQuery.match(/\d+(\.\d+)?/g);
                if (amount) {
                    const unstakeResponse = yield unstakeAmount(amount[0]);
                    if (!unstakeResponse.success) {
                        return res.json({ type: "unstaking", data: unstakeResponse.msg });
                    }
                    return res.json({ type: "unstaking", data: unstakeResponse.msg });
                }
                else {
                    return res.json({
                        type: "unstaking",
                        data: "You can unstake some amount of tokens from the amount that you have staked"
                    });
                }
            case "reward":
                const tokenCount = userQuery.match(/\d+(\.\d+)?/g);
                if (tokenCount) {
                    const mintResponse = yield mintToken(tokenCount[0]);
                    if (!mintResponse.success) {
                        return res.json({ type: "reward", data: mintResponse.msg });
                    }
                    return res.json({ type: "reward", data: `You've been minted ${tokenCount} tokens` });
                }
                else {
                    const countResponse = yield getTokenCount();
                    if (!countResponse.success) {
                        return res.json({ type: "rewardCount", data: countResponse.msg });
                    }
                    return res.json({ type: "rewardCount", data: `You have a total of ${countResponse.msg} amount of tokens` });
                }
            default:
                return res.status(400).json({ type: "error", data: "Unknown query type" });
        }
    }
    catch (error) {
        console.error("Error processing query:", error);
        return res.status(500).json({ type: "error", data: "Internal Server Error" });
    }
}));
// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// setInterval(updatePrice, 16 * 60 * 1000);
app.listen(3000, () => console.log("Server running on port 3000"));
