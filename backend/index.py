import asyncio
import aiohttp
import numpy as np
from web3 import Web3
from fastapi import FastAPI, BackgroundTasks
import logging
import json
import uvicorn
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

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
            raise ConnectionError("Failed to connect to base network")
        
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
            
            tx = self.contract.functions.submitPrice(current_price).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 10000000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 84532
            })
            
            # Sign transaction
            signed_tx = self.account.sign_transaction(tx)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            print(tx_hash)
            return tx_hash.hex()
        
        except Exception as e:
            logging.error(f"Price submission error: {e}")
            return None
        
    # async def register_node(self):
    #     try:
    #         tx = self.contract.functions.

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    try:
        oracle_agent = ETHOracleAgent(
            contract_address='0x07E036a87e020b0bbb2016d7893ad424aDC9F8bC',
            private_key='',
            abi_path='./contract_abi.json'
        )
        app.state.oracle_agent = oracle_agent
        
        # Background task for periodic price submission
        async def periodic_price_submission():
            while True:
                try:
                    await oracle_agent.submit_price()
                    await asyncio.sleep(3600)  # Submit price every hour
                except Exception as e:
                    logging.error(f"Periodic price submission failed: {e}")
        
        price_task = asyncio.create_task(periodic_price_submission())
        
        yield
        
        # Cleanup logic
        price_task.cancel()
    
    except Exception as e:
        logging.error(f"Startup error: {e}")
        yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(CORSMiddleware,allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origins = ['http://localhost:5173']
    )

@app.get("/current-price")
async def get_current_price():
    try:
        return await PriceAggregator.fetch_prices()
    except Exception as e:
        logging.error(f"Error fetching price: {e}")
        return {"error": str(e)}

@app.post("/submit-price")
async def submit_price():
    try:
        oracle_agent = app.state.oracle_agent
        tx = await oracle_agent.submit_price()
        return {"transaction": tx}
    except Exception as e:
        logging.error(f"Error submitting price: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)