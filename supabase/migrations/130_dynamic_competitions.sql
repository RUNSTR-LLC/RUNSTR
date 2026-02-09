-- Dynamic Competitions: Add template/config columns for data-driven events
-- Existing rows get safe defaults; no breaking changes.

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'distance_race';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

COMMENT ON COLUMN competitions.template IS 'Event template: distance_race, step_challenge, goal_challenge, fundraiser';
COMMENT ON COLUMN competitions.config IS 'Template-specific JSON config (activity_types, score_unit, rules, prizes, etc.)';
COMMENT ON COLUMN competitions.image_url IS 'Banner image URL for the event card/detail screen';
COMMENT ON COLUMN competitions.is_open IS 'Whether new participants can join';
