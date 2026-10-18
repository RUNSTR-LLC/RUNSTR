/**
 * AppNavigator - Logged-out navigation for the RUNSTR app
 * Only the Login screen: once AuthContext reports a user, App.tsx swaps to
 * AuthenticatedNavigator, so no other route is reachable from here.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../screens/LoginScreen';
import { defaultScreenOptions } from './screenConfigurations';

// Screen params for type safety
export type RootStackParamList = {
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  initialRoute?: keyof RootStackParamList;
  isFirstTime?: boolean;
}

export const AppNavigator: React.FC<AppNavigatorProps> = () => (
  <Stack.Navigator initialRouteName="Login" screenOptions={defaultScreenOptions}>
    {/* Login Screen - No callback needed, AuthContext handles everything */}
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);
