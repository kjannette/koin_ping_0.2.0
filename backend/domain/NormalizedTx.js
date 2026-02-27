/**
 * NormalizedTx - Standardized transaction representation
 * 
 * Defines the minimal, normalized transaction data relevant
 * for tracking blockchain activity. 
 */

/**
 * @typedef {Object} NormalizedTx
 * @property {string} hash - Transaction hash (0x prefixed)
 * @property {string} from - Sender address (lowercase, 0x prefixed)
 * @property {string|null} to - Recipient address (lowercase, 0x prefixed, null for contract creation)
 * @property {string} value - Value transferred in Wei (as string to preserve precision)
 * @property {number} blockNumber - Block number where transaction was included
 * @property {number} blockTimestamp - Unix timestamp of the block
 */

export default {};

