-- Migration 157: Reset rewards pool balance to 0
-- Pool will be funded when sponsorship/reward pipeline is active

UPDATE rewards_pool SET balance_sats = 0, total_paid_sats = 0, total_deposited_sats = 0;

-- If no rows exist, insert one with 0 balance
INSERT INTO rewards_pool (balance_sats, total_deposited_sats, total_paid_sats)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM rewards_pool);
