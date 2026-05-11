/**
 * Static verification that the Privacy + Apple Health + Health Connect wiring
 * inside Fitness Tracking points at real symbols. Greps the source rather than
 * importing it (the services pull react-native, which Node/tsx can't load).
 *
 * Run: npx tsx scripts/verify/verify-fitness-tracking-wiring.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(repoRoot, rel), 'utf8');

const checks: Array<{ check: string; ok: boolean; detail?: string }> = [];

const expect = (
  check: string,
  haystack: string,
  needle: string | RegExp,
  detail?: string,
) => {
  const ok =
    typeof needle === 'string' ? haystack.includes(needle) : needle.test(haystack);
  checks.push({ check, ok, detail });
};

// 1. HealthKitService surface used by handleHealthKitSyncToggle
const hkService = read('src/services/fitness/healthKitService.ts');
expect('HealthKitService exports class', hkService, /export class HealthKitService/);
expect('HealthKitService.getInstance()', hkService, 'static getInstance');
expect('HealthKitService.requestPermissions()', hkService, /requestPermissions\s*\(/);
expect('HealthKitService.getStatus() returns lastSyncAt', hkService, 'lastSyncAt');

// 2. HealthKitBackgroundService surface
const hkBg = read('src/services/fitness/HealthKitBackgroundService.ts');
expect('HealthKitBackgroundService.getInstance()', hkBg, 'static getInstance');
expect('HealthKitBackgroundService.setupBackgroundDelivery()', hkBg, 'setupBackgroundDelivery');
expect('HealthKitBackgroundService.cleanup()', hkBg, /\bcleanup\s*\(/);

// 3. HealthConnectService surface used by handleHealthConnectSyncToggle
const hcService = read('src/services/fitness/healthConnectService.ts');
expect('HealthConnectService exports class', hcService, /export class HealthConnectService/);
expect('HealthConnectService default export (singleton)', hcService, 'export default HealthConnectService.getInstance()');
expect('HealthConnectService.requestPermissions()', hcService, /async requestPermissions\s*\(/);
expect('HealthConnectService.getStatus() returns available', hcService, /available:\s*HealthConnectService\.isAvailable\(\)/);
expect('HealthConnectService.getStatus() returns lastSyncAt', hcService, 'lastSyncAt: this.lastSyncAt');

// 4. BackgroundSyncRegistration surface (Android background sync)
const bgReg = read('src/services/fitness/BackgroundSyncRegistration.ts');
expect('BackgroundSyncRegistration.register()', bgReg, /static async register\s*\(/);
expect('BackgroundSyncRegistration.unregister()', bgReg, /static async unregister\s*\(/);

// 5. useSettingsState wires the right symbols
const settingsState = read('src/screens/useSettingsState.ts');
expect('useSettingsState reads @runstr:private_mode', settingsState, '@runstr:private_mode');
expect('useSettingsState reads @runstr:healthkit_sync_enabled', settingsState, '@runstr:healthkit_sync_enabled');
expect('useSettingsState reads @runstr:healthconnect_sync_enabled', settingsState, '@runstr:healthconnect_sync_enabled');
expect('useSettingsState calls HealthKitService.requestPermissions', settingsState, 'hkService.requestPermissions');
expect('useSettingsState calls HealthConnectService.requestPermissions', settingsState, 'hcService.requestPermissions');
expect('useSettingsState wires HealthKit background delivery', settingsState, 'setupBackgroundDelivery');
expect('useSettingsState wires Android BackgroundSyncRegistration.register', settingsState, 'BackgroundSyncRegistration.register');
expect('useSettingsState wires Android BackgroundSyncRegistration.unregister', settingsState, 'BackgroundSyncRegistration.unregister');
expect('useSettingsState exposes handleHealthConnectSyncToggle', settingsState, 'handleHealthConnectSyncToggle');
expect('useSettingsState exposes handlePrivateModeToggle', settingsState, 'handlePrivateModeToggle');

// 6. SettingsScreen passes everything through to FitnessTrackingSection
const settingsScreen = read('src/screens/SettingsScreen.tsx');
expect('SettingsScreen passes privateModeEnabled', settingsScreen, 'privateModeEnabled={state.privateModeEnabled}');
expect('SettingsScreen passes onPrivateModeToggle', settingsScreen, 'onPrivateModeToggle={state.handlePrivateModeToggle}');
expect('SettingsScreen passes onHealthKitSyncToggle', settingsScreen, 'onHealthKitSyncToggle={state.handleHealthKitSyncToggle}');
expect('SettingsScreen passes onHealthConnectSyncToggle', settingsScreen, 'onHealthConnectSyncToggle={state.handleHealthConnectSyncToggle}');
expect('SettingsScreen no longer renders standalone PrivacySection', settingsScreen, /^(?!.*<PrivacySection)/s);
expect('SettingsScreen no longer renders standalone AppleHealthSection', settingsScreen, /^(?!.*<AppleHealthSection)/s);

// 7. FitnessTrackingSection renders the new subsections
const fts = read('src/components/settings/FitnessTrackingSection.tsx');
expect('FitnessTrackingSection renders Privacy subsection', fts, "subsectionTitle}>Privacy<");
expect('FitnessTrackingSection renders Apple Health subsection (iOS)', fts, "subsectionTitle}>Apple Health<");
expect('FitnessTrackingSection renders Health Connect subsection (Android)', fts, "subsectionTitle}>Health Connect<");
expect('FitnessTrackingSection gates Health Connect on Platform.OS === android', fts, "Platform.OS === 'android'");

let pass = 0;
let fail = 0;
for (const r of checks) {
  const tag = r.ok ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${r.check}${r.detail ? `  -> ${r.detail}` : ''}`);
  r.ok ? pass++ : fail++;
}
console.log(`\nSummary: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exitCode = 1;
