import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, TrendingUp, Newspaper, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import QuickAction from '../components/Button';
import axios from 'axios';
import { BACKEND_URL } from '../config/backendInfo';


export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your crypto assistant. Ask me about market sentiment, prices, news, or staking!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async(content) => {
    if (!content.trim()) return;

    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }]);

    // const res = await axios.post(`${BACKEND_URL}/query`,{
    //     userQuery : content.toLowerCase()
    // })

    // let response = res.data.data;
    // console.log(response);
    // setMessages(prev => [...prev,{
    //     id : Date.now() + 1,
    //     type : 'bot',
    //     content : response,
    //     timestamp : new Date(),
    // }])
    setInput('');
  };

  const handleQuickAction = (query) => {
    handleSend(query);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-emerald-500/10 rounded-xl">
          <Bot className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold">Crypto AI Assistant</h1>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <QuickAction
          icon={TrendingUp}
          label="Market Sentiment"
          onClick={() => handleQuickAction("What's the current market sentiment?")}
        />
        <QuickAction
          icon={DollarSign}
          label="ETH Price"
          onClick={() => handleQuickAction("What's the current ETH price?")}
        />
        <QuickAction
          icon={Newspaper}
          label="Latest News"
          onClick={() => handleQuickAction("What's the latest crypto news?")}
        />
        <QuickAction
          icon={ArrowUpCircle}
          label="Staking Info"
          onClick={() => handleQuickAction("Stake more Amount")}
        />
        <QuickAction
          icon={ArrowDownCircle}
          label="Unstaking Info"
          onClick={() => handleQuickAction("Want to unstake Some amount")}
        />
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 h-[600px] overflow-y-auto border border-gray-700/50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-xl ${
                  message.type === 'user'
                    ? 'bg-emerald-500/10 text-white ring-1 ring-emerald-500/30'
                    : 'bg-gray-800 text-gray-200'
                }`}
              >
                <p>{message.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex gap-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about market sentiment, prices, news, or staking..."
          className="flex-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/20 transition-all"
        />
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Send className="w-5 h-5" />
          Send
        </button>
      </form>
    </div>
  );
}