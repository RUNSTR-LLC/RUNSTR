#!/usr/bin/env npx tsx

/**
 * Pre-Launch Automated Audit Script
 *
 * This script performs automated checks on the RUNSTR codebase to identify
 * quick, high-impact improvements before launch.
 *
 * Usage: npx tsx scripts/preLaunchAudit.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  issue: string;
  recommendation: string;
}

const results: AuditResult[] = [];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(result: AuditResult) {
  results.push(result);
}

// Helper to read file content
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Helper to find files matching pattern
function findFiles(dir: string, pattern: RegExp, exclude: string[] = []): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip excluded directories
      if (exclude.some(ex => fullPath.includes(ex))) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// ============================================================================
// AUDIT 1: Missing Error Boundaries
// ============================================================================
function auditErrorBoundaries() {
  log('\n🔍 Auditing Error Boundaries...', 'blue');

  const screenFiles = findFiles('src/screens', /\.(tsx|ts)$/, ['node_modules']);
  const componentFiles = findFiles('src/components', /\.(tsx|ts)$/, ['node_modules']);

  const criticalFiles = [
    ...screenFiles,
    'src/contexts/AuthContext.tsx',
    'src/App.tsx',
  ];

  criticalFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Check if file has async operations but no try-catch
    const hasAsync = /async\s+\w+\s*\(/.test(content) || /await\s+/.test(content);
    const hasTryCatch = /try\s*{/.test(content);
    const hasErrorBoundary = /ErrorBoundary/.test(content);

    if (hasAsync && !hasTryCatch && !hasErrorBoundary) {
      addResult({
        category: 'Error Handling',
        severity: 'high',
        file,
        issue: 'Async operations without error handling',
        recommendation: 'Add try-catch blocks around async operations or wrap component in ErrorBoundary',
      });
    }
  });
}

// ============================================================================
// AUDIT 2: Missing Loading States
// ============================================================================
function auditLoadingStates() {
  log('🔍 Auditing Loading States...', 'blue');

  const screenFiles = findFiles('src/screens', /\.(tsx|ts)$/, ['node_modules']);

  screenFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Check if screen fetches data but has no loading state
    const hasFetchOrQuery = /fetchEvents|ndk\.subscribe|ndk\.query|AsyncStorage\.getItem/.test(content);
    const hasLoadingState = /loading|isLoading|Loading/.test(content);
    const hasActivityIndicator = /ActivityIndicator/.test(content);

    if (hasFetchOrQuery && !hasLoadingState && !hasActivityIndicator) {
      addResult({
        category: 'User Experience',
        severity: 'high',
        file,
        issue: 'Data fetching without loading indicator',
        recommendation: 'Add loading state and ActivityIndicator while fetching data',
      });
    }
  });
}

// ============================================================================
// AUDIT 3: Memory Leaks (useEffect cleanup)
// ============================================================================
function auditMemoryLeaks() {
  log('🔍 Auditing Memory Leaks (useEffect cleanup)...', 'blue');

  const files = findFiles('src', /\.(tsx|ts)$/, ['node_modules']);

  // Match a return statement that yields cleanup-shaped value:
  //   return () => { ... }      ← arrow lambda
  //   return unsubscribe;        ← bound function ref
  //   return unsubscribe         ← bound function ref (no semicolon)
  //   return someFunction();     ← function call returning cleanup
  // Negative space (NOT a cleanup): bare `return;`, `return null;`, `return data;` after early-exit
  const cleanupReturnRegex = /^\s*return\s+(?:\(.*?\)\s*=>|\w+\s*[;\n]|\w+\.\w+\s*[;\n]|\w+\(\)\s*[;\n])/;

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (!line.includes('useEffect')) return;

      const effectStart = index;
      let bracketCount = 0;
      let hasReturn = false;
      let hasSubscription = false;
      let started = false;

      for (let i = effectStart; i < Math.min(effectStart + 80, lines.length); i++) {
        const currentLine = lines[i];
        const opens = (currentLine.match(/{/g) || []).length;
        const closes = (currentLine.match(/}/g) || []).length;
        bracketCount += opens - closes;
        if (opens > 0) started = true;

        // Detect subscription-style call inside the effect body
        if (
          /\.subscribe\b|addEventListener\b|addListener\b|onStateChange\b|onSnapshot\b/.test(
            currentLine
          )
        ) {
          hasSubscription = true;
        }

        // Detect any cleanup-shaped return inside the effect body
        if (cleanupReturnRegex.test(currentLine)) {
          hasReturn = true;
        }

        if (started && bracketCount === 0 && i > effectStart) {
          break;
        }
      }

      if (hasSubscription && !hasReturn) {
        addResult({
          category: 'Memory Leaks',
          severity: 'critical',
          file,
          line: effectStart + 1,
          issue: 'useEffect with subscription but no cleanup function',
          recommendation: 'Add return () => { /* cleanup subscription */ } or return unsubscribe',
        });
      }
    });
  });
}

// ============================================================================
// AUDIT 4: Hardcoded Colors
// ============================================================================
function auditHardcodedColors() {
  log('🔍 Auditing Hardcoded Colors...', 'blue');

  const files = findFiles('src/components', /\.(tsx|ts)$/, ['node_modules']);

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for hex colors or rgb values in styles
      const hexColorMatch = line.match(/#[0-9A-Fa-f]{3,6}/g);
      const rgbMatch = line.match(/rgb\([^)]+\)/g);

      // Ignore if it's importing from theme
      const isThemeImport = line.includes('from') && line.includes('theme');
      const isInComment = line.trim().startsWith('//') || line.trim().startsWith('*');

      if ((hexColorMatch || rgbMatch) && !isThemeImport && !isInComment) {
        addResult({
          category: 'UI Consistency',
          severity: 'medium',
          file,
          line: index + 1,
          issue: `Hardcoded color found: ${hexColorMatch?.[0] || rgbMatch?.[0]}`,
          recommendation: 'Use theme colors from src/styles/theme.ts',
        });
      }
    });
  });
}

// ============================================================================
// AUDIT 5: Console.log in Production
// ============================================================================
function auditConsoleLogs() {
  log('🔍 Auditing Console Logs...', 'blue');

  const files = findFiles('src', /\.(tsx|ts)$/, ['node_modules', '__tests__']);

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.includes('console.log') || line.includes('console.warn')) {
        // Ignore commented lines
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

        addResult({
          category: 'Production Readiness',
          severity: 'low',
          file,
          line: index + 1,
          issue: 'Console.log statement found',
          recommendation: 'Remove or wrap in __DEV__ check',
        });
      }
    });
  });
}

// ============================================================================
// AUDIT 6: AsyncStorage without Error Handling
// ============================================================================
function auditAsyncStorage() {
  log('🔍 Auditing AsyncStorage Error Handling...', 'blue');

  const files = findFiles('src', /\.(tsx|ts)$/, ['node_modules']);

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.includes('AsyncStorage.getItem') || line.includes('AsyncStorage.setItem')) {
        // Check if within try-catch (look 10 lines before)
        const contextLines = lines.slice(Math.max(0, index - 10), index + 1);
        const hasTryCatch = contextLines.some(l => l.includes('try {'));

        if (!hasTryCatch) {
          addResult({
            category: 'Error Handling',
            severity: 'medium',
            file,
            line: index + 1,
            issue: 'AsyncStorage operation without try-catch',
            recommendation: 'Wrap AsyncStorage operations in try-catch blocks',
          });
        }
      }
    });
  });
}

