import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NostrInitializationService } from '../services/nostr/NostrInitializationService';
import nostrPrefetchService from '../services/nostr/NostrPrefetchService';
import { theme } from '../styles/theme';

const { width } = Dimensions.get('window');

const INITIALIZATION_STEPS = [
  { message: 'Connecting to Nostr...', weight: 10 },
  { message: 'Loading your profile...', weight: 15 },
  { message: 'Finding your teams...', weight: 15 },
  { message: 'Discovering teams...', weight: 15 },
  { message: 'Loading workouts...', weight: 15 },
  { message: 'Loading wallet...', weight: 15 },
  { message: 'Loading competitions...', weight: 15 },
];

interface SplashInitScreenProps {
  onComplete?: () => void;
}

// This screen is shown when cache needs prefetching (fresh + returning users)
export const SplashInitScreen: React.FC<SplashInitScreenProps> = ({ onComplete }) => {
  const [statusMessage, setStatusMessage] = useState(INITIALIZATION_STEPS[0].message);
  const [currentStep, setCurrentStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    initializeApp();
  }, []);

  const animateProgress = (toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const calculateProgress = (step: number): number => {
    let progress = 0;
    for (let i = 0; i <= step && i < INITIALIZATION_STEPS.length; i++) {
      if (i < step) {
        progress += INITIALIZATION_STEPS[i].weight;
      } else {
        // Partial progress for current step
        progress += INITIALIZATION_STEPS[i].weight * 0.5;
      }
    }
    return progress / 100;
  };

  const initializeApp = async () => {
    try {
      console.log('🚀 SplashInit: Starting comprehensive prefetch...');

      // Step 1: Connect to Nostr relays
      setCurrentStep(0);
      setStatusMessage(INITIALIZATION_STEPS[0].message);
      animateProgress(calculateProgress(0));

      const initService = NostrInitializationService.getInstance();
      await initService.connectToRelays();
      await initService.initializeNDK();

      console.log('✅ SplashInit: Nostr connected');

      // Step 2-7: Prefetch ALL user data with progress updates
      await nostrPrefetchService.prefetchAllUserData(
        (step, total, message) => {
          // Update UI with each prefetch step
          setCurrentStep(step); // steps 1-6
          setStatusMessage(message);
          animateProgress(calculateProgress(step));
          console.log(`✅ SplashInit: ${message}`);
        }
      );

      // Hold at 100% briefly so user sees completion
      animateProgress(1);
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ SplashInit: All data prefetched and cached - app ready!');

      // Notify parent component that initialization is complete
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('❌ SplashInit: Initialization error:', error);
      // Continue anyway - app should work with partial data
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 40],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Compete. Earn. Transform.</Text>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.statusText}>{statusMessage}</Text>

          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth }
              ]}
            />
          </View>

          <View style={styles.stepsIndicator}>
            {INITIALIZATION_STEPS.map((step, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  currentStep >= index && styles.stepDotActive
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 14,
    color: '#666666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 24,
    textAlign: 'center',
    minHeight: 20,
  },
  progressBarBackground: {
    width: width - 80,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.orangeBright, // Bright orange progress
    borderRadius: 1,
  },
  stepsIndicator: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 12,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2a2a2a',
  },
  stepDotActive: {
    backgroundColor: theme.colors.orangeBright, // Bright orange active dot
  },
  versionText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: '#444444',
  },
});