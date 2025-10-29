import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { WalletService } from '../services/walletService';
import { DexService } from '../services/dexService';
import { formatAmount, formatAddress } from '../utils/formatters';
import { Plus, Loader2 } from 'lucide-react';

export const TokenList: React.FC = () => {
  const { 
    tokens, 
    swapTokens, 
    setSwapTokens,
    getAptToken
  } = useAppStore();
  
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState<Set<string>>(new Set());

  // Real-time price updates every 10 seconds
  useEffect(() => {
    const updatePrices = async () => {
      const aptToken = getAptToken();
      if (!aptToken) return;

      const updated = [...swapTokens];
      let hasUpdates = false;

      for (let i = 0; i < updated.length; i++) {
        const swapToken = updated[i];
        if (swapToken.selected && swapToken.amount && parseFloat(swapToken.amount) > 0) {
          if (swapToken.token.address === aptToken.address) continue;

          try {
            const result = await DexService.getExpectedOutput(
              swapToken.token.address,
              aptToken.address,
              swapToken.amount
            );
            
            if (result && (
              result.outputAmount !== swapToken.expectedOutput ||
              Math.abs((result.priceImpact || 0) - (swapToken.priceImpact || 0)) > 0.1
            )) {
              updated[i] = {
                ...swapToken,
                expectedOutput: result.outputAmount,
                priceImpact: result.priceImpact
              };
              hasUpdates = true;
            }
          } catch (error) {
            console.error('Error updating price for:', swapToken.token.symbol, error);
          }
        }
      }
      
      if (hasUpdates) {
        setSwapTokens(updated);
      }
    };

    const interval = setInterval(updatePrices, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [swapTokens, getAptToken, setSwapTokens]);

  const handleTokenSelect = (tokenIndex: number, selected: boolean) => {
    const updated = [...swapTokens];
    updated[tokenIndex].selected = selected;
    if (!selected) {
      updated[tokenIndex].amount = '';
      updated[tokenIndex].expectedOutput = undefined;
      updated[tokenIndex].priceImpact = undefined;
    }
    setSwapTokens(updated);
  };

  const handleAmountChange = async (tokenIndex: number, amount: string) => {
    const updated = [...swapTokens];
    updated[tokenIndex].amount = amount;
    
    const swapToken = updated[tokenIndex];
    
    if (amount && parseFloat(amount) > 0) {
      setLoadingTokens(prev => new Set(prev).add(swapToken.token.address));
      updated[tokenIndex].loading = true;
      setSwapTokens(updated);
      
      const aptToken = getAptToken();
      if (aptToken && swapToken.token.address !== aptToken.address) {
        try {
          const result = await DexService.getExpectedOutput(
            swapToken.token.address,
            aptToken.address,
            amount
          );
          if (result) {
            updated[tokenIndex].expectedOutput = result.outputAmount;
            updated[tokenIndex].priceImpact = result.priceImpact;
          }
        } catch (error) {
          console.error('Error calculating output:', error);
          updated[tokenIndex].expectedOutput = undefined;
          updated[tokenIndex].priceImpact = undefined;
        }
      }
    } else {
      updated[tokenIndex].expectedOutput = undefined;
      updated[tokenIndex].priceImpact = undefined;
    }

    updated[tokenIndex].loading = false;
    setSwapTokens(updated);
    setLoadingTokens(prev => {
      const newSet = new Set(prev);
      newSet.delete(swapToken.token.address);
      return newSet;
    });
  };

  // Debounced amount change untuk performance
  const debouncedAmountChange = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (tokenIndex: number, amount: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          handleAmountChange(tokenIndex, amount);
        }, 500); // 500ms debounce
      };
    })(),
    []
  );

  const handlePercentageClick = (tokenIndex: number, percentage: number) => {
    const token = swapTokens[tokenIndex];
    if (!token.token.balance) return;

    const balance = parseFloat(token.token.balance);
    const decimals = token.token.decimals;
    const amount = (balance * percentage) / Math.pow(10, decimals);
    debouncedAmountChange(tokenIndex, amount.toFixed(decimals));
  };

  const handleAddCustomToken = async () => {
    if (!customTokenAddress.trim()) return;

    try {
      setIsAddingToken(true);
      const token = await WalletService.addTokenByAddress(customTokenAddress.trim());
      if (token) {
        const newSwapToken = {
          token,
          amount: '',
          selected: false
        };
        setSwapTokens([...swapTokens, newSwapToken]);
        setCustomTokenAddress('');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add token');
    } finally {
      setIsAddingToken(false);
    }
  };

  const selectedTokens = swapTokens.filter(st => st.selected && st.amount && parseFloat(st.amount) > 0);

  // Skeleton loading untuk tokens
  if (tokens.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Token Add */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus size={20} />
          Add Custom Token
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={customTokenAddress}
            onChange={(e) => setCustomTokenAddress(e.target.value)}
            placeholder="Enter token contract address (0x...::module::name)"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleAddCustomToken}
            disabled={isAddingToken || !customTokenAddress.trim()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {isAddingToken ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isAddingToken ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Token List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Tokens
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedTokens.length} selected
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {swapTokens.map((swapToken, index) => (
            <motion.div
              key={swapToken.token.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Token Info & Selection */}
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={swapToken.selected}
                    onChange={(e) => handleTokenSelect(index, e.target.checked)}
                    className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {swapToken.token.symbol.substring(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {swapToken.token.symbol}
                        </h4>
                        {WalletService.isAptToken(swapToken.token) && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            APT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {formatAddress(swapToken.token.address)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Balance & Input */}
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="text-right min-w-24">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatAmount(swapToken.token.balance, swapToken.token.decimals)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Balance
                    </div>
                  </div>

                  {swapToken.selected && (
                    <div className="flex flex-col gap-2 min-w-48">
                      <div className="flex gap-1">
                        {[25, 50, 100].map(percent => (
                          <button
                            key={percent}
                            onClick={() => handlePercentageClick(index, percent / 100)}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                          >
                            {percent}%
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={swapToken.amount}
                          onChange={(e) => debouncedAmountChange(index, e.target.value)}
                          placeholder="0.0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="any"
                        />
                        {loadingTokens.has(swapToken.token.address) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expected Output */}
              {swapToken.selected && swapToken.expectedOutput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 dark:text-blue-300">
                      Expected Output:
                    </span>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      {formatAmount(swapToken.expectedOutput, 8)} APT
                    </span>
                  </div>
                  {swapToken.priceImpact && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-blue-700 dark:text-blue-300">
                        Price Impact:
                      </span>
                      <span className={`font-semibold ${
                        swapToken.priceImpact > 10 ? 'text-red-600' : 
                        swapToken.priceImpact > 5 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {swapToken.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
