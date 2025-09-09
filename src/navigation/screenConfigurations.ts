/**
 * Screen Configurations
 * Animation configs and screen options for React Navigation
 */

import { StackNavigationOptions } from '@react-navigation/stack';

// Common animation configurations
const slideFromRightAnimation = {
  cardStyleInterpolator: ({ current, layouts }: any) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
  }),
};

const modalSlideFromBottomAnimation = {
  cardStyleInterpolator: ({ current, layouts }: any) => ({
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.height, 0],
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  }),
};

// Screen-specific configurations
export const screenConfigurations = {
  // Main Team Screen - no animation for instant load
  Team: {
    animationEnabled: false,
  } as StackNavigationOptions,

  // Profile Screen - slide from right
  Profile: {
    animationEnabled: true,
    ...slideFromRightAnimation,
  } as StackNavigationOptions,

  // Wallet Screen - slide from right
  Wallet: {
    animationEnabled: true,
    ...slideFromRightAnimation,
  } as StackNavigationOptions,

  // Captain Dashboard - slide from right
  CaptainDashboard: {
    animationEnabled: true,
    ...slideFromRightAnimation,
  } as StackNavigationOptions,

  // Team Discovery Modal - slide from bottom
  TeamDiscovery: {
    presentation: 'modal' as const,
    animationEnabled: true,
    ...modalSlideFromBottomAnimation,
  } as StackNavigationOptions,


  // Team Creation Wizard - modal presentation
  TeamCreation: {
    presentation: 'modal' as const,
    animationEnabled: true,
    headerShown: false,
  } as StackNavigationOptions,

  // Event Detail Screen - slide from right
  EventDetail: {
    animationEnabled: true,
    ...slideFromRightAnimation,
  } as StackNavigationOptions,

  // Challenge Detail Screen - slide from right
  ChallengeDetail: {
    animationEnabled: true,
    ...slideFromRightAnimation,
  } as StackNavigationOptions,
};

// Default navigator options
export const defaultScreenOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: '#000' },
};
