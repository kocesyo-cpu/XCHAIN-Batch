import React from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { WalletService } from '../services/walletService';
import { formatAddress } from '../utils/formatters';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

export const WalletConnect: React.FC = () => {
  const { connect, disconnect, account, connected, wallets } = useWallet();
  const { setConnected, setTokens, setLoading, refreshBalances, isLoading } = useAppStore();

  const handleConnect = async (wallet: any) => {
    try {
      setLoading(true);
      await connect(wallet.name);
      setConnected(true, account?.address || null);
      
      if (account?.address) {
        const tokens = await WalletService.getTokenBalances(account.address);
        setTokens(tokens);
        toast.success(`🦊 Connected to ${wallet.name}`);
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      toast.error(`❌ Failed to connect: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setConnected(false);
      setTokens([]);
      toast.info('👋 Wallet disconnected');
    } catch (error: any) {
      console.error('Disconnection failed:', error);
      toast.error(`❌ Failed to disconnect: ${error.message}`);
    }
  };

  const handleRefresh = async () => {
    if (account?.address) {
      setLoading(true);
      try {
        await refreshBalances(account.address);
        toast.success('🔄 Balances updated');
      } catch (error: any) {
        toast.error(`❌ Failed to refresh: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      {!connected ? (
        <div className="relative group">
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg">
            Connect Wallet
          </button>
          
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
              >
                <img 
                  src={wallet.icon} 
                  alt={wallet.name}
                  className="w-6 h-6 rounded"
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {wallet.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {formatAddress(account.address)}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Disconnect
          </button>
        </motion.div>
      )}
    </div>
  );
};
