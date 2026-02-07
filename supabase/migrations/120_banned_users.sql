-- Migration: Create banned_users table for permanent bans
-- This table stores npubs that are permanently banned from leaderboards

CREATE TABLE IF NOT EXISTS banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npub TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  banned_by TEXT, -- admin who banned them (optional)
  expires_at TIMESTAMPTZ -- NULL = permanent, date = temporary ban
);

-- Index for fast lookups during workout submission
CREATE INDEX IF NOT EXISTS idx_banned_users_npub ON banned_users(npub);

-- Add comment for documentation
COMMENT ON TABLE banned_users IS 'Users permanently banned from leaderboards due to cheating';

-- Insert the first banned user (the car cheater)
INSERT INTO banned_users (npub, reason)
VALUES (
  'npub1llmfh2j53h6yy97l3n6dsj5q06x8whfs0eg3v32rnvutwttg47cscaqs8w',
  'Repeated car cheating - multiple impossible 5K times (11:11, 12:42)'
)
ON CONFLICT (npub) DO NOTHING;
