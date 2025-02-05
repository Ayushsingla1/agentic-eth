import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const ETHPriceOracleUI = ({ contract }) => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [consensusPrice, setConsensusPrice] = useState(null);
  const [prices, setPrices] = useState([]);

  const fetchCurrentPrice = async () => {
    try {
      const response = await fetch('http://localhost:8000/current-price');
      const data = await response.json();
      setCurrentPrice(data.median_price);
      setPrices(data.prices);
    } catch (error) {
      console.error('Price fetch failed', error);
    }
  };

  const submitPrice = async () => {
    try {
      const tx = await contract.submitPrice(
        ethers.utils.parseUnits(currentPrice.toString(), 18),
        { value: ethers.utils.parseEther('0.001') }
      );
      await tx.wait();
    } catch (error) {
      console.error('Price submission failed', error);
    }
  };

  const calculateConsensus = async () => {
    try {
      const tx = await contract.calculateConsensus();
      await tx.wait();
      
      const price = await contract.getCurrentConsensusPrice();
      setConsensusPrice(ethers.utils.formatUnits(price, 18));
    } catch (error) {
      console.error('Consensus calculation failed', error);
    }
  };

  useEffect(() => {
    fetchCurrentPrice();
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">ETH Price Oracle</h2>
      
      <div className="mb-4">
        <h3>Current Prices:</h3>
        {prices.map((price, index) => (
          <div key={index}>${price.toFixed(2)}</div>
        ))}
      </div>

      <div className="mb-4">
        <strong>Median Price:</strong> ${currentPrice ? currentPrice.toFixed(2) : 'Loading'}
      </div>

      <button 
        onClick={submitPrice}
        className="w-full bg-blue-500 text-white p-2 rounded mb-2"
      >
        Submit Price
      </button>

      <button 
        onClick={calculateConsensus}
        className="w-full bg-green-500 text-white p-2 rounded"
      >
        Calculate Consensus
      </button>

      {consensusPrice && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          Consensus Price: ${consensusPrice}
        </div>
      )}
    </div>
  );
};

export default ETHPriceOracleUI;