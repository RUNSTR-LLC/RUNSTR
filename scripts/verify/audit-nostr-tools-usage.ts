/**
 * Audit: nostr-tools usage
 * Per CLAUDE.md: "NDK exclusively — NEVER use nostr-tools"
 * Scans all files in src/ for imports of nostr-tools and flags violations.
 * Also checks for key generation that should use NDKPrivateKeySigner.generate().
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');
const ROOT = path.resolve(__dirname, '../..');

function walkDir(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

interface Finding {
  file: string;
  line: number;
  severity: 'warning' | 'critical';
  detail: string;
}

const findings: Finding[] = [];

console.log('=== Audit: nostr-tools Usage ===\n');

const files = walkDir(SRC_DIR, ['.ts', '.tsx']);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(ROOT, file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for nostr-tools imports
    if (/from\s+['"]nostr-tools/.test(line)) {
      // Type-only imports are less severe (no runtime dependency)
      const isTypeOnly = /import\s+type\b/.test(line);

      // Check for specific dangerous imports
      const importsNip19 = /\bnip19\b/.test(line);
      const importsPool = /\bSimplePool\b/.test(line);

      let detail = line.trim();
      let severity: 'warning' | 'critical' = isTypeOnly ? 'warning' : 'critical';

      if (isTypeOnly) {
        detail += ' (type-only import — lower risk but should migrate to NDK types)';
      } else if (importsPool) {
        detail += ' (SimplePool — should use GlobalNDKService instead)';
      } else if (importsNip19) {
        detail += ' (nip19 — should use NDK encoding utilities)';
      }

      findings.push({ file: relPath, line: i + 1, severity, detail });
    }

    // Check for nostr-tools key generation (violates NDKPrivateKeySigner.generate() rule)
    if (/generateSecretKey|generatePrivateKey/.test(line)) {
      findings.push({
        file: relPath,
        line: i + 1,
        severity: 'critical',
        detail: `${line.trim()} — must use NDKPrivateKeySigner.generate() instead`,
      });
    }
  }
}

// Sort critical first
findings.sort((a, b) => {
  if (a.severity === b.severity) return 0;
  return a.severity === 'critical' ? -1 : 1;
});

const critical = findings.filter(f => f.severity === 'critical');
const warnings = findings.filter(f => f.severity === 'warning');

if (critical.length > 0) {
  console.log('--- Critical (runtime nostr-tools usage) ---');
  for (const f of critical) {
    console.log(`[CRITICAL] ${f.file}:${f.line}`);
    console.log(`           ${f.detail}`);
  }
}

if (warnings.length > 0) {
  console.log('\n--- Warnings (type-only imports) ---');
  for (const f of warnings) {
    console.log(`[WARNING] ${f.file}:${f.line}`);
    console.log(`          ${f.detail}`);
  }
}

console.log(`\n=== Summary: ${critical.length} critical, ${warnings.length} warning(s) — ${findings.length} total ===`);
process.exit(0);
