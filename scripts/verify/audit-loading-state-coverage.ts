/**
 * Audit: Loading State Coverage
 * Scans screen files for async data fetching without corresponding loading indicators.
 * Screens that fetch data in useEffect/useFocusEffect should show a loading state.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREENS_DIRS = [
  path.resolve(__dirname, '../../src/screens'),
  path.resolve(__dirname, '../../src/screens/activity'),
  path.resolve(__dirname, '../../src/screens/events'),
  path.resolve(__dirname, '../../src/screens/routes'),
  path.resolve(__dirname, '../../src/screens/satlantis'),
  path.resolve(__dirname, '../../src/screens/season2'),
];

const ASYNC_PATTERNS = [
  /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?await\s/,
  /useFocusEffect\s*\(\s*[\s\S]*?await\s/,
  /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\.then\s*\(/,
  /useFocusEffect\s*\(\s*[\s\S]*?\.then\s*\(/,
  /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?fetch\w*\s*\(/,
  /useFocusEffect\s*\(\s*[\s\S]*?fetch\w*\s*\(/,
  /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?load\w*\s*\(/,
  /useFocusEffect\s*\(\s*[\s\S]*?load\w*\s*\(/,
];

const LOADING_STATE_PATTERNS = [
  /loading/i,
  /isLoading/,
  /isInitializing/,
  /isFetching/,
];

const LOADING_UI_PATTERNS = [
  /ActivityIndicator/,
  /LoadingOverlay/,
  /LoadingState/,
  /loading.*\?/,
  /isLoading.*\?/,
  /isInitializing.*\?/,
  /isFetching.*\?/,
  /Skeleton/,
  /RefreshControl/,
];

function getScreenFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCREENS_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.tsx') && !file.startsWith('.')) {
        files.push(path.join(dir, file));
      }
    }
  }
  return files;
}

function hasAsyncFetching(content: string): boolean {
  return ASYNC_PATTERNS.some((p) => p.test(content));
}

function hasLoadingState(content: string): boolean {
  return LOADING_STATE_PATTERNS.some((p) => p.test(content));
}

function hasLoadingUI(content: string): boolean {
  return LOADING_UI_PATTERNS.some((p) => p.test(content));
}

const files = getScreenFiles();
let flaggedCount = 0;
let checkedCount = 0;

console.log('=== Loading State Coverage Audit ===\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(path.resolve(__dirname, '../..'), file);

  if (!hasAsyncFetching(content)) continue;

  checkedCount++;
  const hasState = hasLoadingState(content);
  const hasUI = hasLoadingUI(content);

  if (!hasState || !hasUI) {
    flaggedCount++;
    const issues: string[] = [];
    if (!hasState) issues.push('no loading state variable');
    if (!hasUI) issues.push('no loading indicator in JSX');
    console.log(`FLAG: ${relPath} -- ${issues.join(', ')}`);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Screens with async fetching: ${checkedCount}`);
console.log(`Missing loading coverage: ${flaggedCount}`);
console.log(`Coverage: ${checkedCount > 0 ? Math.round(((checkedCount - flaggedCount) / checkedCount) * 100) : 100}%`);

process.exit(0);
