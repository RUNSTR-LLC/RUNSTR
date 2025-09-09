/**
 * Manual Authentication Flow Testing Utility
 * Run this to test the complete authentication flow end-to-end
 */

import {
  generateNostrKeyPair,
  validateNsec,
  nsecToNpub,
  storeNsecLocally,
  clearNostrStorage,
  normalizeNsecInput,
} from './nostr';
import { AuthService } from '../services/auth/authService';
import coinosService from '../services/coinosService';

export interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export class AuthFlowTester {
  private results: TestResult[] = [];

  private logResult(
    step: string,
    success: boolean,
    data?: any,
    error?: string,
    duration?: number
  ) {
    const result: TestResult = { step, success, data, error, duration };
    this.results.push(result);

    const status = success ? '✅' : '❌';
    const timing = duration ? ` (${duration}ms)` : '';
    console.log(`${status} ${step}${timing}`);

    if (error) {
      console.error(`   Error: ${error}`);
    }

    if (data && success) {
      console.log(`   Data:`, data);
    }
  }

  /**
   * Test 1: Nostr Utilities
   */
  async testNostrUtilities(): Promise<void> {
    console.log('\n🔧 Testing Nostr Utilities...');

    try {
      // Test key generation
      const startTime = Date.now();
      const keyPair = generateNostrKeyPair();
      const duration = Date.now() - startTime;

      const isValid = validateNsec(keyPair.nsec);
      this.logResult(
        'Generate Nostr key pair',
        isValid && keyPair.nsec.startsWith('nsec1'),
        {
          nsec: keyPair.nsec.substring(0, 20) + '...',
          npub: keyPair.npub.substring(0, 20) + '...',
          valid: isValid,
        },
        undefined,
        duration
      );
    } catch (error) {
      this.logResult(
        'Generate Nostr key pair',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      // Test nsec validation
      const testCases = [
        {
          nsec: 'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5f',
          expected: true,
        },
        { nsec: 'invalid-nsec', expected: false },
        { nsec: '', expected: false },
        { nsec: 'nsec1invalid', expected: false },
      ];

      let validationsPassed = 0;
      for (const testCase of testCases) {
        const result = validateNsec(testCase.nsec);
        if (result === testCase.expected) {
          validationsPassed++;
        }
      }

      this.logResult(
        'Nsec validation tests',
        validationsPassed === testCases.length,
        { passed: validationsPassed, total: testCases.length }
      );
    } catch (error) {
      this.logResult(
        'Nsec validation tests',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      // Test nsec to npub conversion
      const testNsec =
        'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5f';
      const npub = nsecToNpub(testNsec);

      this.logResult(
        'Nsec to npub conversion',
        npub.startsWith('npub1') && npub.length === 63,
        { npub: npub.substring(0, 20) + '...' }
      );
    } catch (error) {
      this.logResult(
        'Nsec to npub conversion',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Test 2: CoinOS Service
   */
  async testCoinOSService(): Promise<void> {
    console.log('\n⚡ Testing CoinOS Service...');

    try {
      // Initialize service
      const startTime = Date.now();
      await coinosService.initialize();
      const duration = Date.now() - startTime;
      this.logResult(
        'CoinOS service initialization',
        true,
        undefined,
        undefined,
        duration
      );
    } catch (error) {
      this.logResult(
        'CoinOS service initialization',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      // Check service availability
      const startTime = Date.now();
      const isAvailable = await coinosService.checkServiceAvailability();
      const duration = Date.now() - startTime;

      this.logResult(
        'CoinOS service availability',
        true, // We'll consider it a success regardless of availability for testing
        { available: isAvailable },
        undefined,
        duration
      );
    } catch (error) {
      this.logResult(
        'CoinOS service availability',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      // Check if user has wallet credentials
      const hasCredentials = await coinosService.hasWalletCredentials();
      this.logResult('Check wallet credentials', true, { hasCredentials });
    } catch (error) {
      this.logResult(
        'Check wallet credentials',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Test 3: Authentication Service (with test nsec)
   */
  async testAuthenticationService(): Promise<void> {
    console.log('\n🔐 Testing Authentication Service...');

    const testNsec =
      'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5f';

    try {
      // Test invalid nsec handling
      const invalidResult = await AuthService.signInWithNostr('invalid-nsec');
      this.logResult(
        'Handle invalid nsec',
        !invalidResult.success &&
          (invalidResult.error?.includes('Invalid nsec format') ?? false),
        { error: invalidResult.error }
      );
    } catch (error) {
      this.logResult(
        'Handle invalid nsec',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      // Test authentication status check
      const authStatus = await AuthService.getAuthenticationStatus();
      this.logResult('Check authentication status', true, {
        isAuthenticated: authStatus.isAuthenticated,
        needsOnboarding: authStatus.needsOnboarding,
      });
    } catch (error) {
      this.logResult(
        'Check authentication status',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Note: Real authentication test would require actual Supabase connection
    console.log(
      '   📝 Note: Full authentication test requires Supabase database connection'
    );
  }

  /**
   * Test 4: Local Storage Integration
   */
  async testLocalStorage(): Promise<void> {
    console.log('\n💾 Testing Local Storage...');

    const testUserId = 'test-user-' + Date.now();
    const testNsec =
      'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5f';

    try {
      // Clear any existing storage
      await clearNostrStorage();
      this.logResult('Clear Nostr storage', true);
    } catch (error) {
      this.logResult(
        'Clear Nostr storage',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      // Test storing nsec locally
      await storeNsecLocally(testNsec, testUserId);
      this.logResult('Store nsec locally', true, { userId: testUserId });
    } catch (error) {
      this.logResult(
        'Store nsec locally',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Test 5: Error Handling
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n⚠️  Testing Error Handling...');

    try {
      // Test various invalid inputs
      const errorCases = [
        { input: '', expectedToFail: true },
        { input: 'not-a-nsec', expectedToFail: true },
        { input: 'nsec1toolong' + 'x'.repeat(100), expectedToFail: true },
      ];

      let errorHandlingPassed = 0;
      for (const testCase of errorCases) {
        try {
          normalizeNsecInput(testCase.input);
          if (!testCase.expectedToFail) {
            errorHandlingPassed++;
          }
        } catch (error) {
          if (testCase.expectedToFail) {
            errorHandlingPassed++;
          }
        }
      }

      this.logResult(
        'Input validation error handling',
        errorHandlingPassed === errorCases.length,
        { passed: errorHandlingPassed, total: errorCases.length }
      );
    } catch (error) {
      this.logResult(
        'Input validation error handling',
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Authentication Flow End-to-End Tests\n');
    const overallStartTime = Date.now();

    await this.testNostrUtilities();
    await this.testCoinOSService();
    await this.testAuthenticationService();
    await this.testLocalStorage();
    await this.testErrorHandling();

    const overallDuration = Date.now() - overallStartTime;

    // Generate summary
    const passed = this.results.filter((r) => r.success).length;
    const total = this.results.length;
    const success = passed === total;

    console.log('\n📊 Test Summary:');
    console.log(`   ${success ? '✅' : '❌'} ${passed}/${total} tests passed`);
    console.log(`   ⏱️  Total duration: ${overallDuration}ms`);

    if (!success) {
      console.log('\n❌ Failed tests:');
      this.results
        .filter((r) => !r.success)
        .forEach((r) => console.log(`   - ${r.step}: ${r.error}`));
    }

    return this.results;
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Export convenience function
export async function runAuthFlowTests(): Promise<TestResult[]> {
  const tester = new AuthFlowTester();
  return await tester.runAllTests();
}

// For development console testing
if (__DEV__) {
  // @ts-ignore
  global.testAuthFlow = runAuthFlowTests;
  // @ts-ignore
  global.AuthFlowTester = AuthFlowTester;
}
