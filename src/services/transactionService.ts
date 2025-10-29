import { Aptos, AptosConfig, Network } from '@aptos-labs/aptos';

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

export class TransactionService {
  static async waitForTransaction(hash: string): Promise<void> {
    await aptos.waitForTransaction({ transactionHash: hash });
  }

  static async getTransactionStatus(hash: string): Promise<'success' | 'failed'> {
    const tx = await aptos.getTransactionByHash({ transactionHash: hash });
    return tx.success ? 'success' : 'failed';
  }

  static getExplorerUrl(hash: string): string {
    return `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`;
  }
}
