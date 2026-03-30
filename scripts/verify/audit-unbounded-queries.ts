/**
 * Audit: Unbounded queries
 * Scans src/services/ for Supabase queries without .limit() and
 * NDK fetchEvents calls without a limit in the filter.
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_DIR = path.resolve(__dirname, '../../src/services');
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
  type: string;
  snippet: string;
}

const findings: Finding[] = [];

console.log('=== Audit: Unbounded Queries ===\n');

// --- Supabase queries without .limit() ---
console.log('--- Supabase queries without .limit() ---');

const serviceFiles = walkDir(SERVICES_DIR, ['.ts', '.tsx']);

for (const file of serviceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Look for .from('table_name') which starts a Supabase query chain
    if (/\.from\s*\(\s*['"]/.test(lines[i])) {
      // Gather the query chain (next ~15 lines or until a semicolon/closing paren block)
      let chain = '';
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        chain += lines[j] + '\n';
        // Stop at end of statement
        if (/;\s*$/.test(lines[j].trim()) || (j > i && /^\s*$/.test(lines[j]))) break;
      }

      // Skip insert/update/delete/upsert — they don't need limits
      if (/\.(insert|update|delete|upsert)\s*\(/.test(chain)) continue;
      // Skip .single() — already limited to 1
      if (/\.single\s*\(/.test(chain)) continue;
      // Skip .maybeSingle() — already limited to 1
      if (/\.maybeSingle\s*\(/.test(chain)) continue;
      // Skip if .rpc( — stored procedures handle their own limits
      if (/\.rpc\s*\(/.test(chain)) continue;

      // Check for .select( — this is a read query
      if (/\.select\s*\(/.test(chain)) {
        if (!/\.limit\s*\(/.test(chain)) {
          const tableName = lines[i].match(/\.from\s*\(\s*['"]([^'"]+)['"]/)?.[1] || 'unknown';
          findings.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            type: 'supabase',
            snippet: `.from('${tableName}').select(...) — no .limit()`,
          });
        }
      }
    }
  }
}

// --- NDK fetchEvents without limit ---
console.log('--- NDK fetchEvents without limit in filter ---');

const allSrcFiles = walkDir(SRC_DIR, ['.ts', '.tsx']);

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (/fetchEvents\s*\(/.test(lines[i])) {
      // Gather context around the call (look back for filter definition)
      let context = '';
      const start = Math.max(0, i - 15);
      for (let j = start; j < Math.min(i + 10, lines.length); j++) {
        context += lines[j] + '\n';
      }

      // Check if limit appears in the surrounding filter definition
      if (!/limit\s*[:=]/.test(context) && !/limit\s*,/.test(context)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          type: 'ndk',
          snippet: lines[i].trim().slice(0, 100),
        });
      }
    }
  }
}

// Print all findings
for (const f of findings) {
  console.log(`[${f.type.toUpperCase()}] ${f.file}:${f.line}`);
  console.log(`        ${f.snippet}`);
}

console.log(`\n=== Summary: ${findings.length} unbounded query(s) found ===`);
process.exit(0);
