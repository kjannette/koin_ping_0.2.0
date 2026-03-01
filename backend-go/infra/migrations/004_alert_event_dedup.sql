CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_events_dedup
    ON alert_events (alert_rule_id, tx_hash)
    WHERE tx_hash IS NOT NULL;
