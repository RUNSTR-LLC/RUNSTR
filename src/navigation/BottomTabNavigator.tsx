/**
 * BottomTabNavigator - Main tab navigation for authenticated users
 * Exercise tab for tracking, Compete tab for Season II, Profile tab for user data
 */

import React, { Suspense } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { PerformanceLogger } from '../utils/PerformanceLogger';

// ✅ PERFORMANCE: Load Profile immediately, lazy load others when needed
// FIX: Loading multiple lazy screens simultaneously was causing freeze on first launch
import { ProfileScreen } from '../screens/ProfileScreen';

// Lazy load Social and Events since they're not the initial tab
const SocialScreen = React.lazy(() =>
  import('../screens/SocialScreen').then((m) => ({
    default: m.SocialScreen,
  }))
);

const CompeteScreen = React.lazy(() =>
  import('../screens/CompeteScreen').then((m) => ({
    default: m.CompeteScreen,
  }))
);

const WorkoutHistoryScreen = React.lazy(() =>
  import('../screens/WorkoutHistoryScreen').then((m) => ({
    default: m.WorkoutHistoryScreen,
  }))
);

// Loading fallback component
const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    }}
  >
    <ActivityIndicator size="large" color={theme.colors.accent} />
  </View>
);

// Data Hooks
import { useNavigationData } from '../contexts/NavigationDataContext';

// Navigation Handlers
import { createNavigationHandlers } from './navigationHandlers';

// Types
export type BottomTabParamList = {
  Home: { pubkey?: string } | undefined;
  Social: undefined;
  Events: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface BottomTabNavigatorProps {
  onSignOut?: () => Promise<void>;
}

export const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({
  onSignOut,
}) => {
  // i18n hook for tab labels
  const { t } = useTranslation(['profile', 'clubs']);

  // Fetch real data for navigation screens
  const {
    user,
    profileData,
    isLoading,
    isLoadingTeam,
    error,
    refresh,
    loadWallet,
    prefetchLeaguesInBackground,
  } = useNavigationData();

  // Create navigation handlers
  const handlers = createNavigationHandlers();

  // ✅ PERFORMANCE: Log total blocking time when app is interactive
  React.useEffect(() => {
    if (!isLoading && profileData) {
      console.log('\n🎯 APP IS INTERACTIVE - Performance Summary:');
      PerformanceLogger.summary();
      console.log('\n');
    }
  }, [isLoading, profileData]);

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        sceneContainerStyle: { backgroundColor: '#000' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Social') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          }

          return (
            <Ionicons
              name={iconName}
              size={size || 24}
              color={color}
              style={styles.tabIcon}
            />
          );
        },
      })}
      initialRouteName="Home"
    >
      {/* Home Tab */}
      <Tab.Screen
        name="Home"
        options={{
          title: t('profile:tabHome'),
          headerShown: false,
        }}
      >
        {({ navigation }) =>
          profileData ? (
            <ProfileScreen
              data={profileData}
              isLoadingTeam={isLoadingTeam}
              isLoadingProfile={isLoading}
              onNavigateToTeam={() => navigation.navigate('Social')}
              onNavigateToTeamDiscovery={() => navigation.navigate('Social')}
              onViewCurrentTeam={() => {
                if (profileData.currentTeam) {
                  navigation.navigate('ClubPage', {
                    clubId: profileData.currentTeam.id,
                    clubName: profileData.currentTeam.name,
                  });
                }
              }}
              onEditProfile={handlers.handleEditProfile}
              onSend={handlers.handleWalletSend}
              onReceive={handlers.handleWalletReceive}
              onWalletHistory={handlers.handleWalletHistory}
              onSyncSourcePress={handlers.handleSyncSourcePress}
              onHelp={() => handlers.handleHelp(navigation)}
              onContactSupport={() => handlers.handleContactSupport(navigation)}
              onPrivacyPolicy={() => handlers.handlePrivacyPolicy(navigation)}
              onSignOut={
                onSignOut || (() => handlers.handleSignOut(navigation))
              }
              onRefresh={refresh}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              {error && (
                <Text style={styles.loadingText}>{error}</Text>
              )}
              {error && (
                <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      </Tab.Screen>

      {/* Social Tab - Feed & Fitness Clubs */}
      <Tab.Screen name="Social" options={{ title: t('profile:tabSocial'), lazy: true }}>
        {() => (
          <Suspense fallback={<LoadingFallback />}>
            <SocialScreen />
          </Suspense>
        )}
      </Tab.Screen>

      {/* Events Tab - Competitions & Events */}
      <Tab.Screen
        name="Events"
        options={{
          title: t('profile:tabEvents'),
          headerShown: false,
        }}
      >
        {() => (
          <Suspense fallback={<LoadingFallback />}>
            <CompeteScreen />
          </Suspense>
        )}
      </Tab.Screen>
      {/* History Tab - Workout History */}
      <Tab.Screen
        name="History"
        options={{
          title: t('profile:tabHistory'),
          headerShown: false,
          lazy: true,
        }}
      >
        {() => (
          <Suspense fallback={<LoadingFallback />}>
            <WorkoutHistoryScreen />
          </Suspense>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background, // #000000
    borderTopWidth: 0, // Remove border to eliminate white line on Android
    paddingTop: 10,
    paddingBottom: 10,
    height: 85,
    elevation: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },

  tabBarLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
  },

  tabIcon: {
    marginBottom: 2,
  },

  tabContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  teamsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  createButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },

  createButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.background,
    lineHeight: 24,
  },

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
