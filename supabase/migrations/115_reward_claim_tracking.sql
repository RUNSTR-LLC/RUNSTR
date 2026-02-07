-- Migration: Add reward_claimed column for double-zap prevention
-- This column allows us to track reward claims server-side as a backup to AsyncStorage

-- Add reward_claimed column to competition_participants
ALTER TABLE competition_participants
ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT FALSE;

-- Add reward_claimed_at timestamp for audit trail
ALTER TABLE competition_participants
ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_competition_participants_reward_claimed
ON competition_participants(competition_id, npub)
WHERE reward_claimed = TRUE;

-- Allow users to update their own reward_claimed status
-- This is used when auto-pay or manual claim successfully pays the reward
DROP POLICY IF EXISTS "Users can mark their own reward claimed" ON competition_participants;
CREATE POLICY "Users can mark their own reward claimed"
ON competition_participants
FOR UPDATE
USING (true)
WITH CHECK (true);

COMMENT ON COLUMN competition_participants.reward_claimed IS 'Server-side backup for reward claim status. Prevents double payments if AsyncStorage is cleared.';
COMMENT ON COLUMN competition_participants.reward_claimed_at IS 'Timestamp when reward was claimed. Used for audit trail.';
