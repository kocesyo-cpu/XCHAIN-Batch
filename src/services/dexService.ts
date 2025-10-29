import { Aptos, AptosConfig, Network, AccountAddress } from '@aptos-labs/aptos';
import { PoolReserve } from '../types';

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

const LIQUIDSWAP_MODULE = '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12';

export class DexService {
  static async getPoolReserves(tokenX: string, tokenY: string): Promise<PoolReserve | null> {
    try {
      const resource = await aptos.getAccountResource({
        accountAddress: AccountAddress.fromString(LIQUIDSWAP_MODULE),
        resourceType: `${LIQUIDSWAP_MODULE}::liquidity_pool::LiquidityPool<${tokenX}, ${tokenY}>`
      });

      const data = resource.data as any;
      return {
        coin_x: tokenX,
        coin_y: tokenY,
        reserve_x: data.coin_x_reserve.value,
        reserve_y: data.coin_y_reserve.value
      };
    } catch (error) {
      return null;
    }
  }

  static async getExpectedOutput(
    inputToken: string,
    outputToken: string,
    inputAmount: string
  ): Promise<{ outputAmount: string; priceImpact: number } | null> {
    try {
      const reserves = await this.getPoolReserves(inputToken, outputToken);
      if (!reserves) return null;

      const inputReserve = parseFloat(reserves.reserve_x);
      const outputReserve = parseFloat(reserves.reserve_y);
      const amountIn = parseFloat(inputAmount);

      if (inputReserve === 0 || outputReserve === 0) return null;

      const amountInWithFee = amountIn * 0.997;
      const amountOut = (amountInWithFee * outputReserve) / (inputReserve + amountInWithFee);

      const priceBefore = outputReserve / inputReserve;
      const priceAfter = (outputReserve - amountOut) / (inputReserve + amountIn);
      const priceImpact = Math.abs((priceBefore - priceAfter) / priceBefore) * 100;

      return {
        outputAmount: amountOut.toFixed(8),
        priceImpact
      };
    } catch (error) {
      console.error('Error calculating output:', error);
      return null;
    }
  }

  static async executeSwap(
    wallet: any,
    inputToken: string,
    outputToken: string,
    inputAmount: string
  ): Promise<string> {
    try {
      const transaction = {
        type: 'entry_function_payload',
        function: `${LIQUIDSWAP_MODULE}::scripts_v2::swap`,
        type_arguments: [inputToken, outputToken],
        arguments: [inputAmount, '1'],
      };

      const response = await wallet.signAndSubmitTransaction(transaction);
      return response.hash;
    } catch (error: any) {
      throw new Error(error.message || 'Swap failed');
    }
  }
}
