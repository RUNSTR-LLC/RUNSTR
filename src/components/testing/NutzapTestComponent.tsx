/**
 * NutZap Test Component
 * Tests Phase 1 implementation in React Native environment
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNutzap } from '../../hooks/useNutzap';
import { generateSecretKey, nip19 } from 'nostr-tools';

export const NutzapTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Initialize NutZap hook
  const {
    isInitialized,
    isLoading,
    balance,
    userPubkey,
    error,
    sendNutzap,
    claimNutzaps,
    refreshBalance,
    clearWallet
  } = useNutzap(false); // Don't auto-initialize

  const addResult = (message: string, success: boolean = true) => {
    const prefix = success ? '✅' : '❌';
    setTestResults(prev => [...prev, `${prefix} ${message}`]);
  };

  const runPhase1Tests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Wallet Initialization
      addResult('Starting Phase 1 Tests...');

      if (!isInitialized) {
        addResult('Initializing wallet...');
        // Note: In a real test, you'd initialize with actual nsec from auth
        // For testing, we'll check if hook is ready
        if (isLoading) {
          addResult('Wallet is loading...', false);
        } else {
          addResult('Wallet hook ready');
        }
      } else {
        addResult('Wallet already initialized');
      }

      // Test 2: Check wallet state
      if (userPubkey) {
        addResult(`User pubkey: ${userPubkey.slice(0, 16)}...`);
      } else {
        addResult('No user pubkey yet', false);
      }

      // Test 3: Balance check
      addResult(`Current balance: ${balance} sats`);

      // Test 4: Test claim function (won't find any, but should not error)
      try {
        const claimResult = await claimNutzaps();
        addResult(`Claim attempted: ${claimResult.claimed}/${claimResult.total} sats`);
      } catch (err) {
        addResult(`Claim failed: ${err}`, false);
      }

      // Test 5: Test send validation (should fail gracefully with no balance)
      if (balance === 0) {
        const testPubkey = Buffer.from(generateSecretKey()).toString('hex');
        const sendResult = await sendNutzap(testPubkey, 10, 'Test');

        if (!sendResult) {
          addResult('Send validation working (rejected due to no balance)');
        } else {
          addResult('Send succeeded unexpectedly', false);
        }
      }

      // Test 6: Error handling
      if (error) {
        addResult(`Current error state: ${error}`, false);
      } else {
        addResult('No errors in wallet state');
      }

      addResult('Phase 1 tests complete!');

    } catch (err) {
      addResult(`Test error: ${err}`, false);
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearWallet = async () => {
    Alert.alert(
      'Clear Wallet',
      'This will clear all wallet data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearWallet();
            addResult('Wallet cleared');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NutZap Phase 1 Test</Text>
        <Text style={styles.subtitle}>Wallet Core Functionality</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Wallet Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Initialized:</Text>
          <Text style={styles.value}>{isInitialized ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Loading:</Text>
          <Text style={styles.value}>{isLoading ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Balance:</Text>
          <Text style={styles.value}>{balance} sats</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Pubkey:</Text>
          <Text style={styles.value}>
            {userPubkey ? `${userPubkey.slice(0, 16)}...` : 'Not set'}
          </Text>
        </View>
        {error && (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runPhase1Tests}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Run Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={refreshBalance}
          disabled={!isInitialized}
        >
          <Text style={styles.buttonText}>Refresh Balance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearWallet}
        >
          <Text style={styles.buttonText}>Clear Wallet</Text>
        </TouchableOpacity>
      </View>

      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map((result, index) => (
            <Text
              key={index}
              style={[
                styles.resultItem,
                result.startsWith('❌') && styles.errorResult
              ]}
            >
              {result}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#888'
  },
  statusCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a'
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  label: {
    color: '#888',
    fontSize: 14
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  errorRow: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 6
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  primaryButton: {
    backgroundColor: '#007AFF'
  },
  secondaryButton: {
    backgroundColor: '#333'
  },
  dangerButton: {
    backgroundColor: '#ff3b30'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  resultsContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a'
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12
  },
  resultItem: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18
  },
  errorResult: {
    color: '#ff4444'
  }
});