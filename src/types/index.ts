export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  logo?: string;
}

export interface SwapToken {
  token: Token;
  amount: string;
  selected: boolean;
  expectedOutput?: string;
  priceImpact?: number;
  loading?: boolean;
}

export interface Transaction {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  tokens: {
    input: { symbol: string; amount: string; address: string; decimals: number };
    output: { symbol: string; amount: string; address: string; decimals: number };
  };
  gasUsed?: string;
}

export interface BatchSwapConfig {
  stopOnError: boolean;
  delayBetweenSwaps: number;
  maxPriceImpact: number;
}
