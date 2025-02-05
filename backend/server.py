import asyncio
import aiohttp
import numpy as np
from web3 import Web3
from fastapi import FastAPI, BackgroundTasks
import logging
import json

logging.basicConfig(level=logging.INFO)

class PriceAggregator:
    SOURCES = {
        'coingecko': 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        'binance': 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
        'coinbase': 'https://api.coinbase.com/v2/prices/ETH-USD/spot'
    }

    @classmethod
    async def fetch_prices(cls) -> dict:
        async def get_price(source: str, url: str) -> float:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        data = await response.json()
                        
                        if source == 'coingecko':
                            return data['ethereum']['usd']
                        elif source == 'binance':
                            return float(data['price'])
                        elif source == 'coinbase':
                            return float(data['data']['amount'])
            except Exception as e:
                logging.error(f"Price fetch error from {source}: {e}")
                return None

        tasks = [get_price(source, url) for source, url in cls.SOURCES.items()]
        prices = await asyncio.gather(*tasks)
        
        valid_prices = [p for p in prices if p is not None]
        
        if not valid_prices:
            raise ValueError("No valid prices could be fetched")
        
        return {
            'sources': list(cls.SOURCES.keys()),
            'prices': valid_prices,
            'median_price': int(np.median(valid_prices) * 10**18),
            'mean_price': int(np.mean(valid_prices) * 10**18)
        }

class ETHOracleAgent:
    def __init__(self, contract_address, private_key, abi_path):
        self.w3 = Web3(Web3.HTTPProvider('https://sepolia.base.org'))
        
        if not self.w3.is_connected():
            raise ConnectionError("Failed to connect to Ethereum network")
        
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.private_key = private_key
        self.account = self.w3.eth.account.from_key(private_key)
        
        with open(abi_path, 'r') as abi_file:
            contract_abi = json.load(abi_file)
        
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=contract_abi)

    async def submit_price(self):
        try:
            price_data = await PriceAggregator.fetch_prices()
            current_price = price_data['median_price']
            
            tx = self.contract.functions.submitPrice(current_price).buildTransaction({
                'from': self.account.address,
                'nonce': self.w3.eth.getTransactionCount(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 84532
            })
            
            signed_tx = self.account.signTransaction(tx)
            
            tx_hash = await self.w3.eth.sendRawTransaction(signed_tx.rawTransaction)
            print(tx_hash)
            return tx_hash.hex()
        
        except Exception as e:
            logging.error(f"Price submission error: {e}")
            return None

app = FastAPI()

# You need to provide actual values
oracle_agent = ETHOracleAgent(
    contract_address='0x07E036a87e020b0bbb2016d7893ad424aDC9F8bC',
    private_key='b04b62c39ec72871daa46f404a84def21f1033be710a8aa24536f499cb95f2ae',
    abi_path='./contract_abi.json'
)

@app.get("/current-price")
async def get_current_price():
    try:
        return await PriceAggregator.fetch_prices()
    except Exception as e:
        logging.error(f"Error fetching price: {e}")
        return {"error": str(e)}

@app.post("/submit-price")
async def submit_price(background_tasks: BackgroundTasks):
    try:
        tx = await oracle_agent.submit_price()
        return {"transaction": tx}
    except Exception as e:
        logging.error(f"Error submitting price: {e}")
        return {"error": str(e)}



