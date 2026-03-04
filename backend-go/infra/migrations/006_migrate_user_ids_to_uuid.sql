-- Migration 006: Migrate user_id columns from Firebase UID strings to user UUIDs
--
-- Prerequisites: migration 005 (users table) must be applied first.
-- This migration backfills the users table from existing data, then swaps the
-- VARCHAR user_id columns for UUID foreign keys referencing users(id).

BEGIN;

-- 1. Backfill users table from existing Firebase UIDs in addresses
INSERT INTO users (firebase_uid, email)
  SELECT DISTINCT user_id, ''
  FROM addresses
  WHERE user_id IS NOT NULL
ON CONFLICT (firebase_uid) DO NOTHING;

-- 2. Backfill from notification configs (catches users with configs but no addresses)
INSERT INTO users (firebase_uid, email)
  SELECT DISTINCT user_id, ''
  FROM user_notification_configs
  WHERE user_id IS NOT NULL
ON CONFLICT (firebase_uid) DO NOTHING;

-- ============================================================
-- 3. Migrate addresses.user_id from VARCHAR to UUID
-- ============================================================

ALTER TABLE addresses ADD COLUMN user_uuid UUID;

UPDATE addresses a
SET user_uuid = u.id
FROM users u
WHERE u.firebase_uid = a.user_id;

-- Drop old constraints and column
ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_address_key;
DROP INDEX IF EXISTS idx_addresses_user_id;
ALTER TABLE addresses DROP COLUMN user_id;

-- Rename and constrain
ALTER TABLE addresses RENAME COLUMN user_uuid TO user_id;
ALTER TABLE addresses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE addresses ADD CONSTRAINT fk_addresses_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE addresses ADD CONSTRAINT addresses_user_id_address_key
  UNIQUE (user_id, address);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- ============================================================
-- 4. Migrate user_notification_configs.user_id from VARCHAR to UUID
-- ============================================================

-- Drop the PK first (it's on user_id)
ALTER TABLE user_notification_configs DROP CONSTRAINT IF EXISTS user_notification_configs_pkey;
DROP INDEX IF EXISTS idx_notification_configs_enabled;

ALTER TABLE user_notification_configs ADD COLUMN user_uuid UUID;

UPDATE user_notification_configs nc
SET user_uuid = u.id
FROM users u
WHERE u.firebase_uid = nc.user_id;

ALTER TABLE user_notification_configs DROP COLUMN user_id;
ALTER TABLE user_notification_configs RENAME COLUMN user_uuid TO user_id;
ALTER TABLE user_notification_configs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE user_notification_configs ADD CONSTRAINT user_notification_configs_pkey
  PRIMARY KEY (user_id);
ALTER TABLE user_notification_configs ADD CONSTRAINT fk_notification_configs_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_notification_configs_enabled
  ON user_notification_configs(notification_enabled);

COMMIT;
