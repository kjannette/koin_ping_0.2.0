import pool from '../infra/database.js';


/**
 * Get the last checked block number for an address
 * @param {number} addressId - Address ID from the addresses table
 * @returns {Promise<number|null>} Last checked block number, or null if never checked
 */
export async function getLastCheckedBlock(addressId) {
  const result = await pool.query(
    `SELECT last_checked_block
     FROM address_checkpoints
     WHERE address_id = $1`,
    [addressId]
  );
  
  return result.rows[0]?.last_checked_block || null;
}

/**
 * Update the last checked block number for an address
 * Creates a new checkpoint record if one doesn't exist
 * @param {number} addressId - Address ID from the addresses table
 * @param {number} blockNumber - Block number that was just checked
 * @returns {Promise<Object>} Updated checkpoint record
 */
export async function updateLastCheckedBlock(addressId, blockNumber) {
  const result = await pool.query(
    `INSERT INTO address_checkpoints (address_id, last_checked_block, last_checked_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (address_id)
     DO UPDATE SET
       last_checked_block = $2,
       last_checked_at = NOW()
     RETURNING address_id, last_checked_block, last_checked_at`,
    [addressId, blockNumber]
  );
  
  return result.rows[0];
}

/**
 * Get all address checkpoints (useful for debugging/monitoring)
 * @returns {Promise<Array>} Array of checkpoint objects
 */
export async function listAll() {
  const result = await pool.query(
    `SELECT 
       ac.address_id,
       a.address,
       a.label,
       ac.last_checked_block,
       ac.last_checked_at
     FROM address_checkpoints ac
     JOIN addresses a ON a.id = ac.address_id
     ORDER BY ac.last_checked_at DESC`
  );
  
  return result.rows;
}

/**
 * Delete checkpoint for an address (useful when address is removed)
 * Note: This should happen automatically via CASCADE when address is deleted
 * @param {number} addressId - Address ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function remove(addressId) {
  const result = await pool.query(
    `DELETE FROM address_checkpoints WHERE address_id = $1`,
    [addressId]
  );
  
  return result.rowCount > 0;
}

