/**
 * Verifies the background split-announcement fix is wired correctly.
 *
 * Runtime audio behavior must be confirmed on a device/simulator, but these
 * source/config invariants are exactly what was broken, so we assert them here.
 *
 * Run: npx tsx scripts/verify/verify-background-splits.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

const appJson = read('app.json');
const plist = read('ios/RUNSTR/Info.plist');
const tts = read('src/services/activity/TTSAnnouncementService.ts');

// 1. iOS "audio" background mode present (required for background speech)
check('app.json UIBackgroundModes includes "audio"',
  /UIBackgroundModes[\s\S]*?"audio"[\s\S]*?\]/.test(appJson));
check('Info.plist UIBackgroundModes includes <string>audio</string>',
  /UIBackgroundModes<\/key>[\s\S]*?<string>audio<\/string>[\s\S]*?<\/array>/.test(plist));

// 2. The backgrounding teardown listener is gone (the active killer)
check('TTS no longer imports AppStateManager', !/AppStateManager/.test(tts));
check('TTS no longer references appStateUnsubscribe', !/appStateUnsubscribe/.test(tts));
check('TTS no longer releases session on background', !/App backgrounding, releasing/.test(tts));

// 3. Session stays alive in background
check('setupAudioSession uses staysActiveInBackground: true',
  /staysActiveInBackground:\s*true/.test(tts));

// 4. Per-utterance duck/unduck state machine
check('speak() activates session before speaking',
  /this\.isSpeaking = true;[\s\S]*?await this\.setupAudioSession\(\);[\s\S]*?Speech\.speak/.test(tts));
check('onSpeechComplete releases session when queue drains',
  /onSpeechComplete[\s\S]*?this\.releaseAudioSession\(\)/.test(tts));

console.log(failures === 0
  ? '\n✅ All invariants hold'
  : `\n❌ ${failures} invariant(s) failed`);
process.exit(failures === 0 ? 0 : 1);
