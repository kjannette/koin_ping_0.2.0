import pool from '../infra/database.js';

/**
 * List recent alert events for a specific user
 * @param {string} user_id - Firebase user ID
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Array>} Array of alert event objects
 */
export async function listRecentByUser(user_id, limit = 20) {
  const result = await pool.query(
    `SELECT ae.id, ae.alert_rule_id, ae.message, ae.address_label, ae.tx_hash, ae.timestamp
     FROM alert_events ae
     JOIN alert_rules ar ON ar.id = ae.alert_rule_id
     JOIN addresses a ON a.id = ar.address_id
     WHERE a.user_id = $1
     ORDER BY ae.timestamp DESC
     LIMIT $2`,
    [user_id, limit]
  );
  return result.rows;
}

/**
 * List recent alert events
 * @param {number} limit - Maximum number of event
 * @returns {Promise<Array>} Array of alert event objects
 */
export async function listRecent(limit = 20) {
  const result = await pool.query(
    `SELECT id, alert_rule_id, message, address_label, tx_hash, timestamp
     FROM alert_events
     ORDER BY timestamp DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Create a new alert event
 * @param {number} alertRuleId - Alert rule ID
 * @param {string} message - Alert message
 * @param {string|null} addressLabel - Address label (denormalized)
 * @param {string|null} txHash - Transaction hash (optional, null for non-tx alerts)
 * @returns {Promise<Object>} Created alert event object
 */
export async function create(alertRuleId, message, addressLabel, txHash = null) {
  const result = await pool.query(
    `INSERT INTO alert_events (alert_rule_id, message, address_label, tx_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, alert_rule_id, message, address_label, tx_hash, timestamp`,
    [alertRuleId, message, addressLabel, txHash]
  );
  return result.rows[0];
}

