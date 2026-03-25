/**
 * Test: Encrypted Backup / Restore Pipeline
 * Run: npx tsx scripts/core-tests/test-encrypted-backup.ts
 *
 * Tests the encrypted backup and restore system:
 * 1. BackupService method existence and patterns
 * 2. Kind 30078 event creation
 * 3. NIP-44 encryption usage
 * 4. Gzip compression with pako
 * 5. Backup payload includes workouts, habits, journal
 * 6. App version in metadata
 * 7. AutoBackupService trigger after workout save
 * 8. RestoreService decryption and decompression
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test 1: Required source files exist
// ---------------------------------------------------------------------------

function testRequiredFilesExist() {
  console.log('\n=== Required backup source files ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  const requiredFiles = [
    'services/backup/BackupService.ts',
    'services/backup/AutoBackupService.ts',
    'services/backup/RestoreService.ts',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(srcRoot, file);
    assert(`${file} exists`, fs.existsSync(fullPath));
  }
}

// ---------------------------------------------------------------------------
// Test 2: BackupService methods and structure
// ---------------------------------------------------------------------------

function testBackupServiceMethods() {
  console.log('\n=== BackupService methods ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backup/BackupService.ts'),
    'utf8'
  );

  assert(
    'exportToNostr method exists',
    src.includes('async exportToNostr(')
  );

  assert(
    'collectBackupData method exists',
    src.includes('async collectBackupData(') || src.includes('private async collectBackupData(')
  );

  assert(
    'getBackupStats method exists',
    src.includes('async getBackupStats(')
  );

  assert(
    'getLastBackupTime method exists',
    src.includes('async getLastBackupTime(')
  );

  assert(
    'encryptPayload method exists',
    src.includes('encryptPayload')
  );

  assert(
    'createBackupEvent method exists',
    src.includes('createBackupEvent')
  );

  assert(
    'publishToRelays method exists',
    src.includes('publishToRelays')
  );

  assert(
    'BackupService uses singleton pattern',
    src.includes('static getInstance()')
  );
}

// ---------------------------------------------------------------------------
// Test 3: Kind 30078 event
// ---------------------------------------------------------------------------

function testKind30078() {
  console.log('\n=== Kind 30078 backup event ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backup/BackupService.ts'),
    'utf8'
  );

  assert(
    'BACKUP_EVENT_KIND is 30078',
    src.includes('BACKUP_EVENT_KIND = 30078')
  );

  assert(
    'BACKUP_D_TAG is runstr-workout-backup',
    src.includes("BACKUP_D_TAG = 'runstr-workout-backup'")
  );

  assert(
    'Uses NDKEvent from @nostr-dev-kit/ndk',
    src.includes("import { NDKEvent }") || src.includes("NDKEvent")
  );

  assert(
    'Uses GlobalNDKService for relay management',
    src.includes('GlobalNDKService')
  );

  // Default relays
  assert(
    'DEFAULT_BACKUP_RELAYS includes relay.damus.io',
    src.includes("'wss://relay.damus.io'")
  );

  assert(
    'DEFAULT_BACKUP_RELAYS includes nos.lol',
    src.includes("'wss://nos.lol'")
  );
}

// ---------------------------------------------------------------------------
// Test 4: NIP-44 encryption
// ---------------------------------------------------------------------------

function testNip44Encryption() {
  console.log('\n=== NIP-44 encryption ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backup/BackupService.ts'),
    'utf8'
  );

  assert(
    'Uses NIP-44 self-encryption (encrypt to own pubkey)',
    src.includes('nip44') || src.includes('NIP-44')
  );

  assert(
    'Signer encrypts with nip44 mode',
    src.includes("signer.encrypt(") && src.includes("'nip44'")
  );

  assert(
    'Encrypted tag is set to nip44',
    src.includes("['encrypted', 'nip44']")
  );

  assert(
    'Self-encryption pattern (encrypts to own pubkey)',
    src.includes('selfUser') || src.includes('self-encryption')
  );

  assert(
    'Uses UnifiedSigningService for signer',
    src.includes('UnifiedSigningService')
  );

  assert(
    'Works with both nsec and Amber users',
    src.includes('Amber') && src.includes('nsec')
  );
}

// ---------------------------------------------------------------------------
// Test 5: Gzip compression
// ---------------------------------------------------------------------------

function testGzipCompression() {
  console.log('\n=== Gzip compression ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const backupSrc = fs.readFileSync(
    path.join(srcRoot, 'services/backup/BackupService.ts'),
    'utf8'
  );

  assert(
    'BackupService imports pako',
    backupSrc.includes("import pako from 'pako'")
  );

  assert(
    'BackupService uses pako.gzip for compression',
    backupSrc.includes('pako.gzip(')
  );

  assert(
    'Compression tag is set to gzip',
    backupSrc.includes("['compression', 'gzip']")
  );

  assert(
    'Compressed data is base64 encoded',
    backupSrc.includes('compressedBase64') || backupSrc.includes('uint8ArrayToBase64')
  );

  assert(
    'Checks compressed size against maximum',
    backupSrc.includes('MAX_COMPRESSED_BYTES') || backupSrc.includes('compressed.length >')
  );

  // RestoreService decompresses
  const restoreSrc = fs.readFileSync(
    path.join(srcRoot, 'services/backup/RestoreService.ts'),
    'utf8'
  );

  assert(
    'RestoreService imports pako',
    restoreSrc.includes("import pako from 'pako'")
  );

  assert(
    'RestoreService uses pako.ungzip for decompression',
    restoreSrc.includes('pako.ungzip(')
  );
}

// ---------------------------------------------------------------------------
// Test 6: Backup payload includes workouts, habits, journal
// ---------------------------------------------------------------------------

function testBackupPayload() {
  console.log('\n=== Backup payload structure ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backup/BackupService.ts'),
    'utf8'
  );

  // WorkoutBackupPayload interface
  assert(
    'WorkoutBackupPayload has workouts field',
    src.includes('workouts: LocalWorkout[]')
  );

  assert(
    'WorkoutBackupPayload has habits field',
    src.includes('habits?: Habit[]')
  );

  assert(
    'WorkoutBackupPayload has journal field',
    src.includes('journal?: JournalEntry[]')
  );

  assert(
    'WorkoutBackupPayload has preferences field',
    src.includes('preferences?: BackupPreferences')
  );

  assert(
    'WorkoutBackupPayload has version field',
    src.includes('version: number')
  );

  assert(
    'WorkoutBackupPayload has exportedAt field',
    src.includes('exportedAt: string')
  );

  assert(
    'WorkoutBackupPayload has appVersion field',
    src.includes('appVersion: string')
  );

  // collectBackupData reads all data sources
  assert(
    'collectBackupData reads workouts via LocalWorkoutStorageService',
    src.includes('LocalWorkoutStorageService') && src.includes('getAllWorkouts')
  );

  assert(
    'collectBackupData reads habits via getAllHabits',
    src.includes('getAllHabits')
  );

  assert(
    'collectBackupData reads journal via JournalService',
    src.includes('JournalService') && src.includes('getAllEntries')
  );

  // BACKUP_VERSION
  assert(
    'BACKUP_VERSION is defined',
    src.includes('BACKUP_VERSION = 1')
  );
}

// ---------------------------------------------------------------------------
// Test 7: App version in backup metadata
// ---------------------------------------------------------------------------

function testAppVersionInMetadata() {
  console.log('\n=== App version in backup ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backup/BackupService.ts'),
    'utf8'
  );

  assert(
    'Imports expo-application for version info',
    src.includes("import * as Application from 'expo-application'")
  );

  assert(
    'Uses Application.nativeApplicationVersion in payload',
    src.includes('Application.nativeApplicationVersion')
  );

  assert(
    'Client tag includes app version',
    src.includes("['client', 'RUNSTR'")
  );
}

// ---------------------------------------------------------------------------
// Test 8: AutoBackupService trigger
// ---------------------------------------------------------------------------

function testAutoBackupService() {
  console.log('\n=== AutoBackupService ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const autoSrc = fs.readFileSync(
    path.join(srcRoot, 'services/backup/AutoBackupService.ts'),
    'utf8'
  );

  assert(
    'AutoBackupService uses singleton pattern',
    autoSrc.includes('static getInstance()')
  );

  assert(
    'scheduleBackup method exists',
    autoSrc.includes('scheduleBackup()')
  );

  assert(
    'runBackupNow method exists',
    autoSrc.includes('async runBackupNow()')
  );

  assert(
    'Debounce is 3 minutes',
    autoSrc.includes('DEBOUNCE_MS = 3 * 60 * 1000')
  );

  assert(
    'Imports BackupService',
    autoSrc.includes("import { BackupService")
  );

  assert(
    'onAppBackground method exists (flush on background)',
    autoSrc.includes('async onAppBackground()')
  );

  assert(
    'onAppForeground method exists (deferred Amber backup)',
    autoSrc.includes('async onAppForeground()')
  );

  assert(
    'Handles Amber vs nsec auth differences',
    autoSrc.includes('amber') || autoSrc.includes('Amber')
  );

  // Verify LocalWorkoutStorageService calls scheduleBackup
  const lwsSrc = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/LocalWorkoutStorageService.ts'),
    'utf8'
  );

  assert(
    'LocalWorkoutStorageService triggers auto-backup after save',
    lwsSrc.includes('scheduleBackup') || lwsSrc.includes('AutoBackupService')
  );

  // Verify HealthKitBackgroundService triggers backup
  const hkBgSrc = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/HealthKitBackgroundService.ts'),
    'utf8'
  );

  assert(
    'HealthKitBackgroundService triggers backup after background sync',
    hkBgSrc.includes('AutoBackupService') && hkBgSrc.includes('runBackupInBackground')
  );
}

// ---------------------------------------------------------------------------
// Test 9: RestoreService methods
// ---------------------------------------------------------------------------

function testRestoreService() {
  console.log('\n=== RestoreService ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backup/RestoreService.ts'),
    'utf8'
  );

  assert(
    'RestoreService uses singleton pattern',
    src.includes('static getInstance()')
  );

  assert(
    'RestoreService uses kind 30078',
    src.includes('BACKUP_EVENT_KIND = 30078')
  );

  assert(
    'RestoreService uses runstr-workout-backup d-tag',
    src.includes("BACKUP_D_TAG = 'runstr-workout-backup'")
  );

  assert(
    'RestoreService imports DEFAULT_BACKUP_RELAYS from BackupService',
    src.includes("import { DEFAULT_BACKUP_RELAYS }") ||
    src.includes("from './BackupService'")
  );

  assert(
    'RestoreService uses UnifiedSigningService for decryption',
    src.includes('UnifiedSigningService')
  );

  assert(
    'RestoreService decompresses with pako.ungzip',
    src.includes('pako.ungzip')
  );

  // ImportResult shape
  assert(
    'ImportResult tracks workoutsImported/Skipped',
    src.includes('workoutsImported') && src.includes('workoutsSkipped')
  );

  assert(
    'ImportResult tracks habitsImported/Skipped',
    src.includes('habitsImported') && src.includes('habitsSkipped')
  );

  assert(
    'ImportResult tracks journalImported/Skipped',
    src.includes('journalImported') && src.includes('journalSkipped')
  );

  // BackupMetadata shape
  assert(
    'BackupMetadata includes workoutCount',
    src.includes('workoutCount: number')
  );

  assert(
    'BackupMetadata includes backupVersion',
    src.includes('backupVersion: number')
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Encrypted Backup / Restore Pipeline Tests ===');

  testRequiredFilesExist();
  testBackupServiceMethods();
  testKind30078();
  testNip44Encryption();
  testGzipCompression();
  testBackupPayload();
  testAppVersionInMetadata();
  testAutoBackupService();
  testRestoreService();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
