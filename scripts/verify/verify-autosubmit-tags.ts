/**
 * Verify: autoSubmitToSupabase tag building and formatHHMMSS
 * Run: npx tsx scripts/verify/verify-autosubmit-tags.ts
 */

// Inline the formatHHMMSS logic (same as in LocalWorkoutStorageService)
function formatHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Inline buildWorkoutTags logic
interface Split {
  number: number;
  elapsedTime: number;
  splitTime: number;
}

interface MockWorkout {
  type: string;
  distance?: number;
  duration?: number;
  splits?: Split[];
  steps?: number;
}

interface MockRewardDestination {
  isPPQ: boolean;
  isCharity: boolean;
  charityId: string;
}

function buildWorkoutTags(workout: MockWorkout): string[][] {
  const tags: string[][] = [];
  tags.push(['exercise', workout.type]);

  if (workout.distance) {
    tags.push(['distance', (workout.distance / 1000).toFixed(2), 'km']);
  }

  if (workout.duration) {
    tags.push(['duration', formatHHMMSS(workout.duration)]);
  }

  if (workout.splits && workout.splits.length > 0) {
    for (const split of workout.splits) {
      tags.push(['split', String(split.number), formatHHMMSS(split.elapsedTime)]);
    }
  }

  if (workout.steps) {
    tags.push(['steps', workout.steps.toString()]);
    tags.push(['source', 'auto_steps']);
  }

  return tags;
}

function appendRewardDestinationTags(
  tags: string[][],
  destination: MockRewardDestination
): string[][] {
  if (destination.isPPQ) {
    tags.push(['reward_destination', 'ppq']);
  } else if (destination.isCharity) {
    tags.push(['reward_destination', 'charity']);
  } else {
    tags.push(['reward_destination', 'user']);
  }

  if (destination.charityId) {
    tags.push(['reward_charity_id', destination.charityId]);
  }

  return tags;
}

// ---- Tests ----

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('\n=== formatHHMMSS tests ===');
assert('0 seconds', formatHHMMSS(0) === '00:00:00', `got "${formatHHMMSS(0)}"`);
assert('59 seconds', formatHHMMSS(59) === '00:00:59', `got "${formatHHMMSS(59)}"`);
assert('60 seconds', formatHHMMSS(60) === '00:01:00', `got "${formatHHMMSS(60)}"`);
assert('3599 seconds (59:59)', formatHHMMSS(3599) === '00:59:59', `got "${formatHHMMSS(3599)}"`);
assert('3600 seconds (1hr)', formatHHMMSS(3600) === '01:00:00', `got "${formatHHMMSS(3600)}"`);
assert('7200 seconds (2hr)', formatHHMMSS(7200) === '02:00:00', `got "${formatHHMMSS(7200)}"`);
assert('4555 seconds (1:15:55)', formatHHMMSS(4555) === '01:15:55', `got "${formatHHMMSS(4555)}"`);
assert('fractional seconds floor', formatHHMMSS(90.7) === '00:01:30', `got "${formatHHMMSS(90.7)}"`);

console.log('\n=== buildWorkoutTags — GPS running with 5 splits ===');
const runWorkout: MockWorkout = {
  type: 'running',
  distance: 5230, // 5.23km in meters
  duration: 1650, // 27:30
  splits: [
    { number: 1, elapsedTime: 330, splitTime: 330 },
    { number: 2, elapsedTime: 650, splitTime: 320 },
    { number: 3, elapsedTime: 990, splitTime: 340 },
    { number: 4, elapsedTime: 1310, splitTime: 320 },
    { number: 5, elapsedTime: 1630, splitTime: 320 },
  ],
};

const tags = buildWorkoutTags(runWorkout);
assert('has exercise tag', tags[0][0] === 'exercise' && tags[0][1] === 'running');
assert('has distance tag', tags[1][0] === 'distance' && tags[1][1] === '5.23' && tags[1][2] === 'km');
assert('has duration tag', tags[2][0] === 'duration' && tags[2][1] === '00:27:30');
assert('has 5 split tags', tags.filter(t => t[0] === 'split').length === 5);
assert('split 1 format', tags[3][0] === 'split' && tags[3][1] === '1' && tags[3][2] === '00:05:30',
  `got ${JSON.stringify(tags[3])}`);
assert('split 5 format', tags[7][0] === 'split' && tags[7][1] === '5' && tags[7][2] === '00:27:10',
  `got ${JSON.stringify(tags[7])}`);
assert('total tag count = 8 (exercise + distance + duration + 5 splits)', tags.length === 8,
  `got ${tags.length}`);

console.log('\n=== buildWorkoutTags — walking with no splits ===');
const walkWorkout: MockWorkout = {
  type: 'walking',
  distance: 2500,
  duration: 1800,
};
const walkTags = buildWorkoutTags(walkWorkout);
assert('3 tags (exercise + distance + duration)', walkTags.length === 3, `got ${walkTags.length}`);

console.log('\n=== buildWorkoutTags — step workout ===');
const stepWorkout: MockWorkout = {
  type: 'walking',
  distance: 3200,
  duration: 43200,
  steps: 5000,
};
const stepTags = buildWorkoutTags(stepWorkout);
assert('has steps tag', stepTags.some(t => t[0] === 'steps' && t[1] === '5000'));
assert('has source auto_steps tag', stepTags.some(t => t[0] === 'source' && t[1] === 'auto_steps'));

console.log('\n=== reward destination tag tests ===');
const baseTags: string[][] = [['exercise', 'running']];

const userDest = appendRewardDestinationTags([...baseTags], {
  isPPQ: false,
  isCharity: false,
  charityId: 'runstr',
});
assert('user destination tag present', userDest.some(t => t[0] === 'reward_destination' && t[1] === 'user'));
assert('charity id tag present for user fallback context', userDest.some(t => t[0] === 'reward_charity_id' && t[1] === 'runstr'));

const charityDest = appendRewardDestinationTags([...baseTags], {
  isPPQ: false,
  isCharity: true,
  charityId: 'hrf',
});
assert('charity destination tag present', charityDest.some(t => t[0] === 'reward_destination' && t[1] === 'charity'));
assert('charity id tag present', charityDest.some(t => t[0] === 'reward_charity_id' && t[1] === 'hrf'));

const ppqDest = appendRewardDestinationTags([...baseTags], {
  isPPQ: true,
  isCharity: false,
  charityId: 'ppq_ai',
});
assert('ppq destination tag present', ppqDest.some(t => t[0] === 'reward_destination' && t[1] === 'ppq'));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
