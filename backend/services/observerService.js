
import { assertEthereumObserver } from '../protocols/ethereum/EthereumObserver.js';
import * as AddressModel from '../models/AddressModel.js';
import * as CheckpointModel from '../models/AddressCheckpointModel.js';

/**
 * @typedef {import('../domain/NormalizedTx.js').NormalizedTx} NormalizedTx
 * @typedef {import('../domain/ObservedTx.js').ObservedTx} ObservedTx
 * @typedef {import('../protocols/ethereum/EthereumObserver.js').EthereumObserver} EthereumObserver
 */

// Safety limit: maximum blocks to process per address per run
// Prevents overwhelming RPC endpoints and ensures bounded execution time
const MAX_BLOCKS_PER_RUN = 100;


export class ObserverService {
  /**
   * @param {EthereumObserver} ethObserver - Implementation of EthereumObserver interface
   */
  constructor(ethObserver) {
    assertEthereumObserver(ethObserver, 'ethObserver');
    this.eth = ethObserver;
  }

  /**
   * Run one observation cycle across all tracked addresses
   * 
   * 
   * @returns {Promise<ObservedTx[]>} All observations from this cycle
   */
  async runOnce() {
    const addresses = await AddressModel.list();
    
    if (addresses.length === 0) {
      return [];
    }

    const latestBlock = await this.eth.getLatestBlockNumber();
    const observations = [];

    for (const address of addresses) {
      try {
        const addressObservations = await this._observeAddress(address, latestBlock);
        observations.push(...addressObservations);
      } catch (error) {
        console.error(`Error observing address ${address.address}:`, error);

      }
    }

    return observations;
  }

  /**
   * Observe a single address for activity
   * @private
   * @param {Object} address - Address record from database
   * @param {number} latestBlock - Current latest block number
   * @returns {Promise<ObservedTx[]>} Observations for this address
   */
  async _observeAddress(address, latestBlock) {
    const lastChecked = await CheckpointModel.getLastCheckedBlock(address.id);
    
    const startBlock = this._getStartBlock(lastChecked, latestBlock);
    const endBlock = this._getEndBlock(startBlock, latestBlock);

    // No new blocks to check
    if (startBlock > endBlock) {
      return [];
    }

    const observations = [];

    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      const blockTxs = await this.eth.getBlockTransactions(blockNumber);
      const relevantTxs = this._filterRelevantTransactions(blockTxs, address.address);

      for (const tx of relevantTxs) {
        observations.push(this._createObservedTx(tx, address));
      }
    }

    await CheckpointModel.updateLastCheckedBlock(address.id, endBlock);

    return observations;
  }

  /**
   * Determine starting block for observation
   * @private
   * @param {number|null} lastChecked - Last checked block, or null if never checked
   * @param {number} latestBlock - Current latest block
   * @returns {number} Block number to start from
   */
  _getStartBlock(lastChecked, latestBlock) {
    if (lastChecked === null) {
      return latestBlock;
    }
    return lastChecked + 1;
  }

  /**
   * Determine ending block for observation (respects MAX_BLOCKS_PER_RUN)
   * @private
   * @param {number} startBlock 
   * @param {number} latestBlock 
   * @returns {number} 
   */
  _getEndBlock(startBlock, latestBlock) {
    return Math.min(startBlock + MAX_BLOCKS_PER_RUN - 1, latestBlock);
  }

  /**
   * Filter transactions to only those involving the tracked address
   * @private
   * @param {NormalizedTx[]} transactions 
   * @param {string} trackedAddress 
   * @returns {NormalizedTx[]} 
   */
  _filterRelevantTransactions(transactions, trackedAddress) {
    const addressLower = trackedAddress.toLowerCase();
    
    return transactions.filter((tx) => {
      const fromMatch = tx.from?.toLowerCase() === addressLower;
      const toMatch = tx.to?.toLowerCase() === addressLower;
      return fromMatch || toMatch;
    });
  }

  /**
   * Create an ObservedTx with direction metadata
   * @private
   * @param {NormalizedTx} tx - Normalized transaction
   * @param {Object} address - Address record from database
   * @returns {ObservedTx} Transaction with observation metadata
   */
  _createObservedTx(tx, address) {
    const addressLower = address.address.toLowerCase();
    const direction = tx.to?.toLowerCase() === addressLower ? 'incoming' : 'outgoing';

    return {
      ...tx,
      addressId: address.id,
      direction,
    };
  }
}

/**
 * Factory  to create an ObserverService instance
 * @param {EthereumObserver} ethObserver - Implementation of EthereumObserver interface
 * @returns {ObserverService}
 */
export function createObserverService(ethObserver) {
  return new ObserverService(ethObserver);
}

