import { create } from 'zustand';
import { Token, SwapToken, Transaction, BatchSwapConfig } from '../types';
import { APTOS_COIN_ADDRESS } from '../services/walletService';
import { TransactionService } from '../services/transactionService';

interface AppState {
  isConnected: boolean;
  account: string | null;
  tokens: Token[];
  swapTokens: SwapToken[];
  transactions: Transaction[];
  isDarkMode: boolean;
  isLoading: boolean;
  swapConfig: BatchSwapConfig;
  
  setConnected: (connected: boolean, account?: string) => void;
  setTokens: (tokens: Token[]) => void;
  setSwapTokens: (swapTokens: SwapToken[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (hash: string, status: 'success' | 'failed', gasUsed?: string) => void;
  removeTransaction: (hash: string) => void;
  toggleDarkMode: () => void;
  setLoading: (loading: boolean) => void;
  refreshBalances: (address: string) => Promise<void>;
  updateSwapConfig: (config: Partial<BatchSwapConfig>) => void;
  getAptToken: () => Token | undefined;
  pollPendingTransactions: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isConnected: false,
  account: null,
  tokens: [],
  swapTokens: [],
  transactions: [],
  isDarkMode: false,
  isLoading: false,
  swapConfig: {
    stopOnError: false,
    delayBetweenSwaps: 2000,
    maxPriceImpact: 10
  },

  setConnected: (connected, account = null) => set({ isConnected: connected, account }),
  
  setTokens: (tokens) => {
    const swapTokens: SwapToken[] = tokens.map(token => ({
      token,
      amount: '',
      selected: false
    }));
    set({ tokens, swapTokens });
  },

  setSwapTokens: (swapTokens) => set({ swapTokens }),

  addTransaction: (transaction) => {
    const { transactions } = get();
    const filteredTransactions = transactions.filter(tx => 
      !(tx.status === 'pending' && 
        tx.tokens.input.address === transaction.tokens.input.address &&
        tx.tokens.output.address === transaction.tokens.output.address)
    );
    const newTransactions = [transaction, ...filteredTransactions];
    set({ transactions: newTransactions });

    // Start polling if transaction is pending
    if (transaction.status === 'pending' && !transaction.hash.startsWith('pending')) {
      get().pollPendingTransactions();
    }
  },

  updateTransaction: (hash, status, gasUsed) => {
    const { transactions } = get();
    const updatedTransactions = transactions.map(tx =>
      tx.hash === hash ? { ...tx, status, gasUsed } : tx
    );
    set({ transactions: updatedTransactions });
  },

  removeTransaction: (hash) => {
    const { transactions } = get();
    set({
      transactions: transactions.filter(tx => tx.hash !== hash)
    });
  },

  toggleDarkMode: () => set({ isDarkMode: !get().isDarkMode }),

  setLoading: (loading) => set({ isLoading: loading }),

  refreshBalances: async (address: string) => {
    const { WalletService } = await import('../services/walletService');
    const tokens = await WalletService.getTokenBalances(address);
    const { swapTokens } = get();
    
    const updatedSwapTokens = swapTokens.map(swapToken => {
      const updatedToken = tokens.find(t => t.address === swapToken.token.address);
      return updatedToken ? { ...swapToken, token: updatedToken } : swapToken;
    });

    set({ tokens, swapTokens: updatedSwapTokens });
  },

  updateSwapConfig: (config) => {
    const { swapConfig } = get();
    set({ swapConfig: { ...swapConfig, ...config } });
  },

  getAptToken: () => {
    const { tokens } = get();
    return tokens.find(token => token.address === APTOS_COIN_ADDRESS);
  },

  pollPendingTransactions: async () => {
    const { transactions } = get();
    const pendingTransactions = transactions.filter(tx => 
      tx.status === 'pending' && !tx.hash.startsWith('pending')
    );

    if (pendingTransactions.length === 0) return;

    // Poll each pending transaction
    for (const tx of pendingTransactions) {
      try {
        const status = await TransactionService.pollTransactionStatus(tx.hash, 3000, 60000);
        if (status !== 'pending') {
          get().updateTransaction(tx.hash, status === 'success' ? 'success' : 'failed');
        }
      } catch (error) {
        console.error('Error polling transaction:', tx.hash, error);
      }
    }

    // Continue polling if there are still pending transactions
    setTimeout(() => {
      get().pollPendingTransactions();
    }, 5000);
  }
}));
