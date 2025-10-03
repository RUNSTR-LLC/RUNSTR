/**
 * AppNavigator - Main navigation container for the RUNSTR app
 * Handles stack navigation between screens and modal presentations
 */

import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
// Navigation container provided by Expo Router - removed NavigationContainer import
import { createStackNavigator } from '@react-navigation/stack';

import { theme } from '../styles/theme';

// Screens
import { EnhancedTeamScreen } from '../screens/EnhancedTeamScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { TeamDiscoveryScreen } from '../screens/TeamDiscoveryScreen';
import { CaptainDashboardScreen } from '../screens/CaptainDashboardScreen';
import { TeamCreationWizard } from '../components/wizards/TeamCreationWizard';
import { GlobalChallengeWizard } from '../components/wizards/GlobalChallengeWizard';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { ChallengeDetailScreen } from '../screens/ChallengeDetailScreen';
import { ChallengeLeaderboardScreen } from '../screens/ChallengeLeaderboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { CompetitionsListScreen } from '../screens/CompetitionsListScreen';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import type { DiscoveredNostrUser } from '../services/user/UserDiscoveryService';

// Navigation Configuration
import {
  screenConfigurations,
  defaultScreenOptions,
} from './screenConfigurations';
import { createNavigationHandlers } from './navigationHandlers';

// Data Hooks
import { useNavigationData } from '../contexts/NavigationDataContext';

// Screen params for type safety
export type RootStackParamList = {
  SplashInit: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Onboarding: { nsec?: string };
  Team: undefined;
  EnhancedTeamScreen: { team: any; userIsMember?: boolean; currentUserNpub?: string; userIsCaptain?: boolean }; // Individual team dashboard
  Profile: undefined;
  ProfileEdit: undefined;
  Wallet: undefined;
  CaptainDashboard: { teamId?: string; teamName?: string; isCaptain?: boolean };
  TeamDiscovery: {
    isOnboarding?: boolean;
    currentTeamId?: string;
  };
  TeamCreation: undefined;
  EventDetail: { eventId: string; eventData?: any };
  ChallengeDetail: { challengeId: string };
  CompetitionsList: undefined;
  ChallengeLeaderboard: { challengeId: string };
  ChallengeWizard: { preselectedOpponent?: DiscoveredNostrUser };
  WorkoutHistory: { userId: string; pubkey: string };
};

