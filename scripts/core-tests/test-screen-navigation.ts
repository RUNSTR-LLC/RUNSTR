/**
 * Test: Screen Navigation Integrity
 * Run: npx tsx scripts/core-tests/test-screen-navigation.ts
 *
 * Verifies every navigation.navigate() call in the codebase references
 * a real screen registered in one of the navigators:
 * 1. Extracts all registered screen names from App.tsx, AppNavigator.tsx, BottomTabNavigator.tsx
 * 2. Scans all .tsx files for navigate() calls
 * 3. Reports any navigate target that does not exist in any navigator
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Source paths
// ---------------------------------------------------------------------------

const srcRoot = path.join(__dirname, '../../src');
const appTsxPath = path.join(srcRoot, 'App.tsx');
const appNavigatorPath = path.join(srcRoot, 'navigation/AppNavigator.tsx');
const bottomTabPath = path.join(srcRoot, 'navigation/BottomTabNavigator.tsx');

// ---------------------------------------------------------------------------
// Step 1: Extract all registered screen names
// ---------------------------------------------------------------------------

function extractScreenNames(filePath: string, label: string): Set<string> {
  const src = fs.readFileSync(filePath, 'utf8');
  const screens = new Set<string>();

  // Match name="ScreenName" or name={'ScreenName'}
  const nameRegex = /name=["']([^"']+)["']/g;
  let match;
  while ((match = nameRegex.exec(src)) !== null) {
    screens.add(match[1]);
  }

  return screens;
}

function getAllRegisteredScreens(): Set<string> {
  const all = new Set<string>();

  const sources = [
    { path: appTsxPath, label: 'App.tsx (AuthenticatedStack)' },
    { path: appNavigatorPath, label: 'AppNavigator.tsx (Stack)' },
    { path: bottomTabPath, label: 'BottomTabNavigator.tsx (Tab)' },
  ];

  for (const source of sources) {
    if (!fs.existsSync(source.path)) {
      console.log(`  SKIP: ${source.label} not found`);
      continue;
    }
    const screens = extractScreenNames(source.path, source.label);
    for (const s of screens) {
      all.add(s);
    }
  }

  return all;
}

// ---------------------------------------------------------------------------
// Step 2: Scan all .tsx files for navigate() calls
// ---------------------------------------------------------------------------

interface NavigateCall {
  screenName: string;
  file: string;
  line: number;
}

function findTsxFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and hidden dirs
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        walk(fullPath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function extractNavigateCalls(filePath: string): NavigateCall[] {
  const src = fs.readFileSync(filePath, 'utf8');
  const calls: NavigateCall[] = [];
  const lines = src.split('\n');

  // Patterns to match:
  // navigation.navigate('ScreenName')
  // navigation.navigate("ScreenName")
  // navigate('ScreenName')
  // navigate("ScreenName")
  // .navigate('ScreenName')
  const navigateRegex = /\.?navigate\(\s*['"]([^'"]+)['"]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    // Reset lastIndex since we reuse the regex
    navigateRegex.lastIndex = 0;
    while ((match = navigateRegex.exec(line)) !== null) {
      calls.push({
        screenName: match[1],
        file: filePath,
        line: i + 1,
      });
    }
  }

  return calls;
}

// ---------------------------------------------------------------------------
// Test 1: Navigator files exist
// ---------------------------------------------------------------------------

function testNavigatorFilesExist() {
  console.log('\n=== Navigator file existence ===\n');

  assert('App.tsx exists', fs.existsSync(appTsxPath));
  assert('AppNavigator.tsx exists', fs.existsSync(appNavigatorPath));
  assert('BottomTabNavigator.tsx exists', fs.existsSync(bottomTabPath));
}

// ---------------------------------------------------------------------------
// Test 2: Registered screens
// ---------------------------------------------------------------------------

function testRegisteredScreens() {
  console.log('\n=== Registered screens ===\n');

  const screens = getAllRegisteredScreens();

  assert(
    `Found ${screens.size} registered screens`,
    screens.size > 10,
    `Found: ${[...screens].join(', ')}`
  );

  // Key screens that must exist
  const required = [
    'Profile', 'Clubs', 'Events', 'Settings',
    'WorkoutHistory', 'Rewards', 'Teams',
    'Exercise', 'Compete', 'Leaderboards',
    'MainTabs', 'ProfileEdit',
  ];

  for (const screen of required) {
    assert(
      `Required screen "${screen}" is registered`,
      screens.has(screen)
    );
  }
}

// ---------------------------------------------------------------------------
// Test 3: All navigate() calls reference valid screens
// ---------------------------------------------------------------------------

function testNavigateCallsValid() {
  console.log('\n=== navigate() call validation ===\n');

  const registeredScreens = getAllRegisteredScreens();
  const tsxFiles = findTsxFiles(srcRoot);

  assert(
    `Found ${tsxFiles.length} source files to scan`,
    tsxFiles.length > 0
  );

  const allCalls: NavigateCall[] = [];
  for (const file of tsxFiles) {
    const calls = extractNavigateCalls(file);
    allCalls.push(...calls);
  }

  assert(
    `Found ${allCalls.length} navigate() calls across codebase`,
    allCalls.length > 0
  );

  // Group by screen name for cleaner output
  const callsByScreen = new Map<string, NavigateCall[]>();
  for (const call of allCalls) {
    if (!callsByScreen.has(call.screenName)) {
      callsByScreen.set(call.screenName, []);
    }
    callsByScreen.get(call.screenName)!.push(call);
  }

  // Check each unique screen name
  const invalidScreens: string[] = [];
  const validScreens: string[] = [];

  for (const [screenName, calls] of callsByScreen) {
    const isValid = registeredScreens.has(screenName);
    const relativePath = path.relative(srcRoot, calls[0].file);
    const locations = calls
      .map((c) => `${path.relative(srcRoot, c.file)}:${c.line}`)
      .slice(0, 3) // Show up to 3 locations
      .join(', ');

    if (isValid) {
      validScreens.push(screenName);
      assert(
        `navigate("${screenName}") -> valid (${calls.length} call${calls.length > 1 ? 's' : ''}: ${locations})`,
        true
      );
    } else {
      invalidScreens.push(screenName);
      assert(
        `navigate("${screenName}") -> INVALID (${calls.length} call${calls.length > 1 ? 's' : ''}: ${locations})`,
        false,
        `Screen "${screenName}" not found in any navigator`
      );
    }
  }

  console.log(`\n  Summary: ${validScreens.length} valid targets, ${invalidScreens.length} invalid targets`);
}

// ---------------------------------------------------------------------------
// Test 4: Screens imported but not registered (dead code detection)
// ---------------------------------------------------------------------------

function testScreenImportConsistency() {
  console.log('\n=== Screen import consistency ===\n');

  // Check AppNavigator.tsx imports vs registrations
  const navigatorSrc = fs.readFileSync(appNavigatorPath, 'utf8');
  const navigatorScreens = extractScreenNames(appNavigatorPath, 'AppNavigator');

  // Extract imported screen components
  const importRegex = /import\s+\{?\s*(\w+Screen)\s*\}?\s+from/g;
  const importedScreens = new Set<string>();
  let match;
  while ((match = importRegex.exec(navigatorSrc)) !== null) {
    importedScreens.add(match[1]);
  }

  // Check if imported screens are actually used in registrations
  let unusedCount = 0;
  for (const imported of importedScreens) {
    // Check if the imported component appears in a Screen registration
    const isUsed = navigatorSrc.includes(`component={${imported}}`)
      || navigatorSrc.includes(`<${imported}`)
      || navigatorSrc.includes(`${imported} `)
      || navigatorSrc.includes(`${imported}(`);

    if (!isUsed) {
      unusedCount++;
      // This is a warning, not a failure
      console.log(`  WARN: ${imported} imported but may not be registered in AppNavigator`);
    }
  }

  assert(
    `AppNavigator imports ${importedScreens.size} screen components`,
    importedScreens.size > 0
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Screen Navigation Integrity Tests ===');

  testNavigatorFilesExist();
  testRegisteredScreens();
  testNavigateCallsValid();
  testScreenImportConsistency();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
