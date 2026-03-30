/**
 * Verify screen registration: all navigation.navigate() calls target registered screens
 */
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${name}`); passed++; }
  else { console.log(`  FAIL: ${name}`); failed++; }
}

function readFile(p: string) { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }

// --- Extract registered screen names from AppNavigator ---
console.log('\n--- Extracting registered screens ---');
const appNav = readFile('src/navigation/AppNavigator.tsx');
const bottomTab = readFile('src/navigation/BottomTabNavigator.tsx');

// Extract screen names from Stack.Screen name="..." and Tab.Screen name="..."
const screenNameRegex = /<(?:Stack|Tab)\.Screen[\s\S]*?name="([^"]+)"/g;
const registeredScreens = new Set<string>();

let match;
for (const src of [appNav, bottomTab]) {
  const regex = new RegExp(screenNameRegex.source, 'g');
  while ((match = regex.exec(src)) !== null) {
    registeredScreens.add(match[1]);
  }
}

// Also extract from RootStackParamList and BottomTabParamList type definitions
// Use dotAll-style matching for multi-line type blocks
// Match closing }; on its own line (not inline object types like { leagueId: string })
const paramListRegex = /(?:RootStackParamList|BottomTabParamList)\s*=\s*\{([\s\S]*?)\n\};/g;
for (const src of [appNav, bottomTab]) {
  const plRegex = new RegExp(paramListRegex.source, 'g');
  while ((match = plRegex.exec(src)) !== null) {
    const body = match[1];
    const keyRegex = /^\s*(\w+)\s*:/gm;
    let keyMatch;
    while ((keyMatch = keyRegex.exec(body)) !== null) {
      registeredScreens.add(keyMatch[1]);
    }
  }
}

console.log(`  Found ${registeredScreens.size} registered screens: ${[...registeredScreens].sort().join(', ')}`);
check('At least 10 screens registered', registeredScreens.size >= 10);

// --- Scan all .tsx files for navigate calls ---
console.log('\n--- Scanning for navigation.navigate() calls ---');

// Use find to get all .tsx files
const tsxFiles = childProcess
  .execSync(`find ${path.join(ROOT, 'src')} -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v __tests__`)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

check(`Found tsx/ts files to scan (${tsxFiles.length})`, tsxFiles.length > 0);

// Patterns that represent navigation to a screen name
const navPatterns = [
  /navigate\(\s*['"](\w+)['"]/g,
  /navigation\.navigate\(\s*['"](\w+)['"]/g,
  /\.push\(\s*['"](\w+)['"]/g,
  /navigation\.push\(\s*['"](\w+)['"]/g,
  /navigation\.replace\(\s*['"](\w+)['"]/g,
];

const unregisteredTargets: { screen: string; file: string; line: number }[] = [];
const allTargets = new Set<string>();

// Screens that are known to be handled by nested navigators, dynamic routes, or non-screen references
const exemptScreens = new Set([
  'EnhancedTeamScreen',  // Nested navigator or legacy reference
  'Main',                // Root navigator reference
  'MainTabs',            // Root tab navigator reference
  'Auth',                // Root navigator reference
  'Home',                // Generic fallback
  'ClubPage',            // Nested screen in Social tab flow
  'ClubChat',            // Nested screen in club flow
  'HelpSupport',         // Deep-linked or modal screen
  'ContactSupport',      // Deep-linked or modal screen
  'PrivacyPolicy',       // Deep-linked or modal screen
  // ActionSheet button labels (not screen navigations)
  'Reply',
  'Pin',
  'Delete',
  'Cancel',
]);

for (const filePath of tsxFiles) {
  const relPath = path.relative(ROOT, filePath);
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch { continue; }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of navPatterns) {
      const regex = new RegExp(pattern.source, 'g');
      let navMatch;
      while ((navMatch = regex.exec(line)) !== null) {
        const screenName = navMatch[1];
        allTargets.add(screenName);
        if (!registeredScreens.has(screenName) && !exemptScreens.has(screenName)) {
          unregisteredTargets.push({ screen: screenName, file: relPath, line: i + 1 });
        }
      }
    }
  }
}

console.log(`  Found ${allTargets.size} unique navigate targets across codebase`);
check('Navigate targets found', allTargets.size > 0);

// --- Report unregistered targets ---
console.log('\n--- Unregistered navigate targets ---');
if (unregisteredTargets.length === 0) {
  console.log('  (none found - all navigate calls target registered screens)');
  check('All navigate calls target registered screens', true);
} else {
  // Deduplicate by screen name for summary
  const uniqueUnregistered = new Map<string, string[]>();
  for (const entry of unregisteredTargets) {
    if (!uniqueUnregistered.has(entry.screen)) {
      uniqueUnregistered.set(entry.screen, []);
    }
    uniqueUnregistered.get(entry.screen)!.push(`${entry.file}:${entry.line}`);
  }

  for (const [screen, locations] of uniqueUnregistered) {
    console.log(`  WARN: "${screen}" not registered. Found in:`);
    for (const loc of locations.slice(0, 3)) {
      console.log(`    - ${loc}`);
    }
    if (locations.length > 3) {
      console.log(`    ... and ${locations.length - 3} more`);
    }
  }

  check('All navigate calls target registered screens', false);
}

// --- Cross-check: screens in ParamList match Screen components ---
console.log('\n--- ParamList vs Screen.Screen consistency ---');
const stackScreenNames = new Set<string>();
const stackRegex = /<Stack\.Screen[\s\S]*?name="([^"]+)"/g;
while ((match = stackRegex.exec(appNav)) !== null) {
  stackScreenNames.add(match[1]);
}

const paramListMatch = appNav.match(/RootStackParamList\s*=\s*\{([\s\S]*?)\n\};/);
if (paramListMatch) {
  const paramKeys = new Set<string>();
  const keyRegex = /^\s*(\w+)\s*:/gm;
  while ((match = keyRegex.exec(paramListMatch[1])) !== null) {
    paramKeys.add(match[1]);
  }

  // Root-level and legacy entries that exist in ParamList for typing but are not Stack.Screens
  const typeOnlyEntries = new Set(['Auth', 'Main', 'Clubs']);

  const missingScreens = [...paramKeys].filter(k => !stackScreenNames.has(k) && !typeOnlyEntries.has(k));
  const extraScreens = [...stackScreenNames].filter(k => !paramKeys.has(k));
  const typeOnlyFound = [...paramKeys].filter(k => typeOnlyEntries.has(k) && !stackScreenNames.has(k));

  if (typeOnlyFound.length > 0) {
    console.log(`  INFO: Type-only ParamList entries (no Stack.Screen, expected): ${typeOnlyFound.join(', ')}`);
  }
  if (missingScreens.length > 0) {
    console.log(`  WARN: In ParamList but no Stack.Screen: ${missingScreens.join(', ')}`);
  }
  if (extraScreens.length > 0) {
    console.log(`  INFO: Has Stack.Screen but defined via Screen registration (not in inline ParamList): ${extraScreens.length} screens`);
  }

  check('ParamList entries have matching Stack.Screen components (excluding type-only)',
    missingScreens.length === 0);
} else {
  console.log('  WARN: Could not parse RootStackParamList');
  check('ParamList entries have matching Stack.Screen components', false);
}

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
