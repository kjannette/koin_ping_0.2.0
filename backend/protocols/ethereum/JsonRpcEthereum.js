
import { assertEthereumObserver } from './EthereumObserver.js';

/**
 * @typedef {import('../../domain/NormalizedTx.js').NormalizedTx} NormalizedTx
 */

const RPC_TIMEOUT_MS = 30000; // 30 seconds

/**
 * JsonRpcEthereum - Concrete implementation of EthereumObserver using JSON-RPC
 * @implements {EthereumObserver}
 */
export class JsonRpcEthereum {
  /**
   * @param {string} rpcUrl - Ethereum JSON-RPC endpoint URL
   */
  constructor(rpcUrl) {
    if (!rpcUrl || typeof rpcUrl !== 'string') {
      throw new Error('JsonRpcEthereum requires a valid RPC URL');
    }
    this.rpcUrl = rpcUrl;
  }
  /**
   * Make a JSON-RPC call to the Ethereum node
   * @private
   * @param {string} method - RPC method name (e.g., 'eth_blockNumber')
   * @param {any[]} params - Method parameters
   * @returns {Promise<any>} RPC result
   * @throws {Error} If RPC call fails or returns an error
   */
  async _callRpc(method, params = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(), 
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} for ${method}`
        );
      }

      const payload = await response.json();

      if (payload.error) {
        throw new Error(
          `RPC Error [${method}]: ${payload.error.message} (code: ${payload.error.code})`
        );
      }

      return payload.result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`RPC timeout after ${RPC_TIMEOUT_MS}ms for ${method}`);
      }

      throw new Error(`RPC call failed [${method}]: ${error.message}`);
    }
  }

  /**
   * Get the latest block number on the chain
   * @returns {Promise<number>} Current block number
   */
  async getLatestBlockNumber() {
    const hexBlock = await this._callRpc('eth_blockNumber');
    return parseInt(hexBlock, 16);
  }

  /**
   * Get all transactions in a specific block
   * @param {number} blockNumber - Block number to fetch
   * @returns {Promise<NormalizedTx[]>} Array of normalized transactions
   */
  async getBlockTransactions(blockNumber) {
    const hexBlockNumber = '0x' + blockNumber.toString(16);

    const block = await this._callRpc('eth_getBlockByNumber', [
      hexBlockNumber,
      true, // true = return full transaction objects, not just hashes
    ]);

    if (!block || !block.transactions) {
      return [];
    }

    const blockTimestamp = parseInt(block.timestamp, 16);

    return block.transactions.map((tx) => ({
      hash: tx.hash,
      from: tx.from?.toLowerCase() || '',
      to: tx.to?.toLowerCase() || null, // null for contract creation
      value: this._hexToDecimalString(tx.value), 
      blockNumber: parseInt(tx.blockNumber, 16),
      blockTimestamp: blockTimestamp,
    }));
  }

  /**
   * Get the current balance of an address
   * @param {string} address - Ethereum address
   * @returns {Promise<string>} Balance in Wei as decimal string
   */
  async getBalance(address) {
    const balanceHex = await this._callRpc('eth_getBalance', [
      address,
      'latest',
    ]);

    return this._hexToDecimalString(balanceHex);
  }

  /**
   * Convert hex string to decimal string (for large numbers)
   * @private
   * @param {string} hexValue - Hex value (with or without 0x prefix)
   * @returns {string} 
   */
  _hexToDecimalString(hexValue) {
    if (!hexValue || hexValue === '0x' || hexValue === '0x0') {
      return '0';
    }
    
    try {
      return BigInt(hexValue).toString();
    } catch (error) {
      throw new Error(`Invalid hex value: ${hexValue}`);
    }
  }
}

/**
 * @param {string} rpcUrl - Ethereum JSON-RPC endpoint URL
 * @returns {JsonRpcEthereum}
 */
export function createJsonRpcEthereum(rpcUrl) {
  const instance = new JsonRpcEthereum(rpcUrl);
  
  // Validate that it implements the interface
  assertEthereumObserver(instance, 'JsonRpcEthereum');
  
  return instance;
}