// ============================================================================
// AUDIT 7: Unbounded Nostr Queries
// ============================================================================
function auditNostrQueries() {
  log('🔍 Auditing Nostr Queries for Performance...', 'blue');

  const files = findFiles('src/services', /\.(tsx|ts)$/, ['node_modules']);

  // Inline filter literal: fetchEvents({ ... }) or fetchEvents([{...}])
  const inlineFilterRegex = /fetchEvents\s*\(\s*[\[{]/;
  // Wrapper-style call: fetchEvents(varName), where varName is bounded by the caller
  const wrapperCallRegex = /fetchEvents\s*\(\s*[a-zA-Z_$][\w$]*\s*[,)]/;
  // Type signature definitions (parameter typing) — skip
  const typeSignatureRegex = /:\s*NDKFilter|filter\s*:\s*NDKFilter/;

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (!/\bfetchEvents\b/.test(line)) return;
      if (typeSignatureRegex.test(line)) return; // type annotations, not calls
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

      // Only inspect calls whose argument is an inline filter object/array.
      // If the argument is a variable, the caller is responsible for bounding it
      // — flagging it here produces false positives for wrapper functions.
      if (!inlineFilterRegex.test(line)) {
        // Confirm it's a wrapper-style call (skip silently) vs something we can't classify
        if (wrapperCallRegex.test(line)) return;
        return; // unclassifiable — don't flag
      }

      // For inline filter literals, scan forward up to the closing paren of the call
      const contextLines = lines.slice(index, Math.min(index + 20, lines.length));
      const contextStr = contextLines.join('\n');

      const hasLimit = /\blimit\s*:\s*\d+/.test(contextStr);
      const hasSince = /\bsince\s*:/.test(contextStr);
      const hasUntil = /\buntil\s*:/.test(contextStr);
      const hasIds = /\bids\s*:\s*\[/.test(contextStr); // ids:[...] is inherently bounded
      const hasAuthorsList = /\bauthors\s*:\s*\[/.test(contextStr); // authors list is bounded by length

      if (!hasLimit && !hasSince && !hasUntil && !hasIds && !hasAuthorsList) {
        addResult({
          category: 'Performance',
          severity: 'high',
          file,
          line: index + 1,
          issue: 'Unbounded Nostr query (no limit/since/until/ids/authors)',
          recommendation: 'Add limit, since, until, or scope by ids/authors to bound the result set',
        });
      }
    });
  });
}

// ============================================================================
// AUDIT 8: Missing Empty States
// ============================================================================
function auditEmptyStates() {
  log('🔍 Auditing Empty States...', 'blue');

  const screenFiles = findFiles('src/screens', /\.(tsx|ts)$/, ['node_modules']);

  screenFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Check if screen renders lists but has no empty state
    const hasFlatList = /FlatList|ScrollView/.test(content);
    const hasEmptyState = /empty|Empty|no.*found|No.*found/i.test(content);
    const hasListEmptyComponent = /ListEmptyComponent/.test(content);

    if (hasFlatList && !hasEmptyState && !hasListEmptyComponent) {
      addResult({
        category: 'User Experience',
        severity: 'medium',
        file,
        issue: 'List without empty state message',
        recommendation: 'Add ListEmptyComponent or conditional empty state message',
      });
    }
  });
}

// ============================================================================
// Report Generation
// ============================================================================
function generateReport() {
  log('\n📊 Generating Report...', 'green');

  const critical = results.filter(r => r.severity === 'critical');
  const high = results.filter(r => r.severity === 'high');
  const medium = results.filter(r => r.severity === 'medium');
  const low = results.filter(r => r.severity === 'low');

  console.log('\n' + '='.repeat(80));
  log('  RUNSTR PRE-LAUNCH AUDIT REPORT', 'green');
  console.log('='.repeat(80));

  console.log('\n📈 Summary:');
  log(`  🔴 Critical Issues: ${critical.length}`, critical.length > 0 ? 'red' : 'green');
  log(`  🟠 High Priority:   ${high.length}`, high.length > 0 ? 'yellow' : 'green');
  log(`  🟡 Medium Priority: ${medium.length}`, 'yellow');
  log(`  🟢 Low Priority:    ${low.length}`, 'gray');
  log(`  📊 Total Issues:    ${results.length}`, 'blue');

  // Print critical issues
  if (critical.length > 0) {
    console.log('\n' + '─'.repeat(80));
    log('🔴 CRITICAL ISSUES (Fix Before Launch)', 'red');
    console.log('─'.repeat(80));
    critical.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.category}: ${issue.issue}`);
      log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`, 'gray');
      log(`   Fix:  ${issue.recommendation}`, 'yellow');
    });
  }

  // Print high priority issues
  if (high.length > 0) {
    console.log('\n' + '─'.repeat(80));
    log('🟠 HIGH PRIORITY (Quick Wins)', 'yellow');
    console.log('─'.repeat(80));
    high.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.category}: ${issue.issue}`);
      log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`, 'gray');
      log(`   Fix:  ${issue.recommendation}`, 'yellow');
    });
  }

  // Summary recommendations
  console.log('\n' + '─'.repeat(80));
  log('💡 RECOMMENDATIONS', 'blue');
  console.log('─'.repeat(80));

  if (critical.length === 0 && high.length === 0) {
    log('✅ No critical or high-priority issues found! App is launch-ready.', 'green');
  } else if (critical.length > 0) {
    log('⚠️  Fix all critical issues before launch.', 'red');
  } else {
    log('✅ No critical issues. Consider fixing high-priority items if time allows.', 'yellow');
  }

  console.log('\n' + '='.repeat(80));

  // Write detailed report to file
  const reportPath = 'AUDIT_REPORT.md';
  const reportContent = generateMarkdownReport(critical, high, medium, low);
  fs.writeFileSync(reportPath, reportContent);
  log(`\n📄 Detailed report written to: ${reportPath}`, 'green');
}

