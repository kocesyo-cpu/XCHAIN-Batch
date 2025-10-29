export const formatAmount = (amount: string, decimals: number): string => {
  try {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return '0';
  }
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

export const parseAmountToAtomic = (amount: string, decimals: number): string => {
  try {
    return Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();
  } catch {
    return '0';
  }
};
