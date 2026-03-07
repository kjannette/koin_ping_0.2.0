
DROP TABLE IF EXISTS alert_events CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS address_checkpoints CASCADE;
DROP TABLE IF EXISTS user_notification_configs CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'none',
  subscription_created_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,        -- Ethereum address format (0x + 40 hex chars)
  label VARCHAR(255),                  -- Optional human-readable label
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, address)
);


CREATE TABLE alert_rules (
  id SERIAL PRIMARY KEY,
  address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,           -- 'incoming_tx', 'outgoing_tx', 'large_transfer', 'balance_below'
  threshold DECIMAL(20, 6),            -- ETH amount threshold (nullable for tx types that don't need it)
  minimum DECIMAL(20, 6),              -- Optional min amount filter for incoming/outgoing alerts
  maximum DECIMAL(20, 6),              -- Optional max amount filter for incoming/outgoing alerts
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_alert_type CHECK (
    type IN ('incoming_tx', 'outgoing_tx', 'large_transfer', 'balance_below')
  ),

  CONSTRAINT positive_threshold CHECK (
    threshold IS NULL OR threshold > 0
  ),

  CONSTRAINT non_negative_minimum CHECK (minimum IS NULL OR minimum >= 0),
  CONSTRAINT non_negative_maximum CHECK (maximum IS NULL OR maximum >= 0),
  CONSTRAINT min_lte_max CHECK (minimum IS NULL OR maximum IS NULL OR minimum <= maximum)
);


CREATE TABLE alert_events (
  id SERIAL PRIMARY KEY,
  alert_rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  message TEXT NOT NULL,               -- Human-readable alert message
  address_label VARCHAR(255),          -- Denormalized for display (avoids joins)
  tx_hash VARCHAR(66),                 -- Transaction hash that triggered alert (nullable for balance_below)
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE address_checkpoints (
  address_id INTEGER PRIMARY KEY REFERENCES addresses(id) ON DELETE CASCADE,
  last_checked_block INTEGER NOT NULL, -- Last block number that was checked for this address
  last_checked_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_notification_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discord_webhook_url TEXT,            -- Discord webhook URL (nullable)
  telegram_chat_id VARCHAR(128),       -- Telegram chat ID (nullable)
  telegram_bot_token VARCHAR(255),     -- Telegram bot token (nullable)
  email VARCHAR(255),                  -- Email for notifications (nullable)
  slack_webhook_url TEXT,              -- Slack incoming webhook URL (nullable)
  notification_enabled BOOLEAN DEFAULT TRUE,  -- Master on/off switch
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_alert_rules_address_id ON alert_rules(address_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_events_timestamp ON alert_events(timestamp DESC);
CREATE INDEX idx_alert_events_alert_rule_id ON alert_events(alert_rule_id);
CREATE INDEX idx_address_checkpoints_last_checked_at ON address_checkpoints(last_checked_at);
CREATE INDEX idx_notification_configs_enabled ON user_notification_configs(notification_enabled);
