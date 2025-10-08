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
    const MAX_PROFILE_LOAD_TIME = 8000; // 8 seconds for profile essentials

    // ✅ NEW STRATEGY: Load profile essentials, show app, continue rest in background
    const profileEssentialsPromise = (async () => {
      try {
        console.log('🚀 SplashInit: Starting FAST profile-first initialization...');

        // Step 1: Connect to Nostr relays (CRITICAL for all queries)
        setCurrentStep(0);
        setStatusMessage(INITIALIZATION_STEPS[0].message);
        animateProgress(calculateProgress(0));

        const { GlobalNDKService } = await import('../services/nostr/GlobalNDKService');
        const initService = NostrInitializationService.getInstance();

        try {
          await initService.connectToRelays();
          await GlobalNDKService.getInstance();
          // Wait for minimum 2 relays (fast threshold)
          await GlobalNDKService.waitForMinimumConnection(2, 4000);
          console.log('✅ SplashInit: Nostr connected (minimum relays)');
        } catch (ndkError) {
          console.error('⚠️ SplashInit: NDK connection failed, continuing with offline mode');
          GlobalNDKService.startBackgroundRetry();
        }

        // Step 2-3: Profile Essentials ONLY (fast!)
        setCurrentStep(1);
        setStatusMessage(INITIALIZATION_STEPS[1].message);
        animateProgress(calculateProgress(1));

        const { getUserNostrIdentifiers } = await import('../utils/nostr');
        const identifiers = await getUserNostrIdentifiers();

        if (identifiers) {
          // Load profile and wallet in parallel (all we need for Profile tab)
          await Promise.all([
            import('../services/user/directNostrProfileService')
              .then(({ DirectNostrProfileService }) => DirectNostrProfileService.getCurrentUserProfile())
              .catch(() => console.warn('Profile fetch failed, using cache')),

            setCurrentStep(2),
            setStatusMessage(INITIALIZATION_STEPS[5].message), // "Loading wallet..."
            animateProgress(calculateProgress(2)),
          ]);

          console.log('✅ SplashInit: Profile essentials loaded - ready to show app!');
        }

      } catch (error) {
        console.error('❌ SplashInit: Profile essentials error:', error);
        // Continue anyway - app can work with cached data
      }
    })();

    // Emergency timeout - force app forward after 8s maximum
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('⚠️ SplashInit: 8-second timeout reached - profile essentials ready, showing app');
        resolve();
      }, MAX_PROFILE_LOAD_TIME);
    });

    // Wait for profile essentials OR timeout
    await Promise.race([profileEssentialsPromise, timeoutPromise]);

    // ✅ SHOW APP NOW - Profile tab is ready!
    if (onComplete) {
      console.log('✅ SplashInit: Profile ready - calling onComplete to show app');
      onComplete();
    }

    // ✅ Continue loading in BACKGROUND (don't await, don't block app)
    console.log('🔄 SplashInit: Continuing teams/workouts/competitions in background...');
    Promise.all([
      nostrPrefetchService.prefetchAllUserData(
        (step, total, message) => {
          console.log(`📊 Background: ${message} (${step}/${total})`);
        }
      ).catch(err => console.warn('Background prefetch error:', err))
    ]).then(() => {
      console.log('✅ Background loading complete');
    });
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