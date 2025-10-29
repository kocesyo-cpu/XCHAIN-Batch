import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAppStore } from '../store/useAppStore';
import { DexService } from '../services/dexService';
import { TransactionService } from '../services/transactionService';
import { formatAmount } from '../utils/formatters';
import { Swap, AlertTriangle, Loader2, Settings } from 'lucide-react';
import { toast } from 'react-toastify';

export const BatchSwapForm: React.FC = () => {
  const { signAndSubmitTransaction } = useWallet();
  const { 
    swapTokens, 
    account, 
    addTransaction, 
    updateTransaction,
    removeTransaction,
    refreshBalances,
    isLoading,
    setLoading,
    swapConfig,
    updateSwapConfig,
    getAptToken
  } = useAppStore();
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const selectedTokens = swapTokens.filter(st => 
    st.selected && st.amount && parseFloat(st.amount) > 0 && st.expectedOutput
  );

  const totalOutput = selectedTokens.reduce((sum, token) => {
    return sum + (token.expectedOutput ? parseFloat(token.expectedOutput) : 0);
  }, 0);

  const maxPriceImpact = Math.max(...selectedTokens.map(st => st.priceImpact || 0));
  const hasHighPriceImpact = maxPriceImpact > swapConfig.maxPriceImpact;

  const handleBatchSwap = async () => {
    if (!account?.address || selectedTokens.length === 0) return;

    setIsSwapping(true);
    setLoading(true);

    try {
      const aptToken = getAptToken();
      if (!aptToken) {
        throw new Error('APT token not found in wallet');
      }

      let shouldContinue = true;
      let successfulSwaps = 0;
      let failedSwaps = 0;

      for (const swapToken of selectedTokens) {
        if (!shouldContinue) break;

        // Skip jika sama dengan APT
        if (swapToken.token.address === aptToken.address) continue;

        // Check price impact
        if (swapToken.priceImpact && swapToken.priceImpact > swapConfig.maxPriceImpact) {
          toast.warn(`Skipping ${swapToken.token.symbol} - price impact too high (${swapToken.priceImpact.toFixed(2)}%)`);
          continue;
        }

        // Create transaction dengan hash unik
        const transactionId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transaction = {
          hash: transactionId,
          status: 'pending' as const,
          timestamp: Date.now(),
          tokens: {
            input: {
              symbol: swapToken.token.symbol,
              amount: swapToken.amount,
              address: swapToken.token.address,
              decimals: swapToken.token.decimals
            },
            output: {
              symbol: 'APT',
              amount: swapToken.expectedOutput || '0',
              address: aptToken.address,
              decimals: aptToken.decimals
            }
          }
        };

        addTransaction(transaction);

        try {
          console.log(`Executing swap: ${swapToken.token.symbol} -> APT`);
          
          const hash = await DexService.executeSwap(
            { signAndSubmitTransaction },
            swapToken.token.address,
            aptToken.address,
            swapToken.amount,
            swapToken.token.decimals,
            aptToken.decimals
          );

          // Update transaction dengan hash real
          removeTransaction(transactionId);
          addTransaction({
            ...transaction,
            hash,
            status: 'pending'
          });

          toast.info(`🔄 Swapping ${swapToken.token.symbol}...`);

          // Tunggu transaction dengan retry logic
          await TransactionService.waitForTransaction(hash, 30000, 3);
          const status = await TransactionService.getTransactionStatus(hash);
          updateTransaction(hash, status);
          
          if (status === 'success') {
            toast.success(`✅ ${swapToken.token.symbol} → APT successful!`);
            successfulSwaps++;
          } else {
            toast.error(`❌ ${swapToken.token.symbol} swap failed`);
            failedSwaps++;
            if (swapConfig.stopOnError) {
              shouldContinue = false;
            }
          }

        } catch (error: any) {
          console.error(`Swap failed for ${swapToken.token.symbol}:`, error);
          updateTransaction(transaction.hash, 'failed');
          toast.error(`❌ ${swapToken.token.symbol}: ${error.message}`);
          failedSwaps++;
          
          if (swapConfig.stopOnError) {
            shouldContinue = false;
          }
        }

        // Delay antar swaps
        if (swapConfig.delayBetweenSwaps > 0 && shouldContinue) {
          await new Promise(resolve => setTimeout(resolve, swapConfig.delayBetweenSwaps));
        }
      }

      // Refresh balances setelah semua swaps
      await refreshBalances(account.address);
      
      // Show final summary
      if (successfulSwaps > 0) {
        toast.success(`🎉 Batch swap completed! ${successfulSwaps} successful, ${failedSwaps} failed`);
      } else if (failedSwaps > 0) {
        toast.error(`❌ Batch swap failed: ${failedSwaps} swaps failed`);
      }

    } catch (error: any) {
      console.error('Batch swap failed:', error);
      toast.error(`❌ Batch swap failed: ${error.message}`);
    } finally {
      setIsSwapping(false);
      setLoading(false);
      setIsConfirming(false);
    }
  };

  if (selectedTokens.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center border border-gray-100 dark:border-gray-700">
        <Swap size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No tokens selected for swap
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Select tokens and enter amounts to start batch swapping to APT
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Swap size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Batch Swap Summary
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Swapping {selectedTokens.length} tokens to APT
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Swap Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Stop on error</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={swapConfig.stopOnError}
                  onChange={(e) => updateSwapConfig({ stopOnError: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Delay between swaps: {swapConfig.delayBetweenSwaps}ms
              </label>
              <input
                type="range"
                min="0"
                max="5000"
                step="500"
                value={swapConfig.delayBetweenSwaps}
                onChange={(e) => updateSwapConfig({ delayBetweenSwaps: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Max price impact: {swapConfig.maxPriceImpact}%
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={swapConfig.maxPriceImpact}
                onChange={(e) => updateSwapConfig({ maxPriceImpact: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Transaction List */}
      <div className="space-y-3 mb-6">
        {selectedTokens.map((swapToken, index) => (
          <motion.div
            key={swapToken.token.address}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex justify-between items-center p-3 rounded-lg ${
              swapToken.priceImpact && swapToken.priceImpact > swapConfig.maxPriceImpact 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'bg-gray-50 dark:bg-gray-750'
            }`}
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatAmount(swapToken.amount, swapToken.token.decimals)} {swapToken.token.symbol}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                → {swapToken.expectedOutput ? formatAmount(swapToken.expectedOutput, 8) : '0'} APT
              </div>
            </div>
            {swapToken.priceImpact && (
              <div className={`text-sm font-medium ${
                swapToken.priceImpact > swapConfig.maxPriceImpact ? 'text-red-600' : 
                swapToken.priceImpact > 5 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {swapToken.priceImpact.toFixed(2)}%
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex justify-between items-center">
          <span className="text-blue-700 dark:text-blue-300">Total Output:</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            {formatAmount(totalOutput.toString(), 8)} APT
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-blue-700 dark:text-blue-300">Number of Swaps:</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            {selectedTokens.length}
          </span>
        </div>
        {hasHighPriceImpact && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertTriangle size={16} />
            <span>High price impact detected - some swaps may be skipped</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setIsConfirming(true)}
          disabled={isLoading || hasHighPriceImpact}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Swap size={20} />
          )}
          {hasHighPriceImpact ? 'Adjust Amounts' : 'Confirm Batch Swap'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {isConfirming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Batch Swap
            </h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                You are about to swap {selectedTokens.length} tokens to APT:
              </p>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {selectedTokens.map(swapToken => (
                  <li key={swapToken.token.address} className="flex justify-between text-sm">
                    <span>{swapToken.token.symbol}</span>
                    <span>
                      {formatAmount(swapToken.amount, swapToken.token.decimals)} → {' '}
                      {formatAmount(swapToken.expectedOutput || '0', 8)} APT
                      {swapToken.priceImpact && (
                        <span className={`ml-2 ${
                          swapToken.priceImpact > 5 ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          ({swapToken.priceImpact.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              
              {swapConfig.stopOnError && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Will stop if any swap fails
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirming(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchSwap}
                disabled={isSwapping}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSwapping ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {isSwapping ? 'Swapping...' : 'Confirm Swap'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
