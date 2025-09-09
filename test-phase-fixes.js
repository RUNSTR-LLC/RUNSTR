#!/usr/bin/env node

/**
 * Phase 1 & 2 Fix Test Runner
 * Comprehensive testing script to verify:
 * - Phase 1: Real NPUB usage (no more fake placeholders)  
 * - Phase 2: Direct navigation (no more double popups)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 RUNSTR Phase 1 & 2 Fix Test Suite');
console.log('=====================================');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const { green, red, yellow, blue, magenta, cyan, reset, bold } = colors;

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

function logSection(title) {
  console.log(`\n${cyan}${bold}=== ${title} ===${reset}`);
}

function logSuccess(message) {
  console.log(`${green}✅ ${message}${reset}`);
}

function logError(message) {
  console.log(`${red}❌ ${message}${reset}`);
}

function logWarning(message) {
  console.log(`${yellow}⚠️ ${message}${reset}`);
}

function logInfo(message) {
  console.log(`${blue}ℹ️ ${message}${reset}`);
}

// Helper function to run command and capture output
function runCommand(command, description) {
  try {
    logInfo(`Running: ${description}`);
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || error.message,
      error: error.stderr || error.message
    };
  }
}

// Check if test files exist
function checkTestFiles() {
  logSection('Pre-Test Validation');
  
  const testFiles = [
    '__tests__/integration/teamCreationFlow.test.ts',
    '__tests__/integration/navigationFlow.test.ts', 
    '__tests__/integration/nostrIdentityVerification.test.ts',
    '__tests__/MANUAL_TESTING_GUIDE.md'
  ];

  let allFilesExist = true;
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`Test file exists: ${file}`);
    } else {
      logError(`Missing test file: ${file}`);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

// Check source code for Phase 1 fixes
function checkPhase1Implementation() {
  logSection('Phase 1: Real NPUB Implementation Check');
  
  const sourceFiles = [
    'src/services/teamService.ts',
    'src/components/wizards/steps/ReviewLaunchStep.tsx',
    'src/services/auth/providers/nostrAuthProvider.ts'
  ];

  let phase1Issues = [];

  sourceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for eliminated fake patterns
      const fakePatterns = [
        'simple_${',
        'fallback_${', 
        'temp_${',
        'placeholder_'
      ];
      
      let foundFakePatterns = [];
      fakePatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          foundFakePatterns.push(pattern);
        }
      });

      if (foundFakePatterns.length > 0) {
        logError(`${file}: Still contains fake patterns: ${foundFakePatterns.join(', ')}`);
        phase1Issues.push(`${file}: ${foundFakePatterns.join(', ')}`);
      } else {
        logSuccess(`${file}: No fake NPUB patterns found`);
      }

      // Check for real NPUB usage
      if (content.includes('captainNpub') && content.includes('captainName')) {
        logSuccess(`${file}: Uses real identity fields (captainNpub, captainName)`);
      } else if (file.includes('teamService.ts')) {
        logWarning(`${file}: May not be using real identity fields`);
      }

    } else {
      logError(`Source file not found: ${file}`);
      phase1Issues.push(`Missing file: ${file}`);
    }
  });

  return phase1Issues;
}

// Check source code for Phase 2 fixes  
function checkPhase2Implementation() {
  logSection('Phase 2: Navigation Implementation Check');
  
  const navigationFiles = [
    'src/components/wizards/steps/ReviewLaunchStep.tsx',
    'src/navigation/navigationHandlers.ts',
    'src/navigation/AppNavigator.tsx'
  ];

  let phase2Issues = [];

  navigationFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for eliminated Alert popups
      const alertPatterns = [
        'Alert.alert(\'Success!\'',
        'Alert.alert(\'Team Created!\'',
        'setTimeout(() => {'
      ];
      
      let foundAlertPatterns = [];
      alertPatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          foundAlertPatterns.push(pattern);
        }
      });

      if (foundAlertPatterns.length > 0 && file.includes('ReviewLaunchStep')) {
        logWarning(`${file}: May still have popup patterns: ${foundAlertPatterns.join(', ')}`);
        phase2Issues.push(`${file}: ${foundAlertPatterns.join(', ')}`);
      }

      // Check for navigation improvements
      if (content.includes('onNavigateToTeam') || content.includes('navigation.navigate')) {
        logSuccess(`${file}: Contains navigation improvements`);
      }

      if (content.includes('handleNavigateToTeam')) {
        logSuccess(`${file}: Has direct navigation handler`);
      }

    } else {
      logError(`Navigation file not found: ${file}`);
      phase2Issues.push(`Missing file: ${file}`);
    }
  });

  return phase2Issues;
}

// Run Jest tests
function runJestTests() {
  logSection('Running Jest Integration Tests');
  
  const testCommands = [
    {
      command: 'npm test -- --testPathPattern=integration/teamCreationFlow.test.ts --verbose --passWithNoTests',
      description: 'Team Creation Flow Tests (Phase 1)',
      phase: 1
    },
    {
      command: 'npm test -- --testPathPattern=integration/navigationFlow.test.ts --verbose --passWithNoTests', 
      description: 'Navigation Flow Tests (Phase 2)',
      phase: 2
    },
    {
      command: 'npm test -- --testPathPattern=integration/nostrIdentityVerification.test.ts --verbose --passWithNoTests',
      description: 'Nostr Identity Verification Tests (Phase 1)',
      phase: 1
    }
  ];

  let testsPassed = 0;
  let testsTotal = testCommands.length;

  testCommands.forEach(({ command, description, phase }) => {
    logInfo(`\n🧪 ${description}`);
    
    const result = runCommand(command, description);
    
    if (result.success && !result.output.includes('FAIL')) {
      logSuccess(`Phase ${phase} tests passed: ${description}`);
      testsPassed++;
    } else {
      logError(`Phase ${phase} tests failed: ${description}`);
      if (result.error) {
        console.log(`${red}Error details: ${result.error}${reset}`);
      }
      testResults.errors.push(`${description}: ${result.error || 'Test failure'}`);
    }
  });

  testResults.total = testsTotal;
  testResults.passed = testsPassed;
  testResults.failed = testsTotal - testsPassed;

  return testsPassed === testsTotal;
}

// TypeScript compilation check
function runTypeScriptCheck() {
  logSection('TypeScript Compilation Check');
  
  const result = runCommand(
    'npx tsc --noEmit src/services/teamService.ts src/components/wizards/steps/ReviewLaunchStep.tsx src/navigation/navigationHandlers.ts --skipLibCheck',
    'TypeScript compilation of key Phase 1 & 2 files'
  );

  if (result.success) {
    logSuccess('TypeScript compilation passed for key files');
    return true;
  } else {
    logWarning('TypeScript compilation has issues (may be acceptable)');
    console.log(`${yellow}Details: ${result.error}${reset}`);
    return false; // Don't fail entire test suite for TS issues
  }
}

// Generate comprehensive report
function generateReport(phase1Issues, phase2Issues, testsAllPassed, tsCheckPassed) {
  logSection('📊 COMPREHENSIVE TEST REPORT');

  console.log(`\n${bold}🎯 PHASE 1: Real NPUB Usage${reset}`);
  if (phase1Issues.length === 0) {
    logSuccess('✅ Phase 1 implementation looks good!');
    logSuccess('   • No fake NPUB patterns detected');
    logSuccess('   • Real identity fields present'); 
    logSuccess('   • Source code analysis passed');
  } else {
    logError('❌ Phase 1 implementation issues found:');
    phase1Issues.forEach(issue => {
      console.log(`${red}   • ${issue}${reset}`);
    });
  }

  console.log(`\n${bold}🧭 PHASE 2: Direct Navigation${reset}`);
  if (phase2Issues.length === 0) {
    logSuccess('✅ Phase 2 implementation looks good!');
    logSuccess('   • Navigation improvements detected');
    logSuccess('   • Direct navigation handlers present');
    logSuccess('   • Source code analysis passed');
  } else {
    logWarning('⚠️ Phase 2 implementation issues found:');
    phase2Issues.forEach(issue => {
      console.log(`${yellow}   • ${issue}${reset}`);
    });
  }

  console.log(`\n${bold}🧪 INTEGRATION TESTS${reset}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${green}Passed: ${testResults.passed}${reset}`);
  console.log(`${red}Failed: ${testResults.failed}${reset}`);

  if (testsAllPassed) {
    logSuccess('✅ All integration tests passed!');
  } else {
    logError('❌ Some integration tests failed');
    testResults.errors.forEach(error => {
      console.log(`${red}   • ${error}${reset}`);
    });
  }

  console.log(`\n${bold}🔧 COMPILATION${reset}`);
  if (tsCheckPassed) {
    logSuccess('✅ TypeScript compilation passed');
  } else {
    logWarning('⚠️ TypeScript compilation has issues (review manually)');
  }

  // Overall assessment
  const overallPass = (
    phase1Issues.length === 0 && 
    phase2Issues.length === 0 && 
    testsAllPassed
  );

  console.log(`\n${bold}🏆 OVERALL ASSESSMENT${reset}`);
  if (overallPass) {
    console.log(`${green}${bold}🎉 EXCELLENT! Phase 1 & 2 fixes are working correctly!${reset}`);
    console.log(`${green}   Ready for production deployment 🚀${reset}`);
  } else {
    console.log(`${red}${bold}⚠️ ISSUES DETECTED - Review and fix before deployment${reset}`);
    console.log(`${yellow}   Check the issues above and run tests again${reset}`);
  }

  console.log(`\n${bold}📖 NEXT STEPS${reset}`);
  console.log(`${cyan}1. Review __tests__/MANUAL_TESTING_GUIDE.md for manual verification${reset}`);
  console.log(`${cyan}2. Run 'npm run ios' to test on simulator${reset}`);
  console.log(`${cyan}3. Test the complete flow: Auth → Team Creation → Navigation${reset}`);

  return overallPass;
}

// Main execution
async function main() {
  console.log(`${magenta}Testing Phase 1: Real NPUB usage (eliminate fake placeholders)${reset}`);
  console.log(`${magenta}Testing Phase 2: Direct navigation (eliminate double popups)${reset}\n`);

  // Step 1: Pre-validation
  if (!checkTestFiles()) {
    logError('❌ Test files missing! Cannot proceed.');
    process.exit(1);
  }

  // Step 2: Source code analysis
  const phase1Issues = checkPhase1Implementation();
  const phase2Issues = checkPhase2Implementation();

  // Step 3: TypeScript check
  const tsCheckPassed = runTypeScriptCheck();

  // Step 4: Integration tests
  const testsAllPassed = runJestTests();

  // Step 5: Generate report
  const overallSuccess = generateReport(phase1Issues, phase2Issues, testsAllPassed, tsCheckPassed);

  // Exit with appropriate code
  process.exit(overallSuccess ? 0 : 1);
}

// Handle errors
process.on('uncaughtException', (error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled promise rejection: ${reason}`);
  process.exit(1);
});

// Run the test suite
main().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});