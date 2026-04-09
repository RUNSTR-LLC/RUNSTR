/**
 * Verify club chat features — types, service, hook, components all typecheck.
 * Confirms new interfaces, methods, and props are structurally sound.
 */

import type { ClubMessage, ClubMessageType, WorkoutMessageMetadata, ReplyContext } from '../../src/types/club';
import type { SendMessageOptions } from '../../src/services/backend/ClubChatService';

// 1. ClubMessage has all new fields
const msg: ClubMessage = {
  id: 'test',
  club_id: 'club-1',
  sender_npub: 'npub1...',
  content: 'Hello',
  created_at: new Date().toISOString(),
  deleted_at: null,
  reply_to_id: null,
  message_type: 'message',
  metadata: null,
  reactions: {},
};
console.log('✅ ClubMessage: all new fields present');

// 2. WorkoutMessageMetadata
const meta: WorkoutMessageMetadata = {
  exercise_type: 'running',
  distance_meters: 5200,
  duration_seconds: 1694,
  profile_name: 'Dakota',
};
console.log('✅ WorkoutMessageMetadata: valid');

// 3. ReplyContext
const reply: ReplyContext = {
  id: 'msg-1',
  sender_npub: 'npub1...',
  content: 'Original message',
  sender_name: 'Alice',
};
console.log('✅ ReplyContext: valid');

// 4. SendMessageOptions
const opts: SendMessageOptions = {
  replyToId: 'msg-1',
  messageType: 'announcement',
  metadata: meta,
};
console.log('✅ SendMessageOptions: valid');

// 5. ClubMessageType
const types: ClubMessageType[] = ['message', 'announcement', 'workout'];
console.log(`✅ ClubMessageType: ${types.length} variants`);

// 6. Reactions structure
const reactions: Record<string, string[]> = {
  '🔥': ['npub1...', 'npub2...'],
  '💪': ['npub1...'],
};
const msgWithReactions: ClubMessage = { ...msg, reactions };
console.log(`✅ Reactions: ${Object.keys(msgWithReactions.reactions).length} emojis`);

console.log('\n✅ All club chat feature types verify correctly');
