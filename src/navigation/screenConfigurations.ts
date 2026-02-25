/**
 * Screen Configurations
 * Animation configs and screen options for React Navigation Native Stack
 *
 * ✅ PERFORMANCE: Using native stack navigator for faster transitions
 * Native animations run on the UI thread, not blocking the JS thread
 */

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// Screen-specific configurations for native stack
export const screenConfigurations = {
  // Main Team Screen - no animation for instant load
  Team: {
    animation: 'none',
    headerShown: false,
  } as NativeStackNavigationOptions,

  // Profile Screen - slide from right (default iOS behavior)
  Profile: {
    animation: 'slide_from_right',
    headerShown: false,
    contentStyle: { backgroundColor: '#000' },
  } as NativeStackNavigationOptions,

  // Wallet Screen - slide from right
  Wallet: {
    animation: 'slide_from_right',
    headerShown: false,
    contentStyle: { backgroundColor: '#000' },
  } as NativeStackNavigationOptions,

};

// Default navigator options for native stack
export const defaultScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#000' },
  animation: 'slide_from_right',
};
