import * as NotificationConfigModel from '../models/NotificationConfigModel.js';

/**
 * Get notification config for the authenticated user
 */
export async function getConfig(req, res) {
  const user_id = req.user_id; // From authenticate middleware
  
  console.log(`User ${user_id} getting notification config`);
  
  const config = await NotificationConfigModel.getConfig(user_id);
  
  if (!config) {
    // Return empty config if not set
    return res.json({
      user_id,
      discord_webhook_url: null,
      telegram_chat_id: null,
      email: null,
      notification_enabled: true
    });
  }
  
  console.log(`Config found`);
  return res.json(config);
}

/**
 * Update notification config for the authenticated user
 */
export async function updateConfig(req, res) {
  const user_id = req.user_id; // From authenticate middleware
  const { discord_webhook_url, telegram_chat_id, email, notification_enabled } = req.body;
  
  console.log(`User ${user_id} updating notification config`);
  
  // Validation: at least one field should be provided
  if (
    discord_webhook_url === undefined &&
    telegram_chat_id === undefined &&
    email === undefined &&
    notification_enabled === undefined
  ) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'At least one configuration field must be provided'
    });
  }
  
  // Validation: Discord webhook URL format (basic check)
  if (discord_webhook_url && !discord_webhook_url.startsWith('https://discord.com/api/webhooks/')) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid Discord webhook URL format'
    });
  }
  
  // Validation: Email format (basic check)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid email address format'
    });
  }
  
  try {
    const updatedConfig = await NotificationConfigModel.upsertConfig(user_id, {
      discord_webhook_url,
      telegram_chat_id,
      email,
      notification_enabled
    });
    
    console.log(`Notification config updated`);
    return res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating notification config:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update notification configuration'
    });
  }
}

/**
 * Delete notification config for the authenticated user
 */
export async function deleteConfig(req, res) {
  const user_id = req.user_id; // From authenticate middleware
  
  console.log(`User ${user_id} deleting notification config`);
  
  const deleted = await NotificationConfigModel.remove(user_id);
  
  if (!deleted) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'No notification configuration found'
    });
  }
  
  console.log(`Notification config deleted`);
  return res.status(204).send();
}

