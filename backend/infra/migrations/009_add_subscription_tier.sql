ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';

-- Existing active/trialing subscribers were on the single paid plan,
-- which is now the "premium" tier. Backfill them so they aren't downgraded.
UPDATE users
SET subscription_tier = 'premium'
WHERE subscription_status IN ('active', 'trialing')
  AND stripe_subscription_id IS NOT NULL;
