/**
 * OnboardingWizard Component
 * 4-slide introduction to RUNSTR tabs with swipe navigation
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideData {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  features: string[];
  locked?: boolean;
}

const slides: SlideData[] = [
  {
    title: 'Profile',
    icon: 'person-circle',
    description: 'Your fitness dashboard',
    features: [
      'Track workouts from Apple Health & other apps',
      'View team memberships',
      'Manage your Bitcoin wallet',
      'Access account settings',
    ],
  },
  {
    title: 'Activity',
    icon: 'fitness',
    description: 'Track workouts directly',
    features: [
      'Log runs, cycles, and walks',
      'Manual entry for strength training',
      'Track yoga and meditation',
      'Sync across all devices',
    ],
    locked: true,
  },
  {
    title: 'Season',
    icon: 'trophy',
    description: 'Championship tournaments',
    features: [
      'Compete globally for cash prizes',
      'Seasonal fitness challenges',
      'Real-time leaderboards',
      'Bitcoin rewards for winners',
    ],
    locked: true,
  },
  {
    title: 'Teams',
    icon: 'people',
    description: 'Fitness communities',
    features: [
      'Discover and join teams',
      'Participate in exclusive events',
      'Compete in team leagues',
      'Unlock Captain Mode to create teams',
    ],
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
  isLoading?: boolean;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  isLoading = false,
}) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentSlide(slideIndex);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentSlide + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderSlide = (slide: SlideData, index: number) => (
    <View key={index} style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={[styles.iconContainer, slide.locked && styles.iconContainerLocked]}>
          <Ionicons
            name={slide.icon}
            size={60}
            color={slide.locked ? theme.colors.textMuted : theme.colors.primary}
          />
          {slide.locked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={styles.slideTitle}>{slide.title}</Text>
        {slide.locked && (
          <Text style={styles.unlockedText}>UNLOCKABLE</Text>
        )}

        <Text style={styles.slideDescription}>{slide.description}</Text>

        <View style={styles.featuresContainer}>
          {slide.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={slide.locked ? theme.colors.textMuted : theme.colors.success}
              />
              <Text style={[styles.featureText, slide.locked && styles.featureTextLocked]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Setting up your account...</Text>
          </View>
        )}

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 350,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconContainerLocked: {
    backgroundColor: `${theme.colors.textMuted}15`,
  },
  lockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 5,
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  slideDescription: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  featuresContainer: {
    alignSelf: 'stretch',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  featureTextLocked: {
    color: theme.colors.textMuted,
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 10,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});