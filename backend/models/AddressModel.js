import pool from '../infra/database.js';

/**
 * Create a new address
 * @param {string} user_id - Firebase user ID
 * @param {string} address - Ethereum address
 * @param {string|null} label - Optional label
 * @returns {Promise<Object>} Created address object
 */
export async function create(user_id, address, label) {
  const result = await pool.query(
    `INSERT INTO addresses (user_id, address, label)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, address, label, created_at`,
    [user_id, address, label]
  );
  return result.rows[0];
}

/**
 * List all addresses for a specific user
 * @param {string} user_id - Firebase user ID
 * @returns {Promise<Array>} Array of address objects
 */
export async function listByUser(user_id) {
  const result = await pool.query(
    `SELECT id, address, label, created_at
     FROM addresses
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [user_id]
  );
  return result.rows;
}

/**
 * List all addresses (for system use only, e.g., poller)
 * @returns {Promise<Array>} Array of address objects
 */
export async function list() {
  const result = await pool.query(
    `SELECT id, user_id, address, label, created_at
     FROM addresses
     ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Find address by ID (for specific user)
 * @param {number} id - Address ID
 * @param {string} user_id - Firebase user ID (for ownership verification)
 * @returns {Promise<Object|null>} Address object or null if not found or not owned by user
 */
export async function findById(id, user_id = null) {
  const query = user_id
    ? `SELECT id, user_id, address, label, created_at
       FROM addresses
       WHERE id = $1 AND user_id = $2`
    : `SELECT id, user_id, address, label, created_at
       FROM addresses
       WHERE id = $1`;
  
  const params = user_id ? [id, user_id] : [id];
  
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

/**
 * Remove address by ID (for specific user)
 * @param {number} id - Address ID
 * @param {string} user_id - Firebase user ID (for ownership verification)
 * @returns {Promise<boolean>} True if deleted, false if not found or not owned by user
 */
export async function remove(id, user_id) {
  const result = await pool.query(
    `DELETE FROM addresses 
     WHERE id = $1 AND user_id = $2`,
    [id, user_id]
  );
  return result.rowCount > 0;
}

