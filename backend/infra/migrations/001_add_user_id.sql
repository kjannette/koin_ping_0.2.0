
ALTER TABLE addresses 
ADD COLUMN user_id VARCHAR(128);

UPDATE addresses 
SET user_id = 'legacy_user' 
WHERE user_id IS NULL;

ALTER TABLE addresses 
ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_address_key;

ALTER TABLE addresses ADD CONSTRAINT addresses_user_address_unique UNIQUE (user_id, address);
