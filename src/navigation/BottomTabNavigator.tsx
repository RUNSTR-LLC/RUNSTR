/**
 * BottomTabNavigator - Main tab navigation for authenticated users
 * Teams tab for discovery and Profile tab for user data
 */

import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

// Screens
import { ProfileScreen } from '../screens/ProfileScreen';
import { TeamDiscoveryScreen } from '../screens/TeamDiscoveryScreen';

// Data Hooks
import { useNavigationData } from '../hooks/useNavigationData';

// Navigation Handlers
import { createNavigationHandlers } from './navigationHandlers';

// Types
export type BottomTabParamList = {
  Teams: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface BottomTabNavigatorProps {
  onNavigateToTeamCreation?: () => void;
}

export const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({
  onNavigateToTeamCreation,
}) => {
  // Fetch real data for navigation screens
  const { user, profileData, availableTeams, isLoading, error, refresh } =
    useNavigationData();

  // Create navigation handlers
  const handlers = createNavigationHandlers();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Teams') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
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
      initialRouteName="Profile"
    >
      {/* Teams Tab - Discovery + Team Creation */}
      <Tab.Screen
        name="Teams"
        options={{
          title: 'Teams',
          headerShown: false,
        }}
      >
        {({ navigation }) => (
          <View style={styles.tabContent}>
            {/* Header with plus button for team creation */}
            <View style={styles.teamsHeader}>
              <Text style={styles.headerTitle}>Teams</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  if (onNavigateToTeamCreation) {
                    onNavigateToTeamCreation();
                  } else if (user?.role === 'captain') {
                    // Navigate to team creation - this will be handled by parent
                    console.log('Navigate to team creation');
                  }
                }}
              >
                <Text style={styles.createButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Team Discovery Content */}
            <TeamDiscoveryScreen
              teams={availableTeams}
              isLoading={isLoading}
              onClose={() => {
                // Teams tab doesn't close - it's always visible
                console.log('Teams tab - no close action needed');
              }}
              onTeamJoin={(team) =>
                handlers.handleTeamJoin(team, navigation, refresh)
              }
              onTeamSelect={(team) => handlers.handleTeamView(team, navigation)}
              onRefresh={refresh}
              showHeader={false} // Don't show header - we provide our own
              showCloseButton={false} // No close button needed in tabs
              // No onCreateTeam prop - handled by header plus button
            />
          </View>
        )}
      </Tab.Screen>

      {/* Profile Tab */}
      <Tab.Screen
        name="Profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      >
        {({ navigation }) =>
          profileData ? (
            <ProfileScreen
              data={profileData}
              onNavigateToTeam={() => navigation.navigate('Teams')}
              onNavigateToTeamDiscovery={() => navigation.navigate('Teams')}
              onViewCurrentTeam={() => navigation.navigate('Teams')}
              onCaptainDashboard={() =>
                handlers.handleCaptainDashboard(navigation)
              }
              onTeamCreation={() => {
                if (onNavigateToTeamCreation) {
                  onNavigateToTeamCreation();
                }
              }}
              onEditProfile={handlers.handleEditProfile}
              // onSend/onReceive removed - user wallets not supported
              onSyncSourcePress={handlers.handleSyncSourcePress}
              onManageSubscription={handlers.handleManageSubscription}
              onHelp={handlers.handleHelp}
              onContactSupport={handlers.handleContactSupport}
              onPrivacyPolicy={handlers.handlePrivacyPolicy}
              onSignOut={() => handlers.handleSignOut(navigation)}
              onRefresh={refresh}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {error || 'Loading Profile...'}
              </Text>
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
  tabBar: {
    backgroundColor: theme.colors.background, // #000000
    borderTopWidth: 1,
    borderTopColor: theme.colors.border, // #1a1a1a  
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
