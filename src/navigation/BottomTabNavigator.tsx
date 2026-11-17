/**
 * BottomTabNavigator - Main navigation for authenticated users
 * A single Home tab (ProfileScreen) with the tab bar hidden: the app's one
 * visible surface. The tab navigator is kept even with one tab — see the
 * simplification design doc's Tier 2 note on why MainTabs isn't replaced with
 * a bare screen.
 */

import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../styles/theme';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useNavigationData } from '../contexts/NavigationDataContext';

export type BottomTabParamList = {
  Home: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { user, error, refresh } = useNavigationData();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' as const },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
      initialRouteName="Home"
    >
      <Tab.Screen name="Home">
        {() =>
          user ? (
            <ProfileScreen user={user} onRefresh={refresh} />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              {error && <Text style={styles.loadingText}>{error}</Text>}
              {error && (
                <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
});
