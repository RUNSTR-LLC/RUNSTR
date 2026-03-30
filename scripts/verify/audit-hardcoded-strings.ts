/**
 * Audit: Hardcoded Strings
 * Scans src/screens/ for user-facing text not wrapped in t() or useTranslation.
 * Looks for <Text>hardcoded</Text>, title: 'string', message: 'string' in Alert calls.
 * Limited to first 50 findings.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');
const root = path.resolve(__dirname, '../..');
const MAX_FINDINGS = 50;

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

interface Finding {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
}

const findings: Finding[] = [];

// Patterns to detect hardcoded user-facing text
const PATTERNS: Array<{ regex: RegExp; label: string }> = [
  // <Text>hardcoded text</Text> (but not <Text>{variable}</Text> or <Text style=...)
  { regex: /<Text[^>]*>\s*[A-Z][a-zA-Z\s,.!?']+\s*<\/Text>/, label: '<Text>hardcoded</Text>' },
  // Alert.alert('title', 'message')
  { regex: /Alert\.alert\(\s*['"][A-Z][^'"]{2,}['"]/, label: 'Alert.alert hardcoded title' },
  // title: 'Hardcoded' in config objects
  { regex: /title:\s*['"][A-Z][^'"]{3,}['"]/, label: "title: 'hardcoded'" },
  // message: 'Hardcoded' in config objects
  { regex: /message:\s*['"][A-Z][^'"]{3,}['"]/, label: "message: 'hardcoded'" },
  // placeholder="Hardcoded"
  { regex: /placeholder=["'][A-Z][^"']{3,}["']/, label: 'placeholder="hardcoded"' },
  // label: 'Hardcoded'
  { regex: /label:\s*['"][A-Z][^'"]{3,}['"]/, label: "label: 'hardcoded'" },
];

// Strings to ignore (common non-translatable values)
const IGNORE_PATTERNS = [
  /RUNSTR/,
  /PPQ\.AI/,
  /AsyncStorage/,
  /console\./,
  /\/\//,   // comments
  /import\s/,
  /export\s/,
  /const\s/,
  /interface\s/,
  /type\s/,
  /StyleSheet/,
  /require\(/,
  /Platform\./,
  /testID/,
  /accessibilityLabel/,
  /key=/,
  /#[0-9a-fA-F]{3,8}/,  // hex colors
];

function shouldIgnoreLine(line: string): boolean {
  return IGNORE_PATTERNS.some((p) => p.test(line.trim()));
}

console.log('=== Hardcoded Strings Audit ===\n');

for (const file of getAllTsxFiles(SCREENS_DIR)) {
  if (findings.length >= MAX_FINDINGS) break;

  const content = fs.readFileSync(file, 'utf-8');

  // Skip files that use useTranslation heavily (they likely have t() calls)
  const usesTranslation = /useTranslation/.test(content);

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (findings.length >= MAX_FINDINGS) break;

    const line = lines[i];
    if (shouldIgnoreLine(line)) continue;

    for (const { regex, label } of PATTERNS) {
      if (regex.test(line)) {
        const snippet = line.trim().substring(0, 80);
        findings.push({
          file: path.relative(root, file),
          line: i + 1,
          pattern: label,
          snippet,
        });
        break; // one finding per line
      }
    }
  }
}

for (const f of findings) {
  console.log(`FLAG: ${f.file}:${f.line} [${f.pattern}]`);
  console.log(`      ${f.snippet}`);
}

console.log(`\n--- Summary ---`);
console.log(`Hardcoded strings found: ${findings.length}${findings.length >= MAX_FINDINGS ? ' (limit reached)' : ''}`);
console.log(`Screens using useTranslation: ${getAllTsxFiles(SCREENS_DIR).filter((f) => /useTranslation/.test(fs.readFileSync(f, 'utf-8'))).length}/${getAllTsxFiles(SCREENS_DIR).length}`);

process.exit(0);
