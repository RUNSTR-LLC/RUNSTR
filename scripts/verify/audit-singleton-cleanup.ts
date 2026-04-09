/**
 * Audit: Check singletons in src/services/ for cleanup methods and proper NDK usage.
 * Flags singletons without cleanup/disconnect/destroy methods.
 * Flags singletons that create their own NDK instance instead of using GlobalNDKService.
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_DIR = path.resolve(__dirname, '../../src/services');
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

interface Singleton {
  file: string;
  line: number;
  className: string;
  hasCleanup: boolean;
  cleanupCalledAnywhere: boolean;
  createsOwnNDK: boolean;
}

const CLEANUP_PATTERNS = [
  /\bcleanup\s*\(/,
  /\bdisconnect\s*\(/,
  /\bdestroy\s*\(/,
  /\bdispose\s*\(/,
  /\bshutdown\s*\(/,
  /\breset\s*\(/,
  /\bteardown\s*\(/,
];

const OWN_NDK_PATTERNS = [
  /new\s+NDK\s*\(/,
  /new\s+NostrRelayManager\s*\(/,
];

console.log('=== Singleton Cleanup Audit ===\n');

const serviceFiles = getAllFiles(SERVICES_DIR);
const allSrcFiles = getAllFiles(SRC_DIR);
const singletons: Singleton[] = [];

for (const file of serviceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const rel = path.relative(path.resolve(__dirname, '../..'), file);

  // Find static getInstance() pattern
  const getInstanceMatch = content.match(/static\s+getInstance\s*\(\)/);
  if (!getInstanceMatch) continue;

  // Extract class name
  const classMatch = content.match(/class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : path.basename(file, path.extname(file));

  // Find the line number of getInstance
  let instanceLine = 1;
  for (let i = 0; i < lines.length; i++) {
    if (/static\s+getInstance\s*\(\)/.test(lines[i])) {
      instanceLine = i + 1;
      break;
    }
  }

  // Check for cleanup methods
  const hasCleanup = CLEANUP_PATTERNS.some(p => p.test(content));

  // Check if cleanup is called anywhere in the codebase
  let cleanupCalledAnywhere = false;
  if (hasCleanup) {
    // Build patterns like ClassName.getInstance().cleanup() or instance.cleanup()
    const cleanupNames = ['cleanup', 'disconnect', 'destroy', 'dispose', 'shutdown', 'teardown'];
    for (const srcFile of allSrcFiles) {
      if (srcFile === file) continue;
      const srcContent = fs.readFileSync(srcFile, 'utf-8');
      for (const name of cleanupNames) {
        const pattern = new RegExp(`${className}[^;]*\\.${name}\\s*\\(`, 'i');
        if (pattern.test(srcContent)) {
          cleanupCalledAnywhere = true;
          break;
        }
      }
      if (cleanupCalledAnywhere) break;
    }
  }

  // Check if it creates its own NDK instance
  const createsOwnNDK = OWN_NDK_PATTERNS.some(p => p.test(content));

  singletons.push({
    file: rel,
    line: instanceLine,
    className,
    hasCleanup,
    cleanupCalledAnywhere,
    createsOwnNDK,
  });
}

// Report singletons without cleanup
const noCleanup = singletons.filter(s => !s.hasCleanup);
const unusedCleanup = singletons.filter(s => s.hasCleanup && !s.cleanupCalledAnywhere);
const ownNDK = singletons.filter(s => s.createsOwnNDK);

if (noCleanup.length > 0) {
  console.log('Singletons without cleanup/disconnect/destroy method:\n');
  for (const s of noCleanup) {
    console.log(`  [WARN] ${s.className} — ${s.file}:${s.line}`);
  }
  console.log('');
}

if (unusedCleanup.length > 0) {
  console.log('Singletons with cleanup method never called externally:\n');
  for (const s of unusedCleanup) {
    console.log(`  [WARN] ${s.className} — ${s.file}:${s.line}`);
  }
  console.log('');
}

if (ownNDK.length > 0) {
  console.log('Singletons creating their own NDK instance (should use GlobalNDKService):\n');
  for (const s of ownNDK) {
    console.log(`  [FAIL] ${s.className} — ${s.file}:${s.line}`);
  }
  console.log('');
}

if (noCleanup.length === 0 && unusedCleanup.length === 0 && ownNDK.length === 0) {
  console.log('All singletons have proper cleanup and NDK usage.\n');
}

console.log(`=== Summary: ${singletons.length} singletons, ${noCleanup.length} without cleanup, ${unusedCleanup.length} with unused cleanup, ${ownNDK.length} with own NDK ===`);
process.exit(0);
