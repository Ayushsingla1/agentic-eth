import StakingControl from "../components/stakingControl";
import StakingInfo from "../components/stakingInfo";
import StatCard from "../components/StatCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Coins, Award, CheckCircle, BarChart3, Wallet} from 'lucide-react';
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { contractAddress , ABI } from "../config/contractInfo"; 

const rewardsData = [
    { date: 'Jan', rewards: 120 },
    { date: 'Feb', rewards: 180 },
    { date: 'Mar', rewards: 150 },
    { date: 'Apr', rewards: 220 },
    { date: 'May', rewards: 280 },
    { date: 'Jun', rewards: 250 },
  ];

const contractDetails = {
    address : contractAddress,
    abi : ABI
}

export default function Dashboard() {

    const {address} = useAccount();

    console.log(address)

    const {data, isSuccess , isLoading , isError } = useReadContract({
        ...contractDetails,
        account : address,
        functionName : "getAgentInfo",
    })

    const {data : data2 , isSuccess : isSuccess2 , isLoading : isLoading2 , isError : isError2} = useReadContract({
        ...contractDetails,
        functionName : "getPrice"
    })
    

    if(isLoading || isLoading2){
        console.log("liadindj")
        return <div className="w-screen h-screen flex justify-center items-center">Loading...</div>
    }

    if(isError2) {
        console.log(isError);
        return <div className="w-screen h-screen flex justify-center items-center">Error while loading</div>
    }

    if(isSuccess2 && isSuccess){

        const stakedAmount = parseInt(data.stakedAmount)/(10 ** 17);
        const totalSubmissions = parseInt(data.totalSubmissions);
        const SuccessRate = parseInt(data.totalSubmissions) === 0 ? (0) : (parseInt(data.totalSubmissions - data.penaltyCount)/(parseInt(data.totalSubmissions)) * 100) ;
        const isRegistered = data.isRegistered;
        const LastPrice = parseInt(data2);

        return (
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Coins className="text-emerald-400" />
                  Crypto Staking Dashboard
                </h1>
                <div className="flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700/50">
                  <div className={`w-2.5 h-2.5 rounded-full ${isRegistered ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium">{isRegistered ? 'Registered for Staking' : 'Not Registered'}</span>
                </div>
              </div>
        
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  icon={Award}
                  title="Last Prize"
                  value={LastPrice}
                />
                <StatCard
                  icon={Wallet}
                  title="Total Staked"
                  value={`${stakedAmount} ETH`}
                />
                <StatCard
                  icon={CheckCircle}
                  title="Total Submissions"
                  value={totalSubmissions}
                />
                <StatCard
                  icon={BarChart3}
                  title="Success Rate"
                  value={SuccessRate}
                />
              </div>
        
              {/* Interactive Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <StakingControl />
                <StakingInfo stakedAmount = {stakedAmount}/>
              </div>
        
              {/* Chart Section */}
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6">Rewards History</h2>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rewardsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        label={{ value: 'Rewards (ETH)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.75rem' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rewards" 
                        stroke="#34D399" 
                        strokeWidth={2}
                        dot={{ fill: '#34D399' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
    }
  }