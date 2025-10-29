import { Aptos, AptosConfig, Network } from 'aptos';

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

export class TransactionService {
  static async waitForTransaction(
    hash: string, 
    timeoutMs: number = 30000,
    maxRetries: number = 3
  ): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await aptos.waitForTransaction({ 
          transactionHash: hash,
          options: {
            timeoutSecs: timeoutMs / 1000
          }
        });
        return;
      } catch (error: any) {
        retries++;
        
        if (retries >= maxRetries) {
          throw new Error(`Transaction timeout after ${maxRetries} retries: ${error.message}`);
        }
        
        const backoffMs = Math.pow(2, retries) * 1000;
        console.log(`Retry ${retries}/${maxRetries} for tx ${hash.slice(0, 8)}... after ${backoffMs}ms`);
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  static async getTransactionStatus(hash: string): Promise<'success' | 'failed'> {
    try {
      const tx = await aptos.getTransactionByHash({ transactionHash: hash });
      return tx.success ? 'success' : 'failed';
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return 'failed';
    }
  }

  static getExplorerUrl(hash: string): string {
    return `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`;
  }

  static async pollTransactionStatus(
    hash: string, 
    intervalMs: number = 2000,
    timeoutMs: number = 60000
  ): Promise<'success' | 'failed' | 'timeout'> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkStatus = async () => {
        try {
          const status = await this.getTransactionStatus(hash);
          
          if (status !== 'pending') {
            resolve(status);
            return;
          }
          
          if (Date.now() - startTime > timeoutMs) {
            resolve('timeout');
            return;
          }
          
          setTimeout(checkStatus, intervalMs);
        } catch (error) {
          if (Date.now() - startTime > timeoutMs) {
            resolve('timeout');
            return;
          }
          setTimeout(checkStatus, intervalMs);
        }
      };
      
      checkStatus();
    });
  }
}
