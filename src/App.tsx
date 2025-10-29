import React, { useEffect, useState } from 'react';
import { AptosWalletAdapterProvider, Wallet } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { MartianWallet } from '@martianwallet/aptos-wallet-adapter';
import { useAppStore } from './store/useAppStore';
import { WalletConnect } from './components/WalletConnect';
import { TokenList } from './components/TokenList';
import { BatchSwapForm } from './components/BatchSwapForm';
import { TransactionHistory } from './components/TransactionHistory';
import { ToastNotifications } from './components/ToastNotifications';
import { Moon, Sun, Github, Wallet as WalletIcon, Loader2, Info } from 'lucide-react';

const plugins: Wallet[] = [
  new PetraWallet(),
  new MartianWallet(),
];

function AppContent() {
  const { isDarkMode, toggleDarkMode, isLoading, transactions } = useAppStore();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const realPendingCount = transactions.filter(tx =>
    tx.status === 'pending' && !tx.hash.startsWith('pending_')
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                <WalletIcon size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  XCHAIN DEX
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Multi-token swapping made easy
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </div>
              )}

              {realPendingCount > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 cursor-help px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    {realPendingCount} transaction{realPendingCount > 1 ? 's' : ''} pending
                    <Info size={14} className="text-amber-500" />
                  </div>

                  {showTooltip && (
                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-xl z-50">
                      <div className="font-medium mb-1">Pending Transactions</div>
                      <p className="text-gray-300">
                        These transactions are being processed on the Aptos blockchain.
                        They will automatically update once confirmed.
                      </p>
                      <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"></div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <a
                href="https://github.com/ixuxoinzo"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="View on GitHub"
              >
                <Github size={20} />
              </a>

              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <TokenList />
            <BatchSwapForm />
          </div>

          <div className="space-y-8">
            <TransactionHistory />

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 How to Use
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Connect your Aptos wallet (Petra, Martian, etc.)</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Select tokens you want to swap and enter amounts</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use percentage buttons for quick amount selection</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Review swap details and confirm batch transaction</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Track all transactions in the history panel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 XCHAIN DEX. Built on Aptos Testnet.
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <a 
                href="https://explorer.aptoslabs.com/?network=testnet" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Aptos Explorer
              </a>
              <a 
                href="https://aptos.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Aptos Docs
              </a>
              <a 
                href="https://github.com/ixuxoinzo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Report Issue
              </a>
            </div>
          </div>
        </div>
      </footer>

      <ToastNotifications />
    </div>
  );
}

function App() {
  return (
    <AptosWalletAdapterProvider
      plugins={plugins}
      autoConnect={true}
      onError={(error) => {
        console.log('Wallet error:', error);
      }}
    >
      <AppContent />
    </AptosWalletAdapterProvider>
  );
}

export default App;
