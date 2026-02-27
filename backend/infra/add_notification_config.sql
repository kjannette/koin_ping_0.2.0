
-- Run: psql -d koin_ping_dev -f add_notification_config.sql

-- Create user notification configuration tableStores notification preferences and webhook URLs for each user
CREATE TABLE user_notification_configs (
  user_id VARCHAR(128) PRIMARY KEY,
  discord_webhook_url TEXT,            -- Discord webhook URL (nullable)
  telegram_chat_id VARCHAR(128),       -- Telegram chat ID (nullable)
  telegram_bot_token VARCHAR(255),     -- Telegram bot token (nullable, future use)
  email VARCHAR(255),                  -- Email for notifications (nullable)
  notification_enabled BOOLEAN DEFAULT TRUE,  -- Master on/off switch
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for active notifications lookup
CREATE INDEX idx_notification_configs_enabled ON user_notification_configs(notification_enabled);

-- Note: No foreign key to a users table (doesn't exist yet)
-- user_id is the Firebase UID, validated by backend middleware

