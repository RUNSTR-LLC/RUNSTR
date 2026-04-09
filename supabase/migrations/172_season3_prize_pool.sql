-- Set Season III prize pool
UPDATE season3_config SET value = '100000' WHERE key = 'prize_pool_first';
UPDATE season3_config SET value = '50000' WHERE key = 'prize_pool_second';
