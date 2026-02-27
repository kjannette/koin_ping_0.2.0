
CREATE TABLE user_notification_configs (
  user_id VARCHAR(128) PRIMARY KEY,
  discord_webhook_url TEXT,
  telegram_chat_id VARCHAR(128),
  telegram_bot_token VARCHAR(255),
  email VARCHAR(255),
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_configs_enabled ON user_notification_configs(notification_enabled);
