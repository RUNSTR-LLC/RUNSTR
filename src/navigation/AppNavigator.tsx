/**
 * AppNavigator - Main navigation container for the RUNSTR app
 * Handles stack navigation between screens and modal presentations
 */

import React from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
// Navigation container provided by Expo Router - removed NavigationContainer import
import { createStackNavigator } from '@react-navigation/stack';

import { theme } from '../styles/theme';

// Screens
// import { EnhancedTeamScreen } from '../screens/EnhancedTeamScreen'; // REMOVED: Dead code - not used in authenticated flow
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { TeamDiscoveryScreen } from '../screens/TeamDiscoveryScreen';
import { CaptainDashboardScreen } from '../screens/CaptainDashboardScreen';
import { TeamCreationWizard } from '../components/wizards/TeamCreationWizard';
import { GlobalChallengeWizard } from '../components/wizards/GlobalChallengeWizard';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { LeagueDetailScreen } from '../screens/LeagueDetailScreen';
import { ChallengeDetailScreen } from '../screens/ChallengeDetailScreen';
import { ChallengeLeaderboardScreen } from '../screens/ChallengeLeaderboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { CompetitionsListScreen } from '../screens/CompetitionsListScreen';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import { QRChallengeScanner } from '../screens/QRChallengeScanner';
import { MyTeamsScreen } from '../screens/MyTeamsScreen';
import type { DiscoveredNostrUser } from '../services/user/UserDiscoveryService';

// Navigation Configuration
import {
  screenConfigurations,
  defaultScreenOptions,
} from './screenConfigurations';
import { createNavigationHandlers } from './navigationHandlers';

// Data Hooks
import { useNavigationData } from '../contexts/NavigationDataContext';
import { useWalletStore } from '../store/walletStore';

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
  LeagueDetail: { leagueId: string; leagueData?: any };
  ChallengeDetail: { challengeId: string };
  CompetitionsList: undefined;
  ChallengeLeaderboard: { challengeId: string };
  ChallengeWizard: { preselectedOpponent?: DiscoveredNostrUser };
  QRChallengeScanner: undefined;
  WorkoutHistory: { userId: string; pubkey: string };
  MyTeams: undefined;
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

  // Wallet state from zustand store
  const { walletExists, createWallet } = useWalletStore();

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

      {/* REMOVED: EnhancedTeamScreen route - dead code, not used in authenticated flow */}
      {/* Authenticated users use AuthenticatedNavigator in App.tsx which renders SimpleTeamScreen */}

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
        {({ navigation }) => {
          // Check if wallet exists using walletStore
          if (!walletExists && walletData) {
            // No wallet found - show create button
            return (
              <View style={styles.walletEmptyContainer}>
                <View style={styles.walletEmptyContent}>
                  <Text style={styles.walletEmptyTitle}>No Wallet Found</Text>
                  <Text style={styles.walletEmptyDescription}>
                    Create a RUNSTR Lightning wallet to send and receive Bitcoin
                    zaps. Your wallet is stored securely on Nostr.
                  </Text>
                  <TouchableOpacity
                    style={styles.createWalletButton}
                    onPress={async () => {
                      await createWallet();
                      // Wallet created - screen will automatically update
                    }}
                  >
                    <Text style={styles.createWalletButtonText}>
                      Create RUNSTR Wallet
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.backButtonText}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          // Wallet exists or still loading - show normal wallet screen
          return walletData ? (
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
          );
        }}
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

      {/* League Detail Screen */}
      <Stack.Screen
        name="LeagueDetail"
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
        component={LeagueDetailScreen}
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

      {/* My Teams Screen */}
      <Stack.Screen
        name="MyTeams"
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
        component={MyTeamsScreen}
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

      {/* QR Challenge Scanner - Scan QR codes to accept challenges */}
      <Stack.Screen
        name="QRChallengeScanner"
        options={{
          ...defaultScreenOptions,
          headerShown: false,
          presentation: 'modal',
        }}
        component={QRChallengeScanner}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  walletEmptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  walletEmptyContent: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  walletEmptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  walletEmptyDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  createWalletButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  createWalletButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
});
