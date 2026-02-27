ALTER TABLE user_notification_configs
  DROP COLUMN IF EXISTS telegram_chat_id,
  DROP COLUMN IF EXISTS telegram_bot_token,
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
