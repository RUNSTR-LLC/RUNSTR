// Run: npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-workout-interaction-service.ts
import 'dotenv/config';
import { WorkoutInteractionService } from '../../src/services/social/WorkoutInteractionService';
import { supabase } from '../../src/utils/supabase';

const svc = WorkoutInteractionService.getInstance();
const EVT = `__verify_evt_${Date.now()}`;     // unique; avoids Date.now-in-workflow ban (this is a standalone script, fine)
const NPUB = '__verify_npub__';
let failed = 0; const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL:', m); failed++; } };

(async () => {
  const liked = await svc.toggleLike(EVT, NPUB);          assert(liked === true, 'like on');
  await svc.addComment(EVT, NPUB, 'hi', 'Tester', null);
  await svc.recordZap(EVT, NPUB, 21);
  const counts = (await svc.getCountsForEvents([EVT], NPUB)).get(EVT);
  assert(counts?.likeCount === 1, 'likeCount 1');
  assert(counts?.commentCount === 1, 'commentCount 1');
  assert(counts?.zapTotal === 21, 'zapTotal 21');
  assert(counts?.likedByMe === true, 'likedByMe true');
  assert((await svc.getComments(EVT)).length === 1, 'getComments 1');
  assert((await svc.getLikers(EVT)).includes(NPUB), 'getLikers has npub');
  assert((await svc.getZaps(EVT)).length === 1, 'getZaps 1');
  const unliked = await svc.toggleLike(EVT, NPUB);         assert(unliked === false, 'like off');
  assert((await svc.getCountsForEvents([EVT], NPUB)).get(EVT)?.likeCount === 0, 'likeCount 0 after unlike');
  // cleanup
  await supabase!.from('workout_likes').delete().eq('event_id', EVT);
  await supabase!.from('workout_comments').delete().eq('event_id', EVT);
  await supabase!.from('workout_zaps').delete().eq('event_id', EVT);
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
