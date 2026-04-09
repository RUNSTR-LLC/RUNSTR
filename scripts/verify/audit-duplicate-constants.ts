/**
 * Audit: Find duplicate constant definitions across the codebase.
 * Checks for cardio type arrays, reward amounts, and AsyncStorage key prefixes
 * defined in multiple files.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

function getAllFiles(dir: string, ext: string[] = ['.ts', '.tsx']): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

interface Match {
  file: string;
  line: number;
  text: string;
}

interface DuplicationCheck {
  label: string;
  patterns: RegExp[];
  matches: Match[];
}

const checks: DuplicationCheck[] = [
  {
    label: 'Cardio type arrays (CARDIO_TYPES or similar)',
    patterns: [
      /(?:CARDIO_TYPES|cardioTypes|CARDIO_ACTIVITIES)\s*[:=]/i,
      /\[\s*['"](?:running|run)['"],\s*['"](?:walking|walk)['"],\s*['"](?:cycling|cycle)['"]/i,
    ],
    matches: [],
  },
  {
    label: 'Activity/exercise type arrays',
    patterns: [
      /(?:EXERCISE_TYPES|ACTIVITY_TYPES|WORKOUT_TYPES|exerciseTypes|activityTypes)\s*[:=]/i,
      /(?:STRENGTH_TYPES|strengthTypes|STRENGTH_ACTIVITIES)\s*[:=]/i,
    ],
    matches: [],
  },
  {
    label: 'Reward amount constants',
    patterns: [
      /(?:REWARD_AMOUNT|BASE_REWARD|REWARD_VALUE|SAT_AMOUNT|SATS_PER)\s*[:=]\s*\d/i,
      /(?:reward|payout|bounty)\s*[:=]\s*(?:50|100|21|10)\b/i,
    ],
    matches: [],
  },
  {
    label: 'AsyncStorage key prefixes (@runstr:)',
    patterns: [
      /['"]@runstr:[^'"]+['"]/,
    ],
    matches: [],
  },
];

const files = getAllFiles(SRC_DIR);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const rel = path.relative(path.resolve(__dirname, '../..'), file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and imports
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;

    for (const check of checks) {
      for (const pattern of check.patterns) {
        if (pattern.test(line)) {
          check.matches.push({
            file: rel,
            line: i + 1,
            text: trimmed.substring(0, 120),
          });
          break; // One match per check per line
        }
      }
    }
  }
}

console.log('=== Duplicate Constants Audit ===\n');

let totalDuplicates = 0;

for (const check of checks) {
  // Group by unique key prefix for AsyncStorage, or just count files
  const uniqueFiles = new Set(check.matches.map(m => m.file));

  if (check.label.includes('AsyncStorage')) {
    // For AsyncStorage keys, find the same key in multiple files
    const keyMap = new Map<string, Match[]>();
    for (const m of check.matches) {
      const keyMatch = m.text.match(/@runstr:[^'"]+/);
      const key = keyMatch ? keyMatch[0] : m.text;
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key)!.push(m);
    }

    const duplicateKeys = [...keyMap.entries()].filter(([_, matches]) => {
      const files = new Set(matches.map(m => m.file));
      return files.size > 1;
    });

    if (duplicateKeys.length > 0) {
      console.log(`${check.label} — duplicated keys:\n`);
      for (const [key, matches] of duplicateKeys) {
        console.log(`  Key: ${key}`);
        for (const m of matches) {
          console.log(`    ${m.file}:${m.line}`);
        }
        totalDuplicates++;
      }
      console.log('');
    } else {
      console.log(`${check.label} — no duplicates across files\n`);
    }
  } else {
    if (uniqueFiles.size > 1) {
      console.log(`${check.label} — defined in ${uniqueFiles.size} files:\n`);
      for (const m of check.matches) {
        console.log(`  ${m.file}:${m.line}`);
        console.log(`    ${m.text}`);
      }
      totalDuplicates += uniqueFiles.size - 1;
      console.log('');
    } else if (check.matches.length > 0) {
      console.log(`${check.label} — found in 1 file only (no duplication)\n`);
    } else {
      console.log(`${check.label} — no matches found\n`);
    }
  }
}

console.log(`=== Summary: ${totalDuplicates} duplication issue(s) found ===`);
process.exit(0);
