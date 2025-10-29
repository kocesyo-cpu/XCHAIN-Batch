import { Aptos, AptosConfig, Network, AccountAddress } from '@aptos-labs/aptos';
import { Token } from '../types';
import { APTOS_COIN_ADDRESS } from './walletService';

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

const LIQUIDSWAP_MODULE = '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12';

export interface AptosWallet {
  signAndSubmitTransaction: (transaction: any) => Promise<{ hash: string }>;
}

export class DexService {
  static async getPoolReserves(tokenX: string, tokenY: string): Promise<any> {
    try {
      const resource = await aptos.getAccountResource({
        accountAddress: AccountAddress.fromString(LIQUIDSWAP_MODULE),
        resourceType: `${LIQUIDSWAP_MODULE}::liquidity_pool::LiquidityPool<${tokenX}, ${tokenY}>`
      });
      return { ...resource.data, reversed: false };
    } catch (error) {
      try {
        const resource = await aptos.getAccountResource({
          accountAddress: AccountAddress.fromString(LIQUIDSWAP_MODULE),
          resourceType: `${LIQUIDSWAP_MODULE}::liquidity_pool::LiquidityPool<${tokenY}, ${tokenX}>`
        });
        return { ...resource.data, reversed: true };
      } catch (reverseError) {
        console.error(`Pool not found for ${tokenX} <-> ${tokenY}`);
        return null;
      }
    }
  }

  static async getExpectedOutput(
    inputToken: string,
    outputToken: string,
    inputAmount: string
  ): Promise<{ outputAmount: string; priceImpact: number; reversed: boolean }> {
    try {
      const reserves = await this.getPoolReserves(inputToken, outputToken);
      if (!reserves) throw new Error('No liquidity pool found');

      let inputReserve: number, outputReserve: number;
      
      if (reserves.reversed) {
        inputReserve = parseFloat(reserves.coin_y_reserve.value);
        outputReserve = parseFloat(reserves.coin_x_reserve.value);
      } else {
        inputReserve = parseFloat(reserves.coin_x_reserve.value);
        outputReserve = parseFloat(reserves.coin_y_reserve.value);
      }

      const amountIn = parseFloat(inputAmount);

      if (inputReserve === 0 || outputReserve === 0) {
        throw new Error('Insufficient liquidity');
      }

      if (amountIn <= 0) {
        throw new Error('Invalid input amount');
      }

      const amountInWithFee = amountIn * 0.997;
      const amountOut = (amountInWithFee * outputReserve) / (inputReserve + amountInWithFee);

      if (amountOut <= 0) {
        throw new Error('Invalid output amount');
      }

      const priceBefore = outputReserve / inputReserve;
      const priceAfter = (outputReserve - amountOut) / (inputReserve + amountIn);
      const priceImpact = Math.max(0, ((priceBefore - priceAfter) / priceBefore) * 100);

      return {
        outputAmount: amountOut.toFixed(8),
        priceImpact,
        reversed: reserves.reversed
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to calculate swap');
    }
  }

  static async executeSwap(
    wallet: AptosWallet,
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    inputDecimals: number = 8,
    outputDecimals: number = 8
  ): Promise<string> {
    try {
      const poolInfo = await this.getExpectedOutput(inputToken, outputToken, inputAmount);
      
      const amountInAtomic = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputDecimals));
      const minAmountOut = Math.floor(parseFloat(poolInfo.outputAmount) * 0.98 * Math.pow(10, outputDecimals));

      let swapTokenX = inputToken;
      let swapTokenY = outputToken;
      
      if (poolInfo.reversed) {
        swapTokenX = outputToken;
        swapTokenY = inputToken;
      }

      const transaction = {
        type: 'entry_function_payload',
        function: `${LIQUIDSWAP_MODULE}::scripts_v2::swap`,
        type_arguments: [swapTokenX, swapTokenY],
        arguments: [amountInAtomic.toString(), minAmountOut.toString()],
      };

      const response = await wallet.signAndSubmitTransaction(transaction);
      return response.hash;
    } catch (error: any) {
      throw new Error(error.message || 'Transaction failed');
    }
  }

  static async canSwap(tokenA: string, tokenB: string): Promise<boolean> {
    const reserves = await this.getPoolReserves(tokenA, tokenB);
    return !!(reserves && parseFloat(reserves.coin_x_reserve.value) > 0 && parseFloat(reserves.coin_y_reserve.value) > 0);
  }
}
