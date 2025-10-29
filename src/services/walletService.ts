import { Aptos, AptosConfig, Network, AccountAddress } from 'aptos';
import { Token } from '../types';

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

export const APTOS_COIN_ADDRESS = '0x1::aptos_coin::AptosCoin';

export class WalletService {
  static async getTokenBalances(address: string): Promise<Token[]> {
    try {
      const resources = await aptos.getAccountResources({ 
        accountAddress: AccountAddress.fromString(address) 
      });
      
      const tokens: Token[] = [];
      const coinStores = resources.filter(resource => 
        resource.type.includes('::coin::CoinStore')
      );

      for (const store of coinStores) {
        const coinType = store.type.split('<')[1]?.split('>')[0];
        if (!coinType) continue;

        const balance = (store.data as any).coin.value;
        if (parseFloat(balance) === 0) continue;

        try {
          const metadata = await this.getTokenMetadata(coinType);
          if (metadata) {
            tokens.push({
              ...metadata,
              address: coinType,
              balance
            });
          }
        } catch (error) {
          console.warn('Failed to get metadata for:', coinType);
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      throw error;
    }
  }

  static async getTokenMetadata(address: string): Promise<Token | null> {
    try {
      const [_, account] = address.split('::');
      if (!account) return null;

      const resource = await aptos.getAccountResource({
        accountAddress: AccountAddress.fromString(account),
        resourceType: `0x1::coin::CoinInfo<${address}>`
      });

      const data = resource.data as any;
      return {
        address,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        balance: '0'
      };
    } catch (error) {
      const symbol = address.split('::').pop() || 'UNKNOWN';
      return {
        address,
        symbol: symbol.substring(0, 8),
        name: symbol,
        decimals: 8,
        balance: '0'
      };
    }
  }

  static async addTokenByAddress(address: string): Promise<Token> {
    const metadata = await this.getTokenMetadata(address);
    if (!metadata) {
      throw new Error('Invalid token address or token not found');
    }
    return { ...metadata, balance: '0' };
  }

  static isAptToken(token: Token): boolean {
    return token.address === APTOS_COIN_ADDRESS;
  }
}