const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  initialRoute?: keyof RootStackParamList;
  isFirstTime?: boolean;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  initialRoute,
  isFirstTime = false,
}) => {
  // Fetch real data instead of using mock data
  const {
    user,
    teamData,
    profileData,
    walletData,
    captainDashboardData,
    availableTeams,
    isLoading,
    error,
    refresh,
  } = useNavigationData();

  // Determine initial route based on user state
  const getInitialRoute = (): keyof RootStackParamList => {
    if (initialRoute) {
      console.log(
        '🎯 AppNavigator: Using explicit initialRoute:',
        initialRoute
      );
      return initialRoute;
    }

    // Simplified logic: authenticated users always go to Profile
    console.log('🎯 AppNavigator: Going to Profile');
    return 'Profile';
  };

  // Create navigation handlers
  const handlers = createNavigationHandlers();

  // Show loading screen while fetching data
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text
          style={{
            color: theme.colors.text,
            marginTop: 16,
            fontSize: 16,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // Show error screen if data loading failed
  if (error && !isFirstTime) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {error}
        </Text>
        <Text
          onPress={refresh}
          style={{
            color: theme.colors.accent,
            fontSize: 16,
            textDecorationLine: 'underline',
          }}
        >
          Retry
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={defaultScreenOptions}
    >
      {/* Login Screen - No callback needed, AuthContext handles everything */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />

      {/* Onboarding Screen - Shows after new user signup */}
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />

      {/* Main Team Screen - Always shows Team Discovery */}
      <Stack.Screen name="Team" options={screenConfigurations.Team}>
        {({ navigation }) => (
          <TeamDiscoveryScreen
            teams={availableTeams}
            isLoading={isLoading}
            onClose={() => navigation.navigate('Profile')}
            onTeamJoin={(team) =>
              handlers.handleTeamJoin(team, navigation, refresh)
            }
            onTeamSelect={(team) => handlers.handleTeamView(team, navigation)}
            onRefresh={refresh}
            onCreateTeam={() => {
              navigation.navigate('TeamCreation');
            }}
            showHeader={true}
            showCloseButton={false}
            currentUserPubkey={currentUserNpub}
            navigation={navigation}
          />
        )}
      </Stack.Screen>

      {/* Enhanced Team Screen */}
      <Stack.Screen name="EnhancedTeamScreen" options={screenConfigurations.Team}>
        {({ navigation, route }) => {
          // Log raw route params first
          console.log('🔍 AppNavigator: RAW route.params:', route.params);
          console.log('🔍 AppNavigator: route.params keys:', route.params ? Object.keys(route.params) : 'undefined');
          console.log('🔍 AppNavigator: userIsCaptain in params?', route.params?.userIsCaptain);

          const { team, userIsMember = false, currentUserNpub, userIsCaptain = false } = route.params || {};

          console.log('🚨 AppNavigator: Route params AFTER destructuring:', {
            hasTeam: !!team,
            userIsMember,
            currentUserNpub: currentUserNpub?.slice(0, 20) + '...',
            userIsCaptain,
            allParamKeys: Object.keys(route.params || {})
          });

          return (
            <EnhancedTeamScreen
              data={{
                team: (() => {
                  console.log('🔍 AppNavigator: Team data being passed to EnhancedTeamScreen:', {
                    id: team?.id,
                    name: team?.name,
                    captainId: team?.captainId ? team.captainId.slice(0, 10) + '...' : 'missing',
                    fullTeamKeys: team ? Object.keys(team) : 'no team object',
                  });
                  return team;
                })(), // Pass original team data to preserve all captain fields
                leaderboard: [],
                events: [],
                challenges: [],
              }}
              onMenuPress={() => handlers.handleMenuPress(navigation)}
              onCaptainDashboard={() => {
                console.log('🎖️ AppNavigator: Captain dashboard handler called');
                console.log('🎖️ AppNavigator: Team data:', {
                  hasTeam: !!team,
                  teamId: team?.id,
                  teamName: team?.name,
                  userIsCaptain
                });
                // Pass team information to the captain dashboard handler
                if (team && team.id) {
                  handlers.handleCaptainDashboard(navigation, team.id, team.name);
                } else {
                  console.error('❌ AppNavigator: Team data missing for captain dashboard');
                  handlers.handleCaptainDashboard(navigation);
                }
              }}
              onAddChallenge={() => handlers.handleAddChallenge(navigation)}
              onEventPress={(eventId, eventData) =>
                navigation.navigate('EventDetail', { eventId, eventData })
              }
              onChallengePress={(challengeId) =>
                navigation.navigate('ChallengeDetail', { challengeId })
              }
              onNavigateToProfile={() => navigation.navigate('Profile')}
              onLeaveTeam={() => handlers.handleLeaveTeam(navigation, refresh)}
              onTeamDiscovery={() => navigation.navigate('Team')}
              onJoinTeam={() =>
                handlers.handleTeamJoin(team, navigation, refresh)
              }
              showJoinButton={!userIsMember}
              userIsMember={userIsMember}
              currentUserNpub={currentUserNpub} // Pass working npub to avoid AsyncStorage corruption
              userIsCaptain={userIsCaptain} // Pass correctly calculated captain status from navigation
            />
          );
        }}
      </Stack.Screen>

      {/* Profile Screen */}
      <Stack.Screen name="Profile" options={screenConfigurations.Profile}>
        {({ navigation }) =>
          profileData ? (
            <ProfileScreen
              data={profileData}
              onNavigateToTeam={() => navigation.navigate('Team')}
              onNavigateToTeamDiscovery={() =>
                navigation.navigate('TeamDiscovery')
              }
              onViewCurrentTeam={() => navigation.navigate('Team')}
              onCaptainDashboard={() =>
                handlers.handleCaptainDashboard(navigation)
              }
              onTeamCreation={() => handlers.handleTeamCreation(navigation)}
              onEditProfile={() => navigation.navigate('ProfileEdit')}
              onSyncSourcePress={handlers.handleSyncSourcePress}
              onManageSubscription={handlers.handleManageSubscription}
              onHelp={() => handlers.handleHelp(navigation)}
              onContactSupport={() => handlers.handleContactSupport(navigation)}
              onPrivacyPolicy={() => handlers.handlePrivacyPolicy(navigation)}
              onSignOut={() => handlers.handleSignOut(navigation)}
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.colors.text }}>
                Loading Profile...
              </Text>
            </View>
          )
        }
      </Stack.Screen>

      {/* Profile Edit Screen */}
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />

      {/* Wallet Screen */}
      <Stack.Screen name="Wallet" options={screenConfigurations.Wallet}>
        {({ navigation }) =>
          walletData ? (
            <WalletScreen
              data={walletData}
              onBack={() => navigation.goBack()}
              onSettings={handlers.handleSettings}
              onViewAllActivity={handlers.handleViewAllActivity}
              onSendComplete={(amount, destination) =>
                console.log('Send:', amount, 'to', destination)
              }
              onReceiveComplete={(invoice) =>
                console.log('Received invoice:', invoice)
              }
              onAutoWithdrawChange={(enabled, threshold) =>
                console.log('Auto-withdraw:', enabled, threshold)
              }
              onWithdraw={() => console.log('Withdraw')}
              onRetryConnection={() => console.log('Retry connection')}
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.colors.text }}>
                Loading Wallet...
              </Text>
            </View>
          )
        }
      </Stack.Screen>

      {/* Captain Dashboard Screen */}
      <Stack.Screen
        name="CaptainDashboard"
        options={screenConfigurations.CaptainDashboard}
      >
        {({ navigation, route }) => {
          // Get team and captain data from route params if passed
          const { teamId, teamName, isCaptain } = route.params || {};

          // Use captain dashboard data or create a minimal version
          const dashboardData = captainDashboardData || {
            team: {
              id: teamId || 'unknown',
              name: teamName || 'Team',
              memberCount: 0,
              activeEvents: 0,
              activeChallenges: 0,
              prizePool: 0,
            },
            members: [],
            recentActivity: [],
          };

          // Always render the screen - let it handle its own authorization
          return (
            <CaptainDashboardScreen
              data={dashboardData}
              teamId={dashboardData.team.id}
              captainId={user?.npub || user?.id || ''}
              userNpub={user?.npub} // Pass user npub for auth fallback
              navigation={navigation} // Pass navigation prop for re-auth flow
              onNavigateToTeam={() => navigation.navigate('Team')}
              onNavigateToProfile={() => navigation.navigate('Profile')}
              onSettingsPress={handlers.handleSettings}
              onKickMember={handlers.handleKickMember}
              onViewAllActivity={handlers.handleViewAllActivity}
            />
          );
        }}
      </Stack.Screen>

      {/* Team Discovery Modal */}
      <Stack.Screen
        name="TeamDiscovery"
        options={screenConfigurations.TeamDiscovery}
      >
        {({ navigation, route }) => (
          <TeamDiscoveryScreen
            teams={availableTeams}
            isLoading={isLoading}
            onClose={() => {
              handlers.handleTeamDiscoveryClose();
              navigation.goBack();
            }}
            onTeamJoin={(team) =>
              handlers.handleTeamJoin(team, navigation, refresh)
            }
            onTeamSelect={(team) => handlers.handleTeamView(team, navigation)}
            onRefresh={refresh}
            onCreateTeam={
              user?.role === 'captain'
                ? () => {
                    navigation.goBack(); // Close team discovery
                    navigation.navigate('TeamCreation'); // Navigate to team creation
                  }
                : undefined
            }
            navigation={navigation}
          />
        )}
      </Stack.Screen>


      {/* Team Creation Wizard */}
      <Stack.Screen
        name="TeamCreation"
        options={screenConfigurations.TeamCreation}
      >
        {({ navigation }) => {
          // Only render TeamCreationWizard if user is authenticated
          if (!user) {
            return (
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.background,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.colors.text }}>
                  Please sign in first
                </Text>
              </View>
            );
          }

          return (
            <TeamCreationWizard
              currentUser={user}
              onComplete={(teamData, teamId) =>
                handlers.handleTeamCreationComplete(
                  teamData,
                  navigation,
                  teamId
                )
              }
              onNavigateToTeam={(teamId) =>
                handlers.handleNavigateToTeam(teamId, navigation)
              }
              onCancel={() => navigation.goBack()}
            />
          );
        }}
      </Stack.Screen>

      {/* Event Detail Screen */}
      <Stack.Screen
        name="EventDetail"
        options={screenConfigurations.EventDetail}
        component={EventDetailScreen}
      />

      {/* Challenge Detail Screen */}
      <Stack.Screen
        name="ChallengeDetail"
        options={screenConfigurations.ChallengeDetail}
        component={ChallengeDetailScreen}
      />

      {/* Competitions List Screen */}
      <Stack.Screen
        name="CompetitionsList"
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
        component={CompetitionsListScreen}
      />

      {/* Workout History Screen */}
      <Stack.Screen
        name="WorkoutHistory"
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
        component={WorkoutHistoryScreen}
      />

      {/* Challenge Leaderboard Screen */}
      <Stack.Screen
        name="ChallengeLeaderboard"
        component={ChallengeLeaderboardScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Global Challenge Wizard Screen */}
      <Stack.Screen
        name="ChallengeWizard"
        options={{
          ...defaultScreenOptions,
          headerShown: false,
          presentation: 'modal',
        }}
      >
        {({ navigation, route }) => (
          <GlobalChallengeWizard
            onComplete={() => {
              navigation.goBack();
              refresh(); // Refresh competitions list
            }}
            onCancel={() => navigation.goBack()}
            preselectedOpponent={route.params?.preselectedOpponent}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
