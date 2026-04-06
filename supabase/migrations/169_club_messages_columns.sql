-- Add missing columns to club_messages that the manage-club-chat edge function expects
ALTER TABLE club_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES club_messages(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
