/**
 * Screen Configurations
 * Animation configs and screen options for React Navigation Native Stack
 *
 * ✅ PERFORMANCE: Using native stack navigator for faster transitions
 * Native animations run on the UI thread, not blocking the JS thread
 */

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { theme } from '../styles/theme';

// Default navigator options for native stack
export const defaultScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: theme.colors.background },
  animation: 'slide_from_right',
};
