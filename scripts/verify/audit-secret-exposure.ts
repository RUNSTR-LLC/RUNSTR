/**
 * Audit: Scan src/ for hardcoded secrets (nsec keys, API keys, bearer tokens, passwords).
 * Excludes .env files and references to process.env / ENV variables.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

const SECRET_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'Nostr private key (nsec1...)', regex: /nsec1[a-z0-9]{58,}/i },
  { label: 'Hex secret key (sk + hex)', regex: /\bsk['"]\s*[:=]\s*['"][0-9a-f]{64}['"]/i },
  { label: 'Hardcoded API key assignment', regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i },
  { label: 'Bearer token', regex: /['"]Bearer\s+[A-Za-z0-9_\-.]{20,}['"]/i },
  { label: 'Hardcoded password assignment', regex: /(?:password|passwd|secret)\s*[:=]\s*['"][^'"]{8,}['"]/i },
  { label: 'Hardcoded hex private key', regex: /(?:private[_-]?key|privkey)\s*[:=]\s*['"][0-9a-f]{64}['"]/i },
];

// Lines referencing env vars are not secrets
const ENV_EXCLUSIONS = [
  /process\.env/,
  /Constants\.expoConfig/,
  /Config\./,
  /EXPO_PUBLIC_/,
  /getEnv/,
  /\.env/,
];

function getAllFiles(dir: string, ext: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
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

interface Finding {
  file: string;
  line: number;
  label: string;
  text: string;
}

const findings: Finding[] = [];

const files = getAllFiles(SRC_DIR);
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that reference environment variables
    if (ENV_EXCLUSIONS.some(ex => ex.test(line))) continue;

    // Skip comment-only lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        const rel = path.relative(path.resolve(__dirname, '../..'), file);
        findings.push({
          file: rel,
          line: i + 1,
          label: pattern.label,
          text: trimmed.substring(0, 120),
        });
      }
    }
  }
}

console.log('=== Secret Exposure Audit ===\n');

if (findings.length === 0) {
  console.log('No hardcoded secrets found.\n');
} else {
  for (const f of findings) {
    console.log(`  [WARN] ${f.label}`);
    console.log(`         ${f.file}:${f.line}`);
    console.log(`         ${f.text}\n`);
  }
}

console.log(`=== Summary: ${findings.length} potential secret(s) found ===`);
process.exit(0);
