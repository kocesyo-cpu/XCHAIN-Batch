import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { TransactionService } from '../services/transactionService';
import { formatAmount, formatTimestamp } from '../utils/formatters';
import { ExternalLink, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const { transactions } = useAppStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Loader2 size={16} className="animate-spin text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="text-gray-400 mb-4">
          <Clock size={48} className="mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No transactions yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Your swap transactions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transaction History
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {transactions.length} total
          </span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {transactions.map((tx, index) => (
          <motion.div
            key={tx.hash}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 transition-colors ${getStatusBgColor(tx.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(tx.status)}
                <span className={`text-sm font-medium ${getStatusColor(tx.status)}`}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatTimestamp(tx.timestamp)}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatAmount(tx.tokens.input.amount, tx.tokens.input.decimals)} {tx.tokens.input.symbol}
                </span>
                <span className="text-gray-500 dark:text-gray-400 mx-2">→</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatAmount(tx.tokens.output.amount, tx.tokens.output.decimals)} {tx.tokens.output.symbol}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {tx.hash.startsWith('pending') ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}`
                )}
              </div>
              {!tx.hash.startsWith('pending') && (
                <a
                  href={TransactionService.getExplorerUrl(tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm transition-colors"
                >
                  View
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {tx.gasUsed && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Gas used: {tx.gasUsed}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
