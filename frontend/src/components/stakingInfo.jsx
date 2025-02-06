import { Wallet , Coins , Clock} from "lucide-react";

function StakingInfo() {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-6 text-white">Staking Information</h3>
        <div className="space-y-6">
          <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-300">Lock Period</span>
            </div>
            <span className="text-white font-medium">30 Days</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-300">Current APY</span>
            </div>
            <span className="text-white font-medium">12.5%</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-300">Total Staked</span>
            </div>
            <span className="text-white font-medium">25.5 ETH</span>
          </div>
        </div>
      </div>
    );
  }
  

export default StakingInfo;
  