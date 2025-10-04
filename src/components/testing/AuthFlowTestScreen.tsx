/**
 * Authentication Flow Test Screen
 * A React Native component for testing the complete authentication flow
 * This can be temporarily added to the app for development testing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthFlowTester, TestResult } from '../../utils/testAuthFlow';
import { AuthService } from '../../services/auth/authService';
import { generateNostrKeyPair, validateNsec } from '../../utils/nostr';
import type { AuthResult } from '../../types';

interface TestState {
  isRunning: boolean;
  results: TestResult[];
  currentTest: string;
  testNsec: string;
  authResult: AuthResult | null;
}

export const AuthFlowTestScreen: React.FC = () => {
  const [state, setState] = useState<TestState>({
    isRunning: false,
    results: [],
    currentTest: '',
    testNsec: '',
    authResult: null,
  });

  // Generate a test nsec on component mount
  useEffect(() => {
    const keyPair = generateNostrKeyPair();
    setState((prev) => ({ ...prev, testNsec: keyPair.nsec }));
  }, []);

  const runUtilityTests = async () => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      currentTest: 'Utility Tests',
    }));

    try {
      const tester = new AuthFlowTester();
      await tester.testNostrUtilities();
      await tester.testCoinOSService();
      await tester.testLocalStorage();
      await tester.testErrorHandling();

      const results = tester.getResults();
      setState((prev) => ({
        ...prev,
        results,
        isRunning: false,
        currentTest: '',
      }));
    } catch (error) {
      Alert.alert(
        'Test Error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      setState((prev) => ({ ...prev, isRunning: false, currentTest: '' }));
    }
  };

  const runFullAuthTest = async () => {
    if (!state.testNsec || !validateNsec(state.testNsec)) {
      Alert.alert('Invalid Nsec', 'Please enter a valid nsec for testing');
      return;
    }

    setState((prev) => ({
      ...prev,
      isRunning: true,
      currentTest: 'Full Authentication Flow',
    }));

    try {
      // Step 1: Authentication
      console.log('🔐 Testing authentication with nsec...');
      const authResult = await AuthService.signInWithNostr(state.testNsec);

      setState((prev) => ({ ...prev, authResult }));

      if (!authResult.success) {
        Alert.alert(
          'Authentication Failed',
          authResult.error || 'Unknown error'
        );
        setState((prev) => ({ ...prev, isRunning: false, currentTest: '' }));
        return;
      }

      console.log('✅ Authentication successful:', authResult);

      // Step 2: Role Selection (if needed)
      if (authResult.needsRoleSelection && authResult.user) {
        console.log('👤 Testing role selection...');
        const roleResult = await AuthService.updateUserRole(
          authResult.user.id,
          {
            role: 'member',
          }
        );

        if (roleResult.success) {
          console.log('✅ Role selection successful');
        } else {
          console.log('❌ Role selection failed:', roleResult.error);
        }
      }

      // Step 3: Wallet Creation (if needed)
      if (authResult.needsWalletCreation && authResult.user) {
        console.log('⚡ Testing wallet creation...');
        const walletResult = await AuthService.createPersonalWallet(
          authResult.user.id
        );

        if (walletResult.success) {
          console.log(
            '✅ Wallet creation successful:',
            walletResult.lightningAddress
          );
        } else {
          console.log('❌ Wallet creation failed:', walletResult.error);
        }
      }

      // Step 4: Get final user state
      console.log('🔍 Getting final authentication status...');
      const finalStatus = await AuthService.getAuthenticationStatus();
      console.log('📊 Final status:', finalStatus);

      Alert.alert(
        'Authentication Test Complete',
        `Success: ${authResult.success}\n` +
          `User: ${authResult.user?.name || 'None'}\n` +
          `Role: ${authResult.user?.role || 'None'}\n` +
          `Needs Onboarding: ${authResult.needsOnboarding || false}`
      );
    } catch (error) {
      console.error('Authentication test error:', error);
      Alert.alert(
        'Test Error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setState((prev) => ({ ...prev, isRunning: false, currentTest: '' }));
    }
  };

  const generateNewTestNsec = () => {
    const keyPair = generateNostrKeyPair();
    setState((prev) => ({ ...prev, testNsec: keyPair.nsec }));
  };

  const clearResults = () => {
    setState((prev) => ({ ...prev, results: [], authResult: null }));
  };

  const signOut = async () => {
    try {
      const result = await AuthService.signOut();
      if (result.success) {
        Alert.alert('Success', 'Signed out successfully');
        setState((prev) => ({ ...prev, authResult: null }));
      } else {
        Alert.alert('Error', result.error || 'Sign out failed');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Sign out failed'
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000', padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          color: theme.colors.textBright,
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        🧪 Auth Flow Testing
      </Text>

      {/* Test Nsec Input */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: theme.colors.textBright, fontSize: 16, marginBottom: 10 }}>
          Test Nsec:
        </Text>
        <TextInput
          style={{
            backgroundColor: '#1a1a1a',
            color: theme.colors.textBright,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#333',
            marginBottom: 10,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
          value={state.testNsec}
          onChangeText={(text) =>
            setState((prev) => ({ ...prev, testNsec: text }))
          }
          placeholder="Enter nsec for testing..."
          placeholderTextColor="#666"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          onPress={generateNewTestNsec}
          style={{
            backgroundColor: '#333',
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.colors.textBright }}>Generate New Test Nsec</Text>
        </TouchableOpacity>
      </View>

      {/* Test Buttons */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          onPress={runUtilityTests}
          disabled={state.isRunning}
          style={{
            backgroundColor: state.isRunning ? '#333' : '#4A90E2',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={{ color: theme.colors.textBright, fontSize: 16, fontWeight: 'bold' }}>
            🔧 Run Utility Tests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={runFullAuthTest}
          disabled={state.isRunning || !validateNsec(state.testNsec)}
          style={{
            backgroundColor:
              state.isRunning || !validateNsec(state.testNsec)
                ? '#333'
                : '#4CAF50',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={{ color: theme.colors.textBright, fontSize: 16, fontWeight: 'bold' }}>
            🚀 Run Full Authentication Test
          </Text>
        </TouchableOpacity>

        {state.authResult?.success && (
          <TouchableOpacity
            onPress={signOut}
            style={{
              backgroundColor: '#FF6B6B',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ color: theme.colors.textBright, fontSize: 16, fontWeight: 'bold' }}>
              🚪 Sign Out
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={clearResults}
          style={{
            backgroundColor: '#666',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.colors.textBright }}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {/* Current Test Status */}
      {state.isRunning && (
        <View
          style={{
            backgroundColor: '#1a1a1a',
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={{ color: theme.colors.textBright, marginTop: 10 }}>
            Running: {state.currentTest}
          </Text>
        </View>
      )}

      {/* Authentication Result */}
      {state.authResult && (
        <View
          style={{
            backgroundColor: state.authResult.success ? '#0d4f2d' : '#4f0d0d',
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: theme.colors.textBright,
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 10,
            }}
          >
            Authentication Result:
          </Text>
          <Text style={{ color: theme.colors.textBright, fontFamily: 'monospace' }}>
            {JSON.stringify(state.authResult, null, 2)}
          </Text>
        </View>
      )}

      {/* Test Results */}
      {state.results.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: theme.colors.textBright,
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 15,
            }}
          >
            📊 Test Results:
          </Text>

          {state.results.map((result, index) => (
            <View
              key={index}
              style={{
                backgroundColor: result.success ? '#0d4f2d' : '#4f0d0d',
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textBright,
                  fontWeight: 'bold',
                  marginBottom: 5,
                }}
              >
                {result.success ? '✅' : '❌'} {result.step}
              </Text>

              {result.duration && (
                <Text style={{ color: '#ccc', fontSize: 12 }}>
                  Duration: {result.duration}ms
                </Text>
              )}

              {result.error && (
                <Text style={{ color: '#ffcccb', fontSize: 12, marginTop: 5 }}>
                  Error: {result.error}
                </Text>
              )}

              {result.data && (
                <Text
                  style={{
                    color: '#ccc',
                    fontSize: 12,
                    marginTop: 5,
                    fontFamily: 'monospace',
                  }}
                >
                  {JSON.stringify(result.data)}
                </Text>
              )}
            </View>
          ))}

          <View
            style={{
              backgroundColor: '#1a1a1a',
              padding: 12,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <Text style={{ color: theme.colors.textBright, fontWeight: 'bold' }}>
              Summary: {state.results.filter((r) => r.success).length}/
              {state.results.length} passed
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default AuthFlowTestScreen;
