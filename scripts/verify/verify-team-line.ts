/**
 * Verification: TeamLine + chat unread badge wiring
 *
 * Asserts:
 *  - ClubChatService exposes getUnreadCount and markChatAsSeen
 *  - The storage key family is correct
 *  - TeamLine component file exists
 *  - ProfileHero accepts currentTeam in its props
 *
 * Run: npx tsx scripts/verify/verify-team-line.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const repoRoot = resolve(__dirname, '../..');
const failures: string[] = [];

// 1. Methods exist on the service (source-level check — runtime import pulls in react-native)
const servicePath = resolve(repoRoot, 'src/services/backend/ClubChatService.ts');
const serviceSrc = readFileSync(servicePath, 'utf8');
if (!/static\s+(async\s+)?getUnreadCount\s*\(/.test(serviceSrc)) {
  failures.push('ClubChatService.getUnreadCount static method is not defined');
}
if (!/static\s+(async\s+)?markChatAsSeen\s*\(/.test(serviceSrc)) {
  failures.push('ClubChatService.markChatAsSeen static method is not defined');
}

// 2. Storage key shape — written to source verbatim
if (!serviceSrc.includes('@runstr:club_chat_last_seen:')) {
  failures.push('ClubChatService.ts is missing the @runstr:club_chat_last_seen: storage key prefix');
}

// 3. TeamLine file exists
const teamLinePath = resolve(repoRoot, 'src/components/profile/TeamLine.tsx');
if (!existsSync(teamLinePath)) {
  failures.push('TeamLine.tsx does not exist at src/components/profile/TeamLine.tsx');
}

// 4. ProfileHero declares currentTeam prop
const heroPath = resolve(repoRoot, 'src/components/profile/ProfileHero.tsx');
const heroSrc = readFileSync(heroPath, 'utf8');
if (!heroSrc.includes('currentTeam') || !heroSrc.includes('TeamLine')) {
  failures.push('ProfileHero.tsx is missing currentTeam prop or TeamLine import');
}

if (failures.length > 0) {
  console.error('Team-line verification FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('Team-line verification PASSED.');
console.log('  ClubChatService.getUnreadCount: present');
console.log('  ClubChatService.markChatAsSeen: present');
console.log('  Storage key prefix: @runstr:club_chat_last_seen:');
console.log('  TeamLine.tsx: exists');
console.log('  ProfileHero.tsx: wired to TeamLine');
