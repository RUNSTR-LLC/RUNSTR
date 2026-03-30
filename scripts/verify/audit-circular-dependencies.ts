/**
 * Audit: Detect circular dependencies in src/services/.
 * Builds an import graph and finds cycles (direct and indirect).
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_DIR = path.resolve(__dirname, '../../src/services');

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

/**
 * Resolve a relative import path to an absolute file path.
 * Handles index files and missing extensions.
 */
function resolveImport(importPath: string, fromFile: string): string | null {
  if (!importPath.startsWith('.')) return null; // Skip package imports

  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, importPath);

  // Try exact match with extensions
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (fs.existsSync(resolved + ext)) return resolved + ext;
  }

  // Try as directory with index file
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const indexPath = path.join(resolved, 'index' + ext);
    if (fs.existsSync(indexPath)) return indexPath;
  }

  // Try exact path (already has extension)
  if (fs.existsSync(resolved)) return resolved;

  return null;
}

/**
 * Extract import paths from a file.
 */
function getImports(filepath: string): string[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const imports: string[] = [];

  // Match: import ... from '...' and import '...' and require('...')
  const importRegex = /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s+|require\s*\()['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

// Build import graph — only for files within services/
const files = getAllFiles(SERVICES_DIR);
const fileSet = new Set(files);
const graph = new Map<string, string[]>();

for (const file of files) {
  const imports = getImports(file);
  const resolvedImports: string[] = [];

  for (const imp of imports) {
    const resolved = resolveImport(imp, file);
    if (resolved && fileSet.has(resolved) && resolved !== file) {
      resolvedImports.push(resolved);
    }
  }

  graph.set(file, resolvedImports);
}

/**
 * DFS cycle detection. Finds all cycles reachable from any node.
 */
interface Cycle {
  chain: string[];
}

const cycles: Cycle[] = [];
const visited = new Set<string>();
const inStack = new Set<string>();
const stackPath: string[] = [];

function dfs(node: string): void {
  if (inStack.has(node)) {
    // Found a cycle — extract it
    const cycleStart = stackPath.indexOf(node);
    if (cycleStart !== -1) {
      const chain = [...stackPath.slice(cycleStart), node];
      cycles.push({ chain });
    }
    return;
  }

  if (visited.has(node)) return;

  visited.add(node);
  inStack.add(node);
  stackPath.push(node);

  const neighbors = graph.get(node) || [];
  for (const neighbor of neighbors) {
    dfs(neighbor);
  }

  stackPath.pop();
  inStack.delete(node);
}

for (const file of files) {
  if (!visited.has(file)) {
    dfs(file);
  }
}

// Deduplicate cycles (same set of files in different order)
function normalizeCycle(chain: string[]): string {
  // Remove the last element (duplicate of first), sort, join
  const nodes = chain.slice(0, -1);
  const minIdx = nodes.indexOf(nodes.reduce((a, b) => a < b ? a : b));
  const rotated = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
  return rotated.join(' -> ');
}

const uniqueCycles = new Map<string, string[]>();
for (const cycle of cycles) {
  const key = normalizeCycle(cycle.chain);
  if (!uniqueCycles.has(key)) {
    uniqueCycles.set(key, cycle.chain);
  }
}

const baseDir = path.resolve(__dirname, '../..');

console.log('=== Circular Dependency Audit ===\n');
console.log(`Files scanned: ${files.length}`);
console.log(`Import edges: ${[...graph.values()].reduce((sum, deps) => sum + deps.length, 0)}\n`);

if (uniqueCycles.size === 0) {
  console.log('No circular dependencies found.\n');
} else {
  console.log(`Circular dependencies:\n`);
  let i = 0;
  for (const [_, chain] of uniqueCycles) {
    i++;
    const relChain = chain.map(f => path.relative(baseDir, f));
    console.log(`  Cycle ${i}:`);
    console.log(`    ${relChain.join('\n    -> ')}`);
    console.log('');
  }
}

console.log(`=== Summary: ${uniqueCycles.size} circular dependency cycle(s) found ===`);
process.exit(0);
