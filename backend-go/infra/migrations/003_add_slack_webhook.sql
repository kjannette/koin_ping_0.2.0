ALTER TABLE user_notification_configs
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