function generateMarkdownReport(
  critical: AuditResult[],
  high: AuditResult[],
  medium: AuditResult[],
  low: AuditResult[]
): string {
  const date = new Date().toISOString().split('T')[0];

  let md = `# RUNSTR Pre-Launch Audit Report\n\n`;
  md += `**Date**: ${date}\n\n`;
  md += `## Summary\n\n`;
  md += `- 🔴 Critical: ${critical.length}\n`;
  md += `- 🟠 High: ${high.length}\n`;
  md += `- 🟡 Medium: ${medium.length}\n`;
  md += `- 🟢 Low: ${low.length}\n`;
  md += `- **Total**: ${results.length}\n\n`;

  if (critical.length > 0) {
    md += `## 🔴 Critical Issues\n\n`;
    critical.forEach((issue, i) => {
      md += `### ${i + 1}. ${issue.category}: ${issue.issue}\n\n`;
      md += `- **File**: \`${issue.file}\`${issue.line ? `:${issue.line}` : ''}\n`;
      md += `- **Fix**: ${issue.recommendation}\n\n`;
    });
  }

  if (high.length > 0) {
    md += `## 🟠 High Priority Issues\n\n`;
    high.forEach((issue, i) => {
      md += `### ${i + 1}. ${issue.category}: ${issue.issue}\n\n`;
      md += `- **File**: \`${issue.file}\`${issue.line ? `:${issue.line}` : ''}\n`;
      md += `- **Fix**: ${issue.recommendation}\n\n`;
    });
  }

  if (medium.length > 0) {
    md += `## 🟡 Medium Priority Issues\n\n`;
    md += `<details>\n<summary>Click to expand (${medium.length} issues)</summary>\n\n`;
    medium.forEach((issue, i) => {
      md += `${i + 1}. **${issue.category}**: ${issue.issue} - \`${issue.file}\`\n`;
    });
    md += `\n</details>\n\n`;
  }

  if (low.length > 0) {
    md += `## 🟢 Low Priority Issues\n\n`;
    md += `<details>\n<summary>Click to expand (${low.length} issues)</summary>\n\n`;
    low.forEach((issue, i) => {
      md += `${i + 1}. **${issue.category}**: ${issue.issue} - \`${issue.file}\`\n`;
    });
    md += `\n</details>\n\n`;
  }

  return md;
}

// ============================================================================
// Main Execution
// ============================================================================
async function main() {
  log('\n🚀 Starting RUNSTR Pre-Launch Audit...', 'green');
  log('This will analyze your codebase for quick, high-impact improvements.\n', 'gray');

  try {
    auditErrorBoundaries();
    auditLoadingStates();
    auditMemoryLeaks();
    auditHardcodedColors();
    auditConsoleLogs();
    auditAsyncStorage();
    auditNostrQueries();
    auditEmptyStates();

    generateReport();

    log('\n✅ Audit complete!', 'green');

    // Exit with error code if critical issues found
    const criticalCount = results.filter(r => r.severity === 'critical').length;
    if (criticalCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Audit failed: ${error}`, 'red');
    process.exit(1);
  }
}

main();
