
/**
 * @typedef {import('./NormalizedTx.js').NormalizedTx} NormalizedTx
 */

/**
 * @typedef {Object} ObservedTxMetadata
 * @property {number} addressId - ID of the tracked address (from addresses table)
 * @property {'incoming'|'outgoing'} direction - Direction relative to tracked address
 */

/**
 * @typedef {NormalizedTx & ObservedTxMetadata} ObservedTx
 */

export default {};

