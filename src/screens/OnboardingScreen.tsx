/**
 * OnboardingScreen
 * Complete onboarding flow for new users
 * Combines slides, password notice, and background caching
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { PasswordNotice } from '../components/onboarding/PasswordNotice';
import OnboardingCacheService from '../services/cache/OnboardingCacheService';
import { theme } from '../styles/theme';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: '@runstr:onboarding_completed',
  USER_NSEC: '@runstr:user_nsec',
} as const;

interface OnboardingScreenProps {
  route?: {
    params?: {
      nsec?: string; // The generated password (nsec)
    };
  };
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ route }) => {
  const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState<'slides' | 'password'>('slides');
  const [isLoading, setIsLoading] = useState(false);
  const [userPassword, setUserPassword] = useState<string>('');

  useEffect(() => {
    // Get the nsec from route params or storage
    const loadPassword = async () => {
      const nsec = route?.params?.nsec || await AsyncStorage.getItem(STORAGE_KEYS.USER_NSEC);
      if (nsec) {
        setUserPassword(nsec);
      }
    };

    loadPassword();

    // Start background caching when onboarding begins
    OnboardingCacheService.startBackgroundCaching();
  }, [route?.params?.nsec]);

  const handleSlidesComplete = () => {
    console.log('[Onboarding] Slides completed, showing password notice');
    setCurrentStep('password');
  };

  const handlePasswordContinue = async () => {
    console.log('[Onboarding] Password acknowledged, completing onboarding');
    setIsLoading(true);

    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');

      // Navigate to main app (Teams tab)
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('[Onboarding] Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {currentStep === 'slides' ? (
        <OnboardingWizard
          onComplete={handleSlidesComplete}
          isLoading={isLoading}
        />
      ) : (
        <PasswordNotice
          password={userPassword}
          onContinue={handlePasswordContinue}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});