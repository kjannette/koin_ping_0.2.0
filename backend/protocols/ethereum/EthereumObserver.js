
/**
 * @typedef {import('../../domain/NormalizedTx.js').NormalizedTx} NormalizedTx
 */

/**
 * @typedef {Object} EthereumObserver
 * @property {() => Promise<number>} getLatestBlockNumber - Get the most recent block number on the chain
 * @property {(blockNumber: number) => Promise<NormalizedTx[]>} getBlockTransactions - Get all transactions in a specific block
 * @property {(address: string) => Promise<string>} getBalance - Get the current balance of an address (in Wei as string)
 */

/**
 * Validates that an object implements the EthereumObserver interface
 * @param {any} obj - Object to validate
 * @returns {boolean} True if object implements the interface
 */
export function isEthereumObserver(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return (
    typeof obj.getLatestBlockNumber === 'function' &&
    typeof obj.getBlockTransactions === 'function' &&
    typeof obj.getBalance === 'function'
  );
}

/**
 * Asserts that an object implements the EthereumObserver interface
 * Throws an error if validation fails
 * @param {any} obj - Object to validate
 * @param {string} [name='object'] - Name for error messages
 * @throws {Error} If object doesn't implement the interface
 */
export function assertEthereumObserver(obj, name = 'object') {
  if (!isEthereumObserver(obj)) {
    throw new Error(
      `${name} must implement EthereumObserver interface ` +
      `(getLatestBlockNumber, getBlockTransactions, getBalance)`
    );
  }
}

/**
 * Example usage 
 * 
 * import { assertEthereumObserver } from './protocols/ethereum/EthereumObserver.js';
 * 
 * export function createObserverService(ethereumObserver) {
 *   assertEthereumObserver(ethereumObserver, 'ethereumObserver');
 *   // ... use ethereumObserver safely
 * }
 */

export default {
  isEthereumObserver,
  assertEthereumObserver,
};

