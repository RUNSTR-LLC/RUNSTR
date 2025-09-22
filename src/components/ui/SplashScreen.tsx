/**
 * SplashScreen - Post-login loading screen that prefetches data
 * Shows RUNSTR logo with actual data loading progress
 * Enforces minimum 3-second display time while loading teams/workouts
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { NostrInitializationService } from '../../services/nostr/NostrInitializationService';

interface SplashScreenProps {
  onComplete: () => void;
  isConnected?: boolean;
  connectionStatus?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isConnected = false,
  connectionStatus = 'Loading your fitness journey...',
}) => {
  const [progress] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Loading your profile...');
  const startTime = useRef(Date.now());

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🎬 SplashScreen: Starting post-login data prefetch...');

    // Start progress animation (3 seconds total)
    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    // Set a maximum timeout to prevent getting stuck
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('⏱️ SplashScreen: Timeout reached, completing anyway');
        resolve();
      }, 4000); // 4 second maximum timeout
    });

    // Initialize services and prefetch data
    const loadDataPromise = async () => {
      try {
        const initService = NostrInitializationService.getInstance();
        const loadingSteps = [
          {
            action: async () => {
              setStatusMessage('Connecting to Nostr relays...');
              await initService.connectToRelays();
            },
            duration: 800
          },
          {
            action: async () => {
              setStatusMessage('Loading your teams...');
              await initService.prefetchTeams();
            },
            duration: 1000
          },
          {
            action: async () => {
              setStatusMessage('Syncing your workouts...');
              await initService.prefetchWorkouts();
            },
            duration: 800
          },
          {
            action: async () => {
              setStatusMessage('Almost ready...');
              // Final preparation
              await new Promise(resolve => setTimeout(resolve, 400));
            },
            duration: 400
          }
        ];

        // Execute loading steps
        for (const step of loadingSteps) {
          await step.action();
        }
      } catch (error) {
        console.error('⚠️ SplashScreen: Error during loading:', error);
        // Don't throw - we'll handle this gracefully
      }
    };

    // Race between loading data and timeout
    await Promise.race([loadDataPromise(), timeoutPromise]);

    // Ensure minimum 3 seconds have passed
    const elapsedTime = Date.now() - startTime.current;
    const remainingTime = Math.max(0, 3000 - elapsedTime);

    if (remainingTime > 0) {
      console.log(`⏰ SplashScreen: Waiting ${remainingTime}ms to meet minimum display time`);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    console.log('✅ SplashScreen: Completed, transitioning to app...');
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* RUNSTR Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>R</Text>
        </View>
        <Text style={styles.logoText}>RUNSTR</Text>
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <View style={styles.connectionStatus}>
          <ActivityIndicator
            size="small"
            color={theme.colors.text}
            style={{ marginRight: 12 }}
          />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black like iOS version
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logoIcon: {
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
    color: '#000000',
  },

  logoText: {
    fontSize: 34,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: 2,
  },

  statusSection: {
    alignItems: 'center',
    width: '100%',
  },

  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },

  statusDotConnecting: {
    borderColor: '#666666',
    backgroundColor: 'transparent',
  },

  statusDotConnected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  },

  statusText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: theme.typography.weights.medium,
  },

  progressContainer: {
    width: 200,
    height: 2,
    backgroundColor: '#333333',
    borderRadius: 1,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.text,
    borderRadius: 1,
  },
});
