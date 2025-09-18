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

const { width } = Dimensions.get('window');

const INITIALIZATION_STEPS = [
  { message: 'Starting RUNSTR...', weight: 10 },
  { message: 'Connecting to Nostr relays...', weight: 25 },
  { message: 'Initializing services...', weight: 20 },
  { message: 'Loading your profile...', weight: 25 },
  { message: 'Almost ready...', weight: 20 },
];

// This screen is now shown after login while loading user data
export const SplashInitScreen: React.FC = () => {
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
      // Step 1: Initial setup
      setCurrentStep(0);
      setStatusMessage(INITIALIZATION_STEPS[0].message);
      animateProgress(calculateProgress(0));
      await new Promise(resolve => setTimeout(resolve, 400));

      // Step 2: Connect to relays
      setCurrentStep(1);
      setStatusMessage(INITIALIZATION_STEPS[1].message);
      animateProgress(calculateProgress(1));

      const initService = NostrInitializationService.getInstance();
      await initService.connectToRelays();

      // Step 3: Initialize NDK
      setCurrentStep(2);
      setStatusMessage(INITIALIZATION_STEPS[2].message);
      animateProgress(calculateProgress(2));

      await initService.initializeNDK();

      // Step 4: Discover teams (prefetch)
      setCurrentStep(3);
      setStatusMessage(INITIALIZATION_STEPS[3].message);
      animateProgress(calculateProgress(3));

      // Start team discovery in background (don't await)
      initService.prefetchTeams().catch(console.error);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 5: Final preparation
      setCurrentStep(4);
      setStatusMessage(INITIALIZATION_STEPS[4].message);
      animateProgress(1);

      // Hold at 100% for a moment so user sees completion
      await new Promise(resolve => setTimeout(resolve, 800));

      // No navigation here - AuthContext will handle it when profile loads
      console.log('✅ SplashInitScreen: Initialization complete');
    } catch (error) {
      console.error('Initialization error:', error);
      // Continue anyway - user is already authenticated
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
  },
  versionText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: '#444444',
  },
});