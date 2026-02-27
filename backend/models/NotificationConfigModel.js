import pool from '../infra/database.js';

/**
 * Get notification config for a user
 * @param {string} user_id - Firebase user ID
 * @returns {Promise<Object|null>} Notification config or null if not set
 */
export async function getConfig(user_id) {
  const result = await pool.query(
    `SELECT user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token, 
            email, notification_enabled, created_at, updated_at
     FROM user_notification_configs
     WHERE user_id = $1`,
    [user_id]
  );
  
  return result.rows[0] || null;
}

/**
 * Create or update notification config for a user
 * @param {string} user_id - Firebase user ID
 * @param {Object} config - Notification configuration
 * @param {string} [config.discord_webhook_url] - Discord webhook URL
 * @param {string} [config.telegram_chat_id] - Telegram chat ID
 * @param {string} [config.email] - Email address
 * @param {boolean} [config.notification_enabled] - Enable/disable notifications
 * @returns {Promise<Object>} Updated config
 */
export async function upsertConfig(user_id, config) {
  const {
    discord_webhook_url,
    telegram_chat_id,
    telegram_bot_token,
    email,
    notification_enabled = true
  } = config;

  const result = await pool.query(
    `INSERT INTO user_notification_configs 
      (user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token, email, notification_enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       discord_webhook_url = COALESCE($2, user_notification_configs.discord_webhook_url),
       telegram_chat_id = COALESCE($3, user_notification_configs.telegram_chat_id),
       telegram_bot_token = COALESCE($4, user_notification_configs.telegram_bot_token),
       email = COALESCE($5, user_notification_configs.email),
       notification_enabled = $6,
       updated_at = NOW()
     RETURNING user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token, 
               email, notification_enabled, created_at, updated_at`,
    [user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token, email, notification_enabled]
  );
  
  return result.rows[0];
}

/**
 * Delete notification config for a user
 * @param {string} user_id - Firebase user ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function remove(user_id) {
  const result = await pool.query(
    `DELETE FROM user_notification_configs WHERE user_id = $1`,
    [user_id]
  );
  
  return result.rowCount > 0;
}

/**
 * Get all users with notifications enabled (for system use)
 * @returns {Promise<Array>} Array of user configs
 */
export async function listEnabled() {
  const result = await pool.query(
    `SELECT user_id, discord_webhook_url, telegram_chat_id, email
     FROM user_notification_configs
     WHERE notification_enabled = TRUE`
  );
  
  return result.rows;
}

