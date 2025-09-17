import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { NostrInitializationService } from '../services/nostr/NostrInitializationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SplashInit'>;

const { width } = Dimensions.get('window');

const INITIALIZATION_STEPS = [
  { message: 'Starting RUNSTR...', weight: 10 },
  { message: 'Connecting to Nostr relays...', weight: 30 },
  { message: 'Initializing Nostr services...', weight: 20 },
  { message: 'Discovering fitness teams...', weight: 30 },
  { message: 'Preparing your experience...', weight: 10 },
];

export const SplashInitScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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
      // Check if user has stored credentials
      const [storedNsec, storedNpub] = await Promise.all([
        AsyncStorage.getItem('user_nsec'),
        AsyncStorage.getItem('user_npub'),
      ]);

      const hasCredentials = !!(storedNsec || storedNpub);

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

      await new Promise(resolve => setTimeout(resolve, 400));

      // Navigate based on auth status
      if (hasCredentials) {
        // User has credentials, go directly to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        // No credentials, show auth screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    } catch (error) {
      console.error('Initialization error:', error);
      // Even on error, navigate to auth screen
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }, 1000);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 40],
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>RUNSTR</Text>
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
            >
              <LinearGradient
                colors={['#FF6B00', '#FF8E26']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
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
    marginBottom: 80,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
    letterSpacing: 1,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBarBackground: {
    width: width - 40,
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepsIndicator: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  stepDotActive: {
    backgroundColor: '#FF6B00',
  },
  versionText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: '#444444',
  },
});