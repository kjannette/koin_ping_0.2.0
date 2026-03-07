ALTER TABLE alert_rules ADD COLUMN minimum DECIMAL(20, 6);
ALTER TABLE alert_rules ADD COLUMN maximum DECIMAL(20, 6);

ALTER TABLE alert_rules ADD CONSTRAINT non_negative_minimum CHECK (minimum IS NULL OR minimum >= 0);
ALTER TABLE alert_rules ADD CONSTRAINT non_negative_maximum CHECK (maximum IS NULL OR maximum >= 0);
ALTER TABLE alert_rules ADD CONSTRAINT min_lte_max CHECK (minimum IS NULL OR maximum IS NULL OR minimum <= maximum);
