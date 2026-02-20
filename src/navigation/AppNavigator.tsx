/**
 * AppNavigator - Main navigation container for the RUNSTR app
 * Handles stack navigation between screens and modal presentations
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
// Navigation container provided by Expo Router - removed NavigationContainer import
// ✅ PERFORMANCE: Using native stack for faster transitions (runs on UI thread)
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { theme } from '../styles/theme';

// Screens
// import { EnhancedTeamScreen } from '../screens/EnhancedTeamScreen'; // REMOVED: Dead code - not used in authenticated flow
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { TeamDiscoveryScreen } from '../screens/TeamDiscoveryScreen';
import { CaptainDashboardScreen } from '../screens/CaptainDashboardScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { LeagueDetailScreen } from '../screens/LeagueDetailScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { CompetitionsListScreen } from '../screens/CompetitionsListScreen';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import { MyTeamsScreen } from '../screens/MyTeamsScreen';
import { HealthProfileScreen } from '../screens/HealthProfileScreen';
import { FitnessTestResultsScreen } from '../screens/FitnessTestResultsScreen';
import { SatlantisDiscoveryScreen } from '../screens/satlantis/SatlantisDiscoveryScreen';
import { SatlantisEventDetailScreen } from '../screens/satlantis/SatlantisEventDetailScreen';
import { RunningBitcoinDetailScreen } from '../screens/events/RunningBitcoinDetailScreen';
import { EinundzwanzigDetailScreen } from '../screens/events/EinundzwanzigDetailScreen';
import { JanuaryWalkingDetailScreen } from '../screens/events/JanuaryWalkingDetailScreen';
import { DynamicEventDetailScreen } from '../screens/events/DynamicEventDetailScreen';
import { JournalHistoryScreen } from '../screens/JournalHistoryScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { DonateScreen } from '../screens/DonateScreen';
import { TeamsScreen } from '../screens/TeamsScreen';
import { AdvancedAnalyticsScreen } from '../screens/AdvancedAnalyticsScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivityTrackerScreen } from '../screens/activity/ActivityTrackerScreen';
import { Season2Screen } from '../screens/season2/Season2Screen';
import { CompeteScreen } from '../screens/CompeteScreen';
import { LeaderboardsScreen } from '../screens/LeaderboardsScreen';
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
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Clubs: undefined;
  EnhancedTeamScreen: {
    team: any;
    userIsMember?: boolean;
    currentUserNpub?: string;
    userIsCaptain?: boolean;
  }; // Individual team dashboard
  Profile: undefined;
  ProfileEdit: undefined;
  Wallet: undefined;
  CaptainDashboard: { teamId?: string; teamName?: string; isCaptain?: boolean };
  TeamDiscovery: {
    isOnboarding?: boolean;
    currentTeamId?: string;
  };
  EventDetail: { eventId: string; eventData?: any };
  LeagueDetail: { leagueId: string; leagueData?: any };
  CompetitionsList: undefined;
  WorkoutHistory: { userId: string; pubkey: string };
  MyTeams: undefined;
  HealthProfile: undefined;
  FitnessTestResults: { testId: string };
  SatlantisDiscovery: undefined;
  SatlantisEventDetail: { eventId: string; eventPubkey: string };
  RunningBitcoinDetail: undefined;
  EinundzwanzigDetail: undefined;
  JanuaryWalkingDetail: undefined;
  Teams: undefined;
  Rewards: undefined;
  Donate: undefined;
  AdvancedAnalytics: undefined;
  Events: undefined;
  Settings: undefined;
  Exercise: undefined;
  Compete: undefined;
  DynamicEventDetail: { eventId: string };
  JournalHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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

      {/* Main Team Screen - Always shows Team Discovery */}
      <Stack.Screen name="Clubs" options={screenConfigurations.Team}>
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
            showHeader={true}
            showCloseButton={false}
            currentUserPubkey={user?.npub}
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
              onNavigateToTeam={() => navigation.navigate('Clubs')}
              onNavigateToTeamDiscovery={() =>
                navigation.navigate('TeamDiscovery')
              }
              onViewCurrentTeam={() => navigation.navigate('Clubs')}
              onCaptainDashboard={() =>
                handlers.handleCaptainDashboard(navigation)
              }
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
              onNavigateToTeam={() => navigation.navigate('Clubs')}
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
            navigation={navigation}
          />
        )}
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

      {/* Health Profile Screen */}
      <Stack.Screen
        name="HealthProfile"
        component={HealthProfileScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Fitness Test Results Screen */}
      <Stack.Screen
        name="FitnessTestResults"
        component={FitnessTestResultsScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Satlantis Discovery Screen - Race Events Feed */}
      <Stack.Screen
        name="SatlantisDiscovery"
        component={SatlantisDiscoveryScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Satlantis Event Detail Screen */}
      <Stack.Screen
        name="SatlantisEventDetail"
        component={SatlantisEventDetailScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Running Bitcoin Challenge Detail Screen */}
      <Stack.Screen
        name="RunningBitcoinDetail"
        component={RunningBitcoinDetailScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Einundzwanzig Fitness Challenge Detail Screen */}
      <Stack.Screen
        name="EinundzwanzigDetail"
        component={EinundzwanzigDetailScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* January Walking Contest Detail Screen */}
      <Stack.Screen
        name="JanuaryWalkingDetail"
        component={JanuaryWalkingDetailScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Teams Screen - Hardcoded teams + charities selection */}
      <Stack.Screen
        name="Teams"
        component={TeamsScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Rewards Screen - Wallet + earnings management */}
      <Stack.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Donate Screen - Charity donations */}
      <Stack.Screen
        name="Donate"
        component={DonateScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Advanced Analytics Screen - Stats dashboard */}
      <Stack.Screen
        name="AdvancedAnalytics"
        component={AdvancedAnalyticsScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Events Screen - Leaderboards (5K/10K/21K/Marathon) */}
      <Stack.Screen
        name="Events"
        component={EventsScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Settings Screen */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Journal History Screen - Full journal entry list */}
      <Stack.Screen
        name="JournalHistory"
        component={JournalHistoryScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Exercise Screen - Activity Tracker (accessed from Profile card) */}
      <Stack.Screen
        name="Exercise"
        component={ActivityTrackerScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
      />

      {/* Compete Screen - Events/Competitions (accessed from Profile card) */}
      {/* ✅ PERFORMANCE: Using component reference instead of inline function */}
      <Stack.Screen
        name="Compete"
        component={CompeteScreen}
        options={defaultScreenOptions}
      />

      {/* Season2 Screen - Season II Competition Details */}
      {/* ✅ PERFORMANCE: Using component reference instead of inline function */}
      <Stack.Screen
        name="Season2"
        component={Season2Screen}
        options={defaultScreenOptions}
      />

      {/* Leaderboards Screen - Daily Leaderboards */}
      {/* ✅ PERFORMANCE: Using component reference instead of inline function */}
      <Stack.Screen
        name="Leaderboards"
        component={LeaderboardsScreen}
        options={defaultScreenOptions}
      />

      {/* Dynamic Event Detail - Data-driven competitions from Supabase */}
      <Stack.Screen
        name="DynamicEventDetail"
        component={DynamicEventDetailScreen}
        options={{
          ...defaultScreenOptions,
          headerShown: false,
        }}
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
