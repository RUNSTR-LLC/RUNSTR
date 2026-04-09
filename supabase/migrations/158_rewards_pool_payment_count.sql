-- Migration 158: Add payment_count column to rewards_pool
-- Column was previously created manually, needed after db reset

ALTER TABLE rewards_pool ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;
