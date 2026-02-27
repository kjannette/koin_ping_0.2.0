import pool from '../infra/database.js';

/**
 * Create new alertrule
 * @param {number} addressId - Address ID
 * @param {string} type - Alert type
 * @param {string|null} threshold - Threshold value (nullable)
 * @returns {Promise<Object>} Created alert rule object
 */
export async function create(addressId, type, threshold) {
  const result = await pool.query(
    `INSERT INTO alert_rules (address_id, type, threshold, enabled)
     VALUES ($1, $2, $3, TRUE)
     RETURNING id, address_id, type, threshold, enabled, created_at`,
    [addressId, type, threshold]
  );
  return result.rows[0];
}

/**
 * List alert rules by address ID
 * @param {number} addressId - Address ID
 * @returns {Promise<Array>} Array of alert rule objects
 */
export async function listByAddress(addressId) {
  const result = await pool.query(
    `SELECT id, address_id, type, threshold, enabled, created_at
     FROM alert_rules
     WHERE address_id = $1
     ORDER BY created_at DESC`,
    [addressId]
  );
  return result.rows;
}

/**
 * Find alert rule by ID
 * @param {number} id - Alert rule ID
 * @param {string} user_id - Optional user ID for ownership verification
 * @returns {Promise<Object|null>} Alert rule object or null if not found/not owned
 */
export async function findById(id, user_id = null) {
  let query, params;
  
  if (user_id) {
    // Verify ownership 
    query = `SELECT ar.id, ar.address_id, ar.type, ar.threshold, ar.enabled, ar.created_at
             FROM alert_rules ar
             JOIN addresses a ON a.id = ar.address_id
             WHERE ar.id = $1 AND a.user_id = $2`;
    params = [id, user_id];
  } else {
    query = `SELECT id, address_id, type, threshold, enabled, created_at
             FROM alert_rules
             WHERE id = $1`;
    params = [id];
  }
  
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

/**
 * Update alert rule enabled status
 * @param {number} id - Alert rule ID
 * @param {boolean} enabled - Enabled status
 * @returns {Promise<Object|null>} Updated alert rule or null if not found
 */
export async function updateEnabled(id, enabled) {
  const result = await pool.query(
    `UPDATE alert_rules
     SET enabled = $2
     WHERE id = $1
     RETURNING id, address_id, type, threshold, enabled, created_at`,
    [id, enabled]
  );
  return result.rows[0] || null;
}

/**
 * Remove alert rule by ID
 * @param {number} id - Alert rule ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function remove(id) {
  const result = await pool.query(
    `DELETE FROM alert_rules WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

