/**
 * SplashScreen - Initial loading screen matching iOS RUNSTR design
 * Shows RUNSTR logo with Nostr connection progress and initialization status
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';

interface SplashScreenProps {
  onComplete: () => void;
  isConnected?: boolean;
  connectionStatus?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isConnected = false,
  connectionStatus = 'Connecting to Nostr...',
}) => {
  const [progress] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🎬 SplashScreen: Starting initialization...');

    // Start progress animation
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Show splash for minimum 2.5 seconds like iOS version
    setTimeout(() => {
      console.log('⏰ SplashScreen: Timeout completed, calling onComplete...');
      setIsVisible(false);
      onComplete();
    }, 2500);
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

      {/* Connection Status Section */}
      <View style={styles.statusSection}>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.statusDot,
              isConnected
                ? styles.statusDotConnected
                : styles.statusDotConnecting,
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected to Nostr' : connectionStatus}
          </Text>
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
