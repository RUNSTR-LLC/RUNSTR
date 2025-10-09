/**
 * RUNSTR App Root Component
 * Simplified app using AuthContext for state management
 * iOS-inspired architecture with single source of truth
 */

// SENIOR DEVELOPER FIX: Initialize WebSocket polyfill early
import { initializeWebSocketPolyfill } from './utils/webSocketPolyfill';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Initialize background location task (must be imported early for TaskManager.defineTask to execute)
import './services/activity/BackgroundLocationTask';

import React from 'react';
import { StatusBar, View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Error Boundary Component to catch runtime errors during initialization
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 AppErrorBoundary caught error:', error);
    console.error('🚨 Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={errorStyles.container}>
            <Text style={errorStyles.title}>🚨 App Error</Text>
            <Text style={errorStyles.error}>
              {this.state.error?.message || 'Unknown error occurred'}
            </Text>
            <Text style={errorStyles.instruction}>Please restart the app</Text>
          </View>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationDataProvider } from './contexts/NavigationDataContext';
import { AppNavigator } from './navigation/AppNavigator';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { createStackNavigator } from '@react-navigation/stack';
import { TeamCreationWizard } from './components/wizards/TeamCreationWizard';
import { GlobalChallengeWizard } from './components/wizards/GlobalChallengeWizard';
import { EventDetailScreen } from './screens/EventDetailScreen';
import { EventCaptainDashboardScreen } from './screens/EventCaptainDashboardScreen';
import { LeagueDetailScreen } from './screens/LeagueDetailScreen';
import { ChallengeDetailScreen } from './screens/ChallengeDetailScreen';
// Use SimpleTeamScreen instead of EnhancedTeamScreen to avoid freeze issues
const SimpleTeamScreen = React.lazy(() => {
  console.log('[App.tsx] 🔄 Starting lazy import of SimpleTeamScreen');
  return import('./screens/SimpleTeamScreen').then(module => {
    console.log('[App.tsx] ✅ SimpleTeamScreen module loaded');
    return module;
  });
});
import { CaptainDashboardScreen } from './screens/CaptainDashboardScreen';
import { HelpSupportScreen } from './screens/HelpSupportScreen';
import { ContactSupportScreen } from './screens/ContactSupportScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { SplashInitScreen } from './screens/SplashInitScreen';
import { CompetitionsListScreen } from './screens/CompetitionsListScreen';
import { WorkoutHistoryScreen } from './screens/WorkoutHistoryScreen';
import { MyTeamsScreen } from './screens/MyTeamsScreen';
import { ProfileEditScreen } from './screens/ProfileEditScreen';
import { User } from './types';
import { useWalletStore } from './store/walletStore';
import { appInitializationService } from './services/initialization/AppInitializationService';
import { theme } from './styles/theme';
import unifiedCache from './services/cache/UnifiedNostrCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for authenticated app navigation
type AuthenticatedStackParamList = {
  SplashInit: undefined;
  Auth: undefined;
  Main: undefined;
  MainTabs: undefined;
  Onboarding: { nsec?: string };
  TeamCreation: undefined;
  EnhancedTeamScreen: { team: any; userIsMember?: boolean; currentUserNpub?: string; userIsCaptain?: boolean };
  EventDetail: { eventId: string };
  EventCaptainDashboard: { eventId: string; eventData: any };
  LeagueDetail: { leagueId: string; leagueData?: any };
  ChallengeDetail: { challengeId: string };
  CaptainDashboard: { teamId?: string; teamName?: string; teamCaptainId?: string; isCaptain?: boolean; userNpub?: string };
  Settings: any;
  HelpSupport: undefined;
  ContactSupport: undefined;
  PrivacyPolicy: undefined;
  CompetitionsList: undefined;
  ChallengeWizard: undefined;
  ChallengeLeaderboard: { challengeId: string };
  WorkoutHistory: { userId: string; pubkey: string };
  MyTeams: undefined;
  ProfileEdit: undefined;
};

const AuthenticatedStack = createStackNavigator<AuthenticatedStackParamList>();

// Main app content that uses the AuthContext
const AppContent: React.FC = () => {
  const {
    isInitializing,
    isAuthenticated,
    currentUser,
    connectionStatus,
    isConnected,
    initError,
    signOut
  } = useAuth();

  const [onboardingCompleted, setOnboardingCompleted] = React.useState<boolean | null>(null);
  const [prefetchCompleted, setPrefetchCompleted] = React.useState(false);

  // ✅ PERFORMANCE: Use cache-first strategy - show app immediately if ANY cache exists
  React.useEffect(() => {
    const checkPrefetch = async () => {
      if (isAuthenticated) {
        // Check if cache exists
        const cacheStats = unifiedCache.getStats();
        const hasCachedData = cacheStats.size > 0;

        console.log('📊 App: Cache-first check - cache size:', cacheStats.size);

        // Show app immediately if we have ANY cached data
        // First-time users (no cache) will see SplashInit
        // Returning users (has cache) see app immediately, refresh happens in background
        setPrefetchCompleted(hasCachedData);
      } else {
        setPrefetchCompleted(false);
      }
    };
    checkPrefetch();
  }, [isAuthenticated]);

  // Check onboarding completion status when user becomes authenticated
  React.useEffect(() => {
    const checkOnboarding = async () => {
      if (isAuthenticated && currentUser) {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

        // Check if onboarding was already completed
        const completed = await AsyncStorage.getItem('@runstr:onboarding_completed');

        // Check if this is a new signup (from "Start" button)
        const isNewSignup = await AsyncStorage.getItem('@runstr:is_new_signup');

        // Only show onboarding if:
        // 1. This is a new signup (Start button was clicked)
        // 2. AND onboarding hasn't been completed yet
        const needsOnboarding = isNewSignup === 'true' && completed !== 'true';

        setOnboardingCompleted(!needsOnboarding);
        console.log('🎯 App: Onboarding check - isNewSignup:', isNewSignup === 'true', 'completed:', completed === 'true', 'needsOnboarding:', needsOnboarding);
      } else {
        setOnboardingCompleted(null);
      }
    };
    checkOnboarding();
  }, [isAuthenticated, currentUser]);

  // PERFORMANCE OPTIMIZATION: App state detection for smart resume
  const walletStore = useWalletStore();
  const appState = React.useRef(AppState.currentState);
  const backgroundTime = React.useRef<number>(0);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;

      // App going to background
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
        console.log('[AppState] App going to background');
      }

      // App returning to foreground
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        const timeInBackground = Date.now() - backgroundTime.current;
        const secondsInBackground = Math.round(timeInBackground / 1000);

        console.log(`[AppState] App returning to foreground (${secondsInBackground}s in background)`);

        // Smart refresh strategy based on time in background
        if (isAuthenticated && walletStore.isInitialized) {
          if (timeInBackground < 60 * 1000) {
            // < 1 minute: No refresh needed
            console.log('[AppState] Quick return - no refresh needed');
          } else if (timeInBackground < 5 * 60 * 1000) {
            // 1-5 minutes: Quick resume with background sync
            console.log('[AppState] Medium return - using quick resume');
            walletStore.initialize(undefined, true); // Quick resume mode
          } else {
            // > 5 minutes: Full refresh
            console.log('[AppState] Long return - triggering full refresh');
            walletStore.refreshBalance();
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, walletStore.isInitialized]);

  // Authenticated app with bottom tabs and team creation modal
  const AuthenticatedNavigator: React.FC<{ user: User }> = ({ user }) => {
    // Initialize app data when user is authenticated
    React.useEffect(() => {
      const initializeData = async () => {
        try {
          // CRITICAL FIX: Get actual hex pubkey from AsyncStorage, NOT synthetic user.id
          // user.id is 'nostr_hh6sr85uum' but we need actual hex for Nostr queries
          const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
          const npub = await AsyncStorage.getItem('@runstr:npub');
          const pubkey = hexPubkey || npub;

          if (!pubkey) {
            console.warn('[App] Cannot initialize app data: no pubkey available');
            return;
          }

          console.log('[App] 🚀 Triggering app data initialization for authenticated user...');

          // Non-blocking background initialization
          await appInitializationService.initializeAppData(pubkey);
        } catch (error) {
          console.error('[App] ❌ App data initialization error:', error);
          // Don't block app - initialization errors are non-critical
        }
      };

      initializeData();
    }, [user.id]);

    return (
      <AuthenticatedStack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
        }}
      >
        {/* Main bottom tabs */}
        <AuthenticatedStack.Screen
          name="MainTabs"
          options={{ headerShown: false }}
        >
          {({ navigation }) => (
            <BottomTabNavigator
              onNavigateToTeamCreation={() => {
                navigation.navigate('TeamCreation');
              }}
              onSignOut={signOut}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Onboarding Screen */}
        <AuthenticatedStack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />

        {/* Team Creation Modal */}
        <AuthenticatedStack.Screen
          name="TeamCreation"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        >
          {({ navigation }) => (
            <TeamCreationWizard
              currentUser={user}
              onComplete={(teamData, teamId) => {
                console.log('Team creation complete:', teamData, teamId);
                navigation.goBack(); // Return to tabs
              }}
              onCancel={() => {
                navigation.goBack(); // Return to tabs
              }}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Enhanced Team Screen */}
        <AuthenticatedStack.Screen
          name="EnhancedTeamScreen"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => {
            console.log('[App.tsx] 🚀 EnhancedTeamScreen route rendering');
            const { team, userIsMember = false, currentUserNpub, userIsCaptain = false } = route.params || {};
            console.log('[App.tsx] 📦 Route params:', {
              hasRouteParams: !!route.params,
              hasTeam: !!team,
              teamId: team?.id,
              teamName: team?.name,
              teamKeys: team ? Object.keys(team).length : 0,
              allTeamKeys: team ? Object.keys(team) : [],
              userIsMember,
              userIsCaptain,
              currentUserNpub: currentUserNpub?.slice(0, 20) + '...'
            });

            // Safety check: if no team data, show error
            if (!team || !team.id) {
              console.error('[App.tsx] ❌ No valid team data in route params');
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                  <Text style={{ color: theme.colors.text, marginBottom: 20 }}>Team data not available</Text>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ padding: 12, backgroundColor: theme.colors.cardBackground, borderRadius: 8 }}
                  >
                    <Text style={{ color: theme.colors.text }}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <React.Suspense
                fallback={
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                    {console.log('[App.tsx] ⏳ SUSPENSE FALLBACK RENDERING - Waiting for lazy component')}
                    <ActivityIndicator size="large" color={theme.colors.text} />
                  </View>
                }
              >
                <SimpleTeamScreen
                  data={{
                    team: team,
                    leaderboard: [],
                    events: [],
                    challenges: [],
                  }}
                  onBack={() => navigation.goBack()}
                  onCaptainDashboard={() => {
                    console.log('Captain dashboard from EnhancedTeamScreen');
                    console.log('Navigating to CaptainDashboard with team:', team?.id);
                    console.log('Team object has captainId field:', 'captainId' in (team || {}));
                    console.log('Team captainId value:', team?.captainId);
                    console.log('Team captainId length:', team?.captainId?.length);
                    console.log('Team captainId format:', team?.captainId?.startsWith('npub') ? 'npub' : team?.captainId?.length === 64 ? 'hex' : 'other');
                    console.log('Passing userNpub:', currentUserNpub?.slice(0, 20) + '...');

                    // Ensure we pass the captain ID in hex format
                    const teamCaptainIdToPass = team?.captainId || '';
                    console.log('Final teamCaptainId being passed:', teamCaptainIdToPass?.slice(0, 20) + '...');

                    navigation.navigate('CaptainDashboard', {
                      teamId: team?.id,
                      teamName: team?.name,
                      teamCaptainId: teamCaptainIdToPass,  // Pass the team's captain ID
                      isCaptain: true,
                      userNpub: currentUserNpub
                    });
                  }}
                  onAddChallenge={() => console.log('Add challenge')}
                  onEventPress={(eventId, eventData) => navigation.navigate('EventDetail', { eventId, eventData })}
                  onLeaguePress={(leagueId, leagueData) => navigation.navigate('LeagueDetail', { leagueId, leagueData })}
                  onChallengePress={(challengeId) => navigation.navigate('ChallengeDetail', { challengeId })}
                  showJoinButton={!userIsMember}
                  userIsMemberProp={userIsMember}
                  currentUserNpub={currentUserNpub}
                  userIsCaptain={userIsCaptain}
                />
              </React.Suspense>
            );
          }}
        </AuthenticatedStack.Screen>

        {/* Event Detail Screen */}
        <AuthenticatedStack.Screen
          name="EventDetail"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <EventDetailScreen
              route={route}
              navigation={navigation}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Event Captain Dashboard Screen */}
        <AuthenticatedStack.Screen
          name="EventCaptainDashboard"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <EventCaptainDashboardScreen
              route={route}
              navigation={navigation}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* League Detail Screen */}
        <AuthenticatedStack.Screen
          name="LeagueDetail"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <LeagueDetailScreen
              route={route}
              navigation={navigation}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Challenge Detail Screen */}
        <AuthenticatedStack.Screen
          name="ChallengeDetail"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <ChallengeDetailScreen
              route={route}
              navigation={navigation}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Captain Dashboard Screen */}
        <AuthenticatedStack.Screen
          name="CaptainDashboard"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => {
            const { teamId, teamName, teamCaptainId, isCaptain, userNpub } = route.params || {};
            return (
              <CaptainDashboardScreen
                data={{
                  team: {
                    id: teamId || '',
                    name: teamName || 'Team',
                    memberCount: 0,
                    activeEvents: 0,
                    activeChallenges: 0,
                    prizePool: 0,
                  },
                  members: [],
                  recentActivity: [],
                }}
                teamId={teamId || ''}
                captainId={teamCaptainId || user.npub || user.id}
                userNpub={userNpub}
                onNavigateToTeam={() => navigation.goBack()}
                onNavigateToProfile={() => navigation.goBack()}
                onSettingsPress={() => console.log('Settings')}
                onKickMember={(memberId) => console.log('Kick member:', memberId)}
                onViewAllActivity={() => console.log('View all activity')}
              />
            );
          }}
        </AuthenticatedStack.Screen>

        {/* Settings Screen */}
        <AuthenticatedStack.Screen
          name="Settings"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <SettingsScreen
              currentTeam={route.params?.currentTeam}
              onNavigateToTeamDiscovery={route.params?.onNavigateToTeamDiscovery}
              onViewCurrentTeam={route.params?.onViewCurrentTeam}
              onCaptainDashboard={route.params?.onCaptainDashboard}
              onHelp={() => navigation.navigate('HelpSupport')}
              onContactSupport={() => navigation.navigate('ContactSupport')}
              onPrivacyPolicy={() => navigation.navigate('PrivacyPolicy')}
              onSignOut={async () => {
                // Reset initialization state on logout
                appInitializationService.reset();
                await signOut();
                // AuthContext state change will trigger App.tsx to show login screen
              }}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Help & Support Screen */}
        <AuthenticatedStack.Screen
          name="HelpSupport"
          options={{
            headerShown: false,
          }}
          component={HelpSupportScreen}
        />

        {/* Contact Support Screen */}
        <AuthenticatedStack.Screen
          name="ContactSupport"
          options={{
            headerShown: false,
          }}
          component={ContactSupportScreen}
        />

        {/* Privacy Policy Screen */}
        <AuthenticatedStack.Screen
          name="PrivacyPolicy"
          options={{
            headerShown: false,
          }}
          component={PrivacyPolicyScreen}
        />

        {/* Competitions List Screen */}
        <AuthenticatedStack.Screen
          name="CompetitionsList"
          options={{
            headerShown: false,
          }}
          component={CompetitionsListScreen}
        />

        {/* Workout History Screen */}
        <AuthenticatedStack.Screen
          name="WorkoutHistory"
          options={{
            headerShown: false,
          }}
          component={WorkoutHistoryScreen}
        />

        {/* My Teams Screen */}
        <AuthenticatedStack.Screen
          name="MyTeams"
          options={{
            headerShown: false,
          }}
          component={MyTeamsScreen}
        />

        {/* Profile Edit Screen */}
        <AuthenticatedStack.Screen
          name="ProfileEdit"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
          component={ProfileEditScreen}
        />

        {/* Challenge Wizard Screen */}
        <AuthenticatedStack.Screen
          name="ChallengeWizard"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        >
          {({ navigation }) => (
            <GlobalChallengeWizard
              onComplete={() => {
                console.log('Challenge created successfully');
                navigation.goBack();
              }}
              onCancel={() => navigation.goBack()}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Challenge Leaderboard Screen (placeholder) */}
        <AuthenticatedStack.Screen
          name="ChallengeLeaderboard"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textBright, fontSize: 18, marginBottom: 20 }}>Challenge Leaderboard</Text>
              <Text style={{ color: '#666', fontSize: 14 }}>Challenge ID: {route.params?.challengeId}</Text>
              <Text style={{ color: '#666', fontSize: 14, marginTop: 10 }}>Coming Soon</Text>
              <TouchableOpacity
                style={{ marginTop: 30, padding: 12, backgroundColor: theme.colors.orangeDeep, borderRadius: 8 }}
                onPress={() => navigation.goBack()}
              >
                <Text style={{ color: '#000' }}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </AuthenticatedStack.Screen>
      </AuthenticatedStack.Navigator>
    );
  };

  // Show error screen if initialization failed
  if (initError && !isInitializing) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>🚨 Initialization Error</Text>
          <Text style={errorStyles.error}>{initError}</Text>
          <Text style={errorStyles.instruction}>Please restart the app</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Simplified navigation - no more SplashInit screen
  // Show login immediately if not authenticated

  // Refresh onboarding status when app gains focus
  const handleNavigationStateChange = React.useCallback(async () => {
    if (isAuthenticated && currentUser) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const completed = await AsyncStorage.getItem('@runstr:onboarding_completed');
      const isNewSignup = await AsyncStorage.getItem('@runstr:is_new_signup');

      // Onboarding is complete if either:
      // 1. The completed flag is set, OR
      // 2. This is NOT a new signup (returning user)
      const needsOnboarding = isNewSignup === 'true' && completed !== 'true';

      if (!needsOnboarding && onboardingCompleted === false) {
        console.log('🎯 App: Onboarding completed, refreshing to main app');
        setOnboardingCompleted(true);
      }
    }
  }, [isAuthenticated, currentUser, onboardingCompleted]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <NavigationContainer
        onStateChange={handleNavigationStateChange}
      >
        {(() => {
          console.log(
            '🚀 AppContent: Navigation decision - isAuthenticated:',
            isAuthenticated,
            'currentUser:',
            !!currentUser,
            'prefetchCompleted:',
            prefetchCompleted,
            'isInitializing:',
            isInitializing
          );

          // Show login immediately if not authenticated
          if (!isAuthenticated) {
            return <AppNavigator initialRoute="Login" isFirstTime={true} />;
          }

          // ✅ PERFORMANCE: Only show SplashInit for first-time users (no cache at all)
          // Returning users see app immediately with cached data, refresh happens in background
          if (isAuthenticated && !prefetchCompleted) {
            console.log('🚀 App: First-time user - showing SplashInit for initial data load');
            return (
              <SplashInitScreen
                onComplete={() => {
                  console.log('✅ App: Initial data loaded, showing app');
                  setPrefetchCompleted(true);
                }}
              />
            );
          }

          // User is authenticated but profile still loading
          if (isAuthenticated && !currentUser) {
            return (
              <View style={errorStyles.container}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={errorStyles.instruction}>Loading your profile...</Text>
              </View>
            );
          }

          // Authenticated with loaded profile - check onboarding before showing main app
          if (isAuthenticated && currentUser) {
            // If onboarding status is still being checked, show loading
            if (onboardingCompleted === null) {
              return (
                <View style={errorStyles.container}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={errorStyles.instruction}>Setting up your account...</Text>
                </View>
              );
            }

            // If onboarding not completed, show onboarding flow
            if (onboardingCompleted === false) {
              console.log('🎯 App: Showing onboarding for new user');
              return (
                <AuthenticatedStack.Navigator screenOptions={{ headerShown: false }}>
                  <AuthenticatedStack.Screen name="Onboarding" component={OnboardingScreen} />
                </AuthenticatedStack.Navigator>
              );
            }

            // Onboarding completed - show main app
            return <AuthenticatedNavigator user={currentUser} />;
          }

          // Fallback to login
          return <AppNavigator initialRoute="Login" isFirstTime={true} />;
        })()}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Prevent splash screen from auto-hiding immediately
ExpoSplashScreen.preventAutoHideAsync();

// Main App component with AuthProvider wrapper and Error Boundary
export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        // SENIOR DEVELOPER FIX: Initialize WebSocket polyfill immediately with error handling
        try {
          initializeWebSocketPolyfill();
        } catch (error) {
          console.error('🚨 WebSocket polyfill initialization failed:', error);
          // App can continue without polyfill in most cases
        }

        // Give app a moment to ensure black background is set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Pre-load any critical resources here if needed
        console.log('🚀 App initialization complete');
        
      } catch (e) {
        console.warn('App initialization warning:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      // Hide the splash screen once the app is ready and layout is complete
      await ExpoSplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // Keep showing the native splash screen
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <NavigationDataProvider>
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <AppContent />
          </View>
        </NavigationDataProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#ff4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  error: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  instruction: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
});
