/**
 * RUNSTR App Root Component
 * Simplified app using AuthContext for state management
 * iOS-inspired architecture with single source of truth
 */

// SENIOR DEVELOPER FIX: Initialize WebSocket polyfill early
import { initializeWebSocketPolyfill } from './utils/webSocketPolyfill';
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as TaskManager from 'expo-task-manager';

// Background location task imported in index.js (before app initialization)
// Only import the task name - stopTracking is handled by simpleRunTracker
import {
  SIMPLE_TRACKER_TASK,
  simpleRunTracker,
} from './services/activity/SimpleRunTracker';

import React from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Platform,
  LogBox,
} from 'react-native';

// Suppress specific warnings that don't affect app functionality
LogBox.ignoreLogs([
  // This warning appears intermittently from third-party libraries
  'Text strings must be rendered within a <Text> component',
  // Expected when new users haven't configured NWC wallet yet
  '[NWC] ❌ User wallet initialization failed: No NWC connection string found',
  // Expected on iOS Simulator (no pedometer hardware) or when HealthKit permissions not granted
  '[DailyStepCounterService] Steps unavailable',
  // Normal Nostr relay responses during connection/query - not errors
  'Error from relay',
]);

let globalJsExceptionHandlerInstalled = false;

function installGlobalJsExceptionHandler(): void {
  if (globalJsExceptionHandlerInstalled) {
    return;
  }

  const errorUtils = (globalThis as any)?.ErrorUtils;
  if (
    !errorUtils ||
    typeof errorUtils.getGlobalHandler !== 'function' ||
    typeof errorUtils.setGlobalHandler !== 'function'
  ) {
    console.warn('[App] ErrorUtils global handler unavailable; skipping install');
    return;
  }

  const defaultHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('🚨 Global JS exception captured:', {
      message: error?.message,
      isFatal: Boolean(isFatal),
      stack: error?.stack,
    });

    if (typeof defaultHandler === 'function') {
      try {
        defaultHandler(error, isFatal);
      } catch (handlerError) {
        console.error('🚨 Default global error handler failed:', handlerError);
      }
    }
  });

  globalJsExceptionHandlerInstalled = true;
  console.log('[App] ✅ Installed global JS exception handler');
}

import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

// Initialize i18n for internationalization
import './i18n';
import { LanguagePreferenceService } from './services/i18n/LanguagePreferenceService';

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
        <SafeAreaProvider style={{ backgroundColor: '#000' }}>
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

/**
 * Screen-level error boundary for catching errors in individual screens
 * Prevents white screen crashes by showing error UI and allowing navigation back
 */
class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; navigation: any },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; navigation: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ScreenErrorBoundary caught error:', error);
    console.error('🔴 Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Screen Error</Text>
          <Text style={errorStyles.error}>
            {this.state.error?.message || 'Failed to load screen'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false, error: undefined });
              this.props.navigation.goBack();
            }}
            style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';

// Custom dark theme to prevent white flash during navigation
const RunstrDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000', // Matches theme.colors.background
    card: '#000000', // Navigation cards and headers
    border: '#1a1a1a', // Matches theme.colors.border
    primary: '#FF7B1C', // Matches theme.colors.primary
    text: '#FFB366', // Matches theme.colors.text
  },
};

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationDataProvider } from './contexts/NavigationDataContext';
import { AppNavigator } from './navigation/AppNavigator';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { createStackNavigator } from '@react-navigation/stack';
import { EventDetailScreen } from './screens/EventDetailScreen';
import { LeagueDetailScreen } from './screens/LeagueDetailScreen';
// Use SimpleTeamScreen instead of EnhancedTeamScreen to avoid freeze issues
const SimpleTeamScreen = React.lazy(() => import('./screens/SimpleTeamScreen'));
import { CaptainDashboardScreen } from './screens/CaptainDashboardScreen';
import { HelpSupportScreen } from './screens/HelpSupportScreen';
import { ContactSupportScreen } from './screens/ContactSupportScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CompetitionsListScreen } from './screens/CompetitionsListScreen';
import { WorkoutHistoryScreen } from './screens/WorkoutHistoryScreen';
import { MyTeamsScreen } from './screens/MyTeamsScreen';
import { ProfileEditScreen } from './screens/ProfileEditScreen';
import { SavedRoutesScreen } from './screens/routes/SavedRoutesScreen';
import { AdvancedAnalyticsScreen } from './screens/AdvancedAnalyticsScreen';
import { HealthProfileScreen } from './screens/HealthProfileScreen';
import { SatlantisDiscoveryScreen } from './screens/satlantis/SatlantisDiscoveryScreen';
import { SatlantisEventDetailScreen } from './screens/satlantis/SatlantisEventDetailScreen';
import { RunningBitcoinDetailScreen } from './screens/events/RunningBitcoinDetailScreen';
import { EinundzwanzigDetailScreen } from './screens/events/EinundzwanzigDetailScreen';
import { JanuaryWalkingDetailScreen } from './screens/events/JanuaryWalkingDetailScreen';
import { DynamicEventDetailScreen } from './screens/events/DynamicEventDetailScreen';
import { Season2Screen } from './screens/season2/Season2Screen';
import { CompeteScreen } from './screens/CompeteScreen';
import { LeaderboardsScreen } from './screens/LeaderboardsScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { DonateScreen } from './screens/DonateScreen';
import { TeamsScreen } from './screens/TeamsScreen';
import { EventsScreen } from './screens/EventsScreen';
import { ActivityTrackerScreen } from './screens/activity/ActivityTrackerScreen';
import { JournalHistoryScreen } from './screens/JournalHistoryScreen';
import { User } from './types';
import { useWalletStore } from './store/walletStore';
import { theme } from './styles/theme';
import unifiedCache from './services/cache/UnifiedNostrCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  safeGetItem,
  safeSetItem,
  safeMultiGet,
  safeRemoveItem,
} from './utils/asyncStorageTimeout';
import { PerformanceLogger } from './utils/PerformanceLogger';
import { AppStateManager } from './services/core/AppStateManager';
import { appPermissionService } from './services/initialization/AppPermissionService';
import { PermissionRequestModal } from './components/permissions/PermissionRequestModal';
import { WelcomePermissionModal } from './components/onboarding/WelcomePermissionModal';
import AppInitializationService from './services/core/AppInitializationService';
import { StepPollingService } from './services/rewards/StepPollingService';
import { StepCompetitionService } from './services/competition/StepCompetitionService';
import {
  CustomAlertProvider,
  CustomAlertManager,
} from './components/ui/CustomAlert';
import { RewardNotificationProvider } from './components/rewards/RewardNotificationProvider';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/ui/toastConfig';
import {
  parseEventDeepLink,
  type ParsedEventData,
} from './utils/eventDeepLink';
import { PendingSubmissionService } from './services/competition/PendingSubmissionService';
import { RewardPollingService } from './services/rewards/RewardPollingService';

// Music player components for Wavlake integration
// Note: MiniMusicPlayer removed - replaced by ProfileMusicBar in ProfileScreen
import { ExpandedMusicPlayer } from './components/music/ExpandedMusicPlayer';
import { PlaylistBrowser } from './components/music/PlaylistBrowser';

// ✅ FIX #18: Permission modal removed from startup to prevent iOS freeze
// Permissions are now requested at point of use (when starting exercise tracking)

// Types for authenticated app navigation
type AuthenticatedStackParamList = {
  Auth: undefined;
  Main: undefined;
  MainTabs: undefined;
  EnhancedTeamScreen: {
    team: any;
    userIsMember?: boolean;
    currentUserNpub?: string;
    userIsCaptain?: boolean;
  };
  EventDetail: {
    eventId: string;
    eventData?: any;
    teamId?: string; // ✅ NEW: Team context for fallback
    captainPubkey?: string; // ✅ NEW: Captain context for fallback
  };
  LeagueDetail: { leagueId: string; leagueData?: any };
  CaptainDashboard: {
    teamId?: string;
    teamName?: string;
    teamCaptainId?: string;
    isCaptain?: boolean;
    userNpub?: string;
  };
  Settings: any;
  HelpSupport: undefined;
  ContactSupport: undefined;
  PrivacyPolicy: undefined;
  CompetitionsList: undefined;
  WorkoutHistory: { userId: string; pubkey: string };
  MyTeams: undefined;
  ProfileEdit: undefined;
  SavedRoutes: { activityType?: 'running' | 'cycling' | 'walking' };
  AdvancedAnalytics: undefined;
  HealthProfile: undefined;
  SatlantisDiscovery: undefined;
  SatlantisEventDetail: { eventId: string; eventPubkey: string };
  RunningBitcoinDetail: undefined;
  EinundzwanzigDetail: undefined;
  JanuaryWalkingDetail: undefined;
  Season2: undefined;
  Teams: undefined;
  Rewards: undefined;
  Events: undefined;
  Exercise: undefined;
  Compete: undefined;
  Leaderboards: undefined;
  DynamicEventDetail: { eventId: string };
  JournalHistory: undefined;
  Experimental: undefined;
};

const AuthenticatedStack = createStackNavigator<AuthenticatedStackParamList>();

// Main app content that uses the AuthContext
interface AppContentProps {
  onPermissionComplete?: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ onPermissionComplete }) => {
  const {
    isInitializing,
    isAuthenticated,
    currentUser,
    connectionStatus,
    isConnected,
    initError,
    signOut,
  } = useAuth();

  // Initialize AppStateManager as early as possible
  React.useEffect(() => {
    console.log(
      '[App] 🎯 Initializing AppStateManager - Single source of truth'
    );
    AppStateManager.initialize();
  }, []);

  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Event deep link state
  const [pendingEventNavigation, setPendingEventNavigation] =
    React.useState<ParsedEventData | null>(null);
  const navigationRef = React.useRef<any>(null);

  // Check for first launch when authenticated
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Check first launch asynchronously (non-blocking)
      safeGetItem('@runstr:first_launch', 2000, null).then((firstLaunch) => {
        if (firstLaunch !== 'false') {
          console.log('👋 App: First launch detected - showing welcome modal');
          setShowWelcomeModal(true);
          // Mark as not first launch anymore
          safeSetItem('@runstr:first_launch', 'false', 2000);
        }
      });
    }
  }, [isAuthenticated, currentUser]);

  // Initialize app after authentication
  React.useEffect(() => {
    if (isAuthenticated && currentUser && !hasInitialized) {
      console.log('✅ App: Starting background initialization...');

      // Small delay to let UI settle
      const INIT_DELAY = 500;
      console.log(
        `⏱️ Using ${Platform.OS} initialization delay: ${INIT_DELAY}ms`
      );

      const timer = setTimeout(() => {
        console.log('🚀 App: Starting background initialization NOW...');
        setHasInitialized(true);

        // Add error boundary around initialization
        AppInitializationService.initializeInBackground()
          .then(() => {
            console.log('✅ App: Background initialization completed');
            // v3: Step rewards DISABLED - NWC moved to external service
            // Step polling no longer triggers rewards, only workout rewards remain
            // StepPollingService.initialize();
          })
          .catch((error) => {
            console.error('❌ Background initialization error:', error);
            // App can continue with cached data even if initialization fails
          });
      }, INIT_DELAY);

      return () => {
        clearTimeout(timer);
        // v3: Step polling disabled - cleanup not needed
        // StepPollingService.cleanup();
      };
    }
  }, [isAuthenticated, currentUser, hasInitialized]);

  // Step Competition: Auto-submit daily steps on app foreground
  // Users in step-based competitions (January Walking) have their passive
  // pedometer steps submitted automatically for leaderboard tracking
  // Also: Retry pending workout submissions that failed to sync
  React.useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    const npub = currentUser.npub || currentUser.id;
    if (!npub) {
      return;
    }

    console.log('[App] Registering foreground handlers (step competition + pending sync)');

    // Register callback with AppStateManager for foreground events
    const unsubscribe = AppStateManager.onStateChange(async (isActive) => {
      if (isActive) {
        console.log('[App] App foregrounded - running foreground tasks...');

        // Task 1: Retry pending workout submissions
        try {
          const retryResult = await PendingSubmissionService.retryAll();
          if (retryResult.succeeded > 0) {
            console.log(`[App] ✅ Synced ${retryResult.succeeded} pending workout(s)`);
            Toast.show({
              type: 'success',
              text1: `${retryResult.succeeded} workout${retryResult.succeeded > 1 ? 's' : ''} synced!`,
              text2: 'Your workout is now on the leaderboard',
              position: 'bottom',
              visibilityTime: 3000,
            });
          }
        } catch (error) {
          console.warn('[App] Pending submission retry failed:', error);
          // Non-critical - don't block app functionality
        }

        // Task 2: Check step competitions
        try {
          await StepCompetitionService.checkAndSubmitSteps(npub);
        } catch (error) {
          console.warn('[App] Step competition check failed:', error);
          // Non-critical - don't block app functionality
        }
      }
    });

    // Also check on initial mount (user may have opened app fresh)
    const initialCheckTimer = setTimeout(async () => {
      try {
        await StepCompetitionService.checkAndSubmitSteps(npub);
      } catch (error) {
        console.warn('[App] Initial step competition check failed:', error);
      }
    }, 2000); // Delay to let app fully initialize

    return () => {
      console.log('[App] Unregistering foreground handlers');
      unsubscribe();
      clearTimeout(initialCheckTimer);
    };
  }, [isAuthenticated, currentUser]);

  // Reward Polling: Check for confirmed payments from Supabase
  // Shows toast notifications when payments are actually confirmed
  React.useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      // User logged out - cleanup polling
      RewardPollingService.cleanup();
      return;
    }

    // Get hex pubkey for polling service
    const initializePolling = async () => {
      try {
        const hexPubkey = await safeGetItem('@runstr:hex_pubkey', 2000, null);
        if (hexPubkey) {
          console.log('[App] Initializing RewardPollingService');
          await RewardPollingService.initialize(hexPubkey);
        } else {
          console.warn('[App] No hex pubkey found for reward polling');
        }
      } catch (error) {
        console.warn('[App] Failed to initialize reward polling:', error);
        // Non-critical - app continues without polling
      }
    };

    initializePolling();

    return () => {
      console.log('[App] Cleaning up RewardPollingService');
      RewardPollingService.cleanup();
    };
  }, [isAuthenticated, currentUser]);

  // Handle pending event navigation when navigation is ready
  React.useEffect(() => {
    if (
      pendingEventNavigation &&
      navigationRef.current &&
      isAuthenticated &&
      currentUser
    ) {
      console.log(
        '🎯 Navigating to event from deep link:',
        pendingEventNavigation.eventId
      );

      // Small delay to ensure navigation stack is ready
      setTimeout(() => {
        try {
          navigationRef.current?.navigate('EventDetail', {
            eventId: pendingEventNavigation.eventId,
          });
          setPendingEventNavigation(null);
        } catch (error) {
          console.error('❌ Failed to navigate to event:', error);
          CustomAlertManager.alert(
            'Navigation Error',
            'Failed to open event. Please try again.'
          );
          setPendingEventNavigation(null);
        }
      }, 500);
    }
  }, [pendingEventNavigation, isAuthenticated, currentUser]);

  // Handle deep links (Challenge QR codes, events)
  React.useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log('🔗 Deep link received:', url);

      const { hostname, path, queryParams } = Linking.parse(url);
      console.log('📍 Parsed deep link:', { hostname, path, queryParams });

      // Handle Event deep link: runstr://event/{eventId}?team={teamId}&name={eventName}
      if (path?.startsWith('event/') || url.includes('runstr://event/')) {
        console.log('🎯 Event deep link detected');

        try {
          const parsedEvent = parseEventDeepLink(url);
          console.log('📦 Parsed event data:', parsedEvent);

          if (parsedEvent.isValid && parsedEvent.eventId) {
            console.log('✅ Valid event data - storing for navigation');
            // Store event data for navigation after app is ready
            setPendingEventNavigation(parsedEvent);
          } else {
            console.error('❌ Invalid event data:', parsedEvent.error);
            CustomAlertManager.alert(
              'Invalid Event',
              parsedEvent.error || 'This event link is invalid or expired.'
            );
          }
        } catch (error) {
          console.error('❌ Failed to parse event deep link:', error);
          CustomAlertManager.alert(
            'Error',
            'Failed to process event link. Please try again.'
          );
        }
        return;
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 App opened via deep link (cold start):', url);
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  // PERFORMANCE OPTIMIZATION: App state detection for smart resume
  const walletStore = useWalletStore();
  const appState = React.useRef(AppState.currentState);
  const backgroundTime = React.useRef<number>(0);

  // ⚠️ AppState management is now handled by AppStateManager
  // This prevents multiple conflicting listeners and race conditions
  // that were causing instant crashes on Android in v0.6.2-v0.6.5
  // AppStateManager is the SINGLE source of truth for app state

  // Authenticated app with bottom tabs and team creation modal
  const AuthenticatedNavigator: React.FC<{ user: User }> = ({ user }) => {
    // Initialize app data when user is authenticated
    React.useEffect(() => {
      const initializeData = async () => {
        try {
          // ✅ PERFORMANCE: Batch read multiple AsyncStorage keys with timeout
          const keys = [
            '@runstr:app_init_completed',
            '@runstr:hex_pubkey',
            '@runstr:npub',
          ];
          const results = await safeMultiGet(keys, 3000);

          const initCompleted = results.find(
            ([k]) => k === '@runstr:app_init_completed'
          )?.[1];
          const hexPubkey = results.find(
            ([k]) => k === '@runstr:hex_pubkey'
          )?.[1];
          const npub = results.find(([k]) => k === '@runstr:npub')?.[1];

          if (initCompleted === 'true') {
            console.log(
              '[App] ℹ️  App already initialized, skipping duplicate initialization'
            );
            return;
          }

          // CRITICAL FIX: Get actual hex pubkey from AsyncStorage, NOT synthetic user.id
          // user.id is 'nostr_hh6sr85uum' but we need actual hex for Nostr queries
          const pubkey = hexPubkey || npub;

          if (!pubkey) {
            console.warn(
              '[App] Cannot initialize app data: no pubkey available'
            );
            return;
          }

          console.log(
            '[App] 🚀 Authenticated user detected, cleanup starting...'
          );

          // Removed duplicate appInitializationService.initializeAppData(pubkey) call
          // The new AppInitializationService.initializeInBackground() already handles this

          // ✅ CLEANUP: Defer event snapshot cleanup to prevent UI blocking
          setTimeout(async () => {
            try {
              const { EventSnapshotStore } = await import(
                './services/event/EventSnapshotStore'
              );
              const removed = await EventSnapshotStore.cleanupExpired();
              if (removed > 0) {
                console.log(`🧹 Cleaned up ${removed} expired event snapshots`);
              }
            } catch (error) {
              console.warn(
                '⚠️ Event snapshot cleanup failed (non-critical):',
                error
              );
            }
          }, 1000); // Defer by 1 second to let UI settle

          // ❌ CASHU WALLET DISABLED: Removed in favor of NWC (v0.2.4+)
          // This initialization triggered Amber signing prompts for Cashu wallet encryption
          // NWC wallet services now handle all Lightning payments independently
          console.log(
            '[App] 💰 Cashu wallet initialization skipped (using NWC for Lightning payments)'
          );

          // ✅ NWC WALLET: Connects on-demand when user opens wallet UI
          // No startup initialization - prevents app freeze on bad NWC strings
          console.log('[App] 💳 NWC wallet will connect on-demand (no startup init)');

          /*
          if (!walletStore.isInitialized && !walletStore.isInitializing) {
            await walletStore.initialize();
            console.log('[App] ✅ Wallet initialization complete');
          } else {
            console.log('[App] ℹ️  Wallet already initialized, skipping');
          }
          */

          // ❌ REMOVED: ChallengeCompletionService background monitoring
          // This was causing Android crashes due to background Nostr queries
          // Challenges now expire on-demand when users view them
          console.log(
            '[App] ⚠️  Background challenge monitoring DISABLED for Android stability'
          );

          // ✅ PERFORMANCE: Mark initialization as complete
          await safeSetItem('@runstr:app_init_completed', 'true', 2000);
          console.log('[App] ✅ App initialization complete - flag set');
        } catch (error) {
          console.error('[App] ❌ App data initialization error:', error);
          // Don't block app - initialization errors are non-critical
        }
      };

      initializeData();

      // Cleanup: No background services to stop
      return () => {
        console.log('[App] 🛑 Component unmounting (user logged out)');
      };
    }, [user.id]);

    return (
      <AuthenticatedStack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: '#000' }, // Prevent white flash
        }}
      >
        {/* Main bottom tabs */}
        <AuthenticatedStack.Screen
          name="MainTabs"
          options={{ headerShown: false }}
        >
          {() => (
            <BottomTabNavigator
              onSignOut={signOut}
            />
          )}
        </AuthenticatedStack.Screen>

        {/* Team Creation Modal removed - team creation feature removed */}

        {/* Enhanced Team Screen */}
        <AuthenticatedStack.Screen
          name="EnhancedTeamScreen"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => {
            console.log('[App.tsx] 🚀 EnhancedTeamScreen route rendering');
            const {
              team,
              userIsMember = false,
              currentUserNpub,
              userIsCaptain = false,
            } = route.params || {};
            console.log('[App.tsx] 📦 Route params:', {
              hasRouteParams: !!route.params,
              hasTeam: !!team,
              teamId: team?.id,
              teamName: team?.name,
              teamKeys: team ? Object.keys(team).length : 0,
              allTeamKeys: team ? Object.keys(team) : [],
              userIsMember,
              userIsCaptain,
              currentUserNpub: currentUserNpub?.slice(0, 20) + '...',
            });

            // Safety check: if no team data, show error
            if (!team || !team.id) {
              console.error('[App.tsx] ❌ No valid team data in route params');
              return (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.colors.background,
                  }}
                >
                  <Text style={{ color: theme.colors.text, marginBottom: 20 }}>
                    Team data not available
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                      padding: 12,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: theme.colors.text }}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            console.log(
              '[App.tsx] ⏳ SUSPENSE FALLBACK RENDERING - Waiting for lazy component'
            );
            return (
              <ScreenErrorBoundary navigation={navigation}>
                <React.Suspense
                  fallback={
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: theme.colors.background,
                      }}
                    >
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.text}
                      />
                    </View>
                  }
                >
                  <SimpleTeamScreen
                    data={{
                      team: team,
                      leaderboard: [],
                      events: [],
                    }}
                    onBack={() => navigation.goBack()}
                    onCaptainDashboard={() => {
                      console.log('Captain dashboard from EnhancedTeamScreen');
                      console.log(
                        'Navigating to CaptainDashboard with team:',
                        team?.id
                      );
                      console.log(
                        'Team object has captainId field:',
                        'captainId' in (team || {})
                      );
                      console.log('Team captainId value:', team?.captainId);
                      console.log(
                        'Team captainId length:',
                        team?.captainId?.length
                      );
                      console.log(
                        'Team captainId format:',
                        team?.captainId?.startsWith('npub')
                          ? 'npub'
                          : team?.captainId?.length === 64
                          ? 'hex'
                          : 'other'
                      );
                      console.log(
                        'Passing userNpub:',
                        currentUserNpub?.slice(0, 20) + '...'
                      );

                      // Ensure we pass the captain ID in hex format
                      const teamCaptainIdToPass = team?.captainId || '';
                      console.log(
                        'Final teamCaptainId being passed:',
                        teamCaptainIdToPass?.slice(0, 20) + '...'
                      );

                      navigation.navigate('CaptainDashboard', {
                        teamId: team?.id,
                        teamName: team?.name,
                        teamCaptainId: teamCaptainIdToPass, // Pass the team's captain ID
                        isCaptain: true,
                        userNpub: currentUserNpub,
                      });
                    }}
                    onEventPress={(eventId, eventData) => {
                      console.log('📍 Navigation: Team → Event Detail');
                      console.log('  eventId:', eventId);
                      console.log(
                        '  eventData:',
                        eventData ? 'provided' : 'not provided'
                      );
                      console.log('  team context:', {
                        teamId: team?.id,
                        captainId: team?.captainId?.slice(0, 20) + '...',
                      });
                      // ✅ FIX: Pass team context explicitly to prevent missing teamId/captainPubkey crash
                      navigation.navigate('EventDetail', {
                        eventId,
                        eventData,
                        teamId: team?.id, // Explicit team context
                        captainPubkey: team?.captainId, // Explicit captain context
                      });
                    }}
                    onLeaguePress={(leagueId, leagueData) => {
                      console.log('📍 Navigation: Team → League Detail');
                      console.log('  leagueId:', leagueId);
                      navigation.navigate('LeagueDetail', {
                        leagueId,
                        leagueData,
                      });
                    }}
                    showJoinButton={!userIsMember}
                    userIsMemberProp={userIsMember}
                    currentUserNpub={currentUserNpub}
                    userIsCaptain={userIsCaptain}
                  />
                </React.Suspense>
              </ScreenErrorBoundary>
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
            <EventDetailScreen route={route} navigation={navigation} />
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
            <LeagueDetailScreen route={route} navigation={navigation} />
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
            const { teamId, teamName, teamCaptainId, isCaptain, userNpub } =
              route.params || {};
            return (
              <CaptainDashboardScreen
                data={{
                  team: {
                    id: teamId || '',
                    name: teamName || 'Team',
                    memberCount: 0,
                    activeEvents: 0,
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
                onKickMember={(memberId) =>
                  console.log('Kick member:', memberId)
                }
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
              onCaptainDashboard={route.params?.onCaptainDashboard}
              onHelp={() => navigation.navigate('HelpSupport')}
              onContactSupport={() => navigation.navigate('ContactSupport')}
              onPrivacyPolicy={() => navigation.navigate('PrivacyPolicy')}
              onSignOut={async () => {
                // Reset initialization state on logout
                await AppInitializationService.reset();
                // ✅ PERFORMANCE: Clear initialization flag for next login
                await safeRemoveItem('@runstr:app_init_completed', 2000);
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

        {/* Saved Routes Screen - Manage GPS routes */}
        <AuthenticatedStack.Screen
          name="SavedRoutes"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
          component={SavedRoutesScreen}
        />

        {/* Advanced Analytics Screen - Workout analytics dashboard */}
        <AuthenticatedStack.Screen
          name="AdvancedAnalytics"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
          component={AdvancedAnalyticsScreen}
        />

        {/* Health Profile Screen - Health data for analytics */}
        <AuthenticatedStack.Screen
          name="HealthProfile"
          options={{
            headerShown: false,
          }}
          component={HealthProfileScreen}
        />

        {/* Satlantis Race Discovery Screen */}
        <AuthenticatedStack.Screen
          name="SatlantisDiscovery"
          options={{
            headerShown: false,
          }}
          component={SatlantisDiscoveryScreen}
        />

        {/* Satlantis Event Detail Screen */}
        <AuthenticatedStack.Screen
          name="SatlantisEventDetail"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <SatlantisEventDetailScreen route={route} navigation={navigation} />
          )}
        </AuthenticatedStack.Screen>

        {/* Running Bitcoin Challenge Detail Screen */}
        <AuthenticatedStack.Screen
          name="RunningBitcoinDetail"
          options={{
            headerShown: false,
          }}
          component={RunningBitcoinDetailScreen}
        />

        {/* Einundzwanzig Fitness Challenge Detail Screen */}
        <AuthenticatedStack.Screen
          name="EinundzwanzigDetail"
          options={{
            headerShown: false,
          }}
          component={EinundzwanzigDetailScreen}
        />

        {/* January Walking Contest Detail Screen */}
        <AuthenticatedStack.Screen
          name="JanuaryWalkingDetail"
          options={{
            headerShown: false,
          }}
          component={JanuaryWalkingDetailScreen}
        />

        {/* RUNSTR Season 2 Competition Screen */}
        <AuthenticatedStack.Screen
          name="Season2"
          options={{
            headerShown: false,
          }}
          component={Season2Screen}
        />

        {/* Teams Screen - Hardcoded teams + charities selection */}
        <AuthenticatedStack.Screen
          name="Teams"
          options={{
            headerShown: false,
          }}
          component={TeamsScreen}
        />

        {/* Rewards Screen - Wallet + earnings management */}
        <AuthenticatedStack.Screen
          name="Rewards"
          options={{
            headerShown: false,
          }}
          component={RewardsScreen}
        />

        {/* Events Screen - Leaderboards (5K/10K/21K/Marathon) */}
        <AuthenticatedStack.Screen
          name="Events"
          options={{
            headerShown: false,
          }}
          component={EventsScreen}
        />

        {/* Exercise Screen - Activity Tracker (accessed from Profile card) */}
        <AuthenticatedStack.Screen
          name="Exercise"
          options={{
            headerShown: false,
          }}
          component={ActivityTrackerScreen}
        />

        {/* Compete Screen - Events/Competitions (accessed from Profile card) */}
        <AuthenticatedStack.Screen
          name="Compete"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation }) => <CompeteScreen navigation={navigation} />}
        </AuthenticatedStack.Screen>

        {/* Leaderboards Screen - Daily Leaderboards */}
        <AuthenticatedStack.Screen
          name="Leaderboards"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation }) => <LeaderboardsScreen navigation={navigation} />}
        </AuthenticatedStack.Screen>

        {/* Dynamic Event Detail Screen - Supabase-driven competitions */}
        <AuthenticatedStack.Screen
          name="DynamicEventDetail"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <DynamicEventDetailScreen route={route} navigation={navigation} />
          )}
        </AuthenticatedStack.Screen>

        {/* Journal History */}
        <AuthenticatedStack.Screen
          name="JournalHistory"
          options={{
            headerShown: false,
          }}
          component={JournalHistoryScreen}
        />

        {/* Experimental Features (alias for AdvancedAnalytics) */}
        <AuthenticatedStack.Screen
          name="Experimental"
          options={{
            headerShown: false,
          }}
          component={AdvancedAnalyticsScreen}
        />
      </AuthenticatedStack.Navigator>
    );
  };

  // Show error screen if initialization failed
  if (initError && !isInitializing) {
    return (
      <SafeAreaProvider style={{ backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>🚨 Initialization Error</Text>
          <Text style={errorStyles.error}>{initError}</Text>
          <Text style={errorStyles.instruction}>Please restart the app</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Simplified navigation - show login or main app immediately
  // No splash screens, no onboarding screens

  return (
    <SafeAreaProvider style={{ backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <NavigationContainer ref={navigationRef} theme={RunstrDarkTheme}>
        {(() => {
          console.log(
            '🚀 AppContent: Navigation decision - isAuthenticated:',
            isAuthenticated,
            'currentUser:',
            !!currentUser,
            'isInitializing:',
            isInitializing
          );

          // Show login if not authenticated
          if (!isAuthenticated) {
            return <AppNavigator initialRoute="Login" isFirstTime={true} />;
          }

          // User is authenticated but profile still loading
          if (isAuthenticated && !currentUser) {
            return (
              <View style={errorStyles.container}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={errorStyles.instruction}>
                  Loading your profile...
                </Text>
              </View>
            );
          }

          // Show main app immediately after authentication
          if (isAuthenticated && currentUser) {
            return <AuthenticatedNavigator user={currentUser} />;
          }

          // Fallback to login
          return <AppNavigator initialRoute="Login" isFirstTime={true} />;
        })()}
      </NavigationContainer>

      {/* Music Player - Wavlake integration */}
      {/* Note: MiniMusicPlayer removed - replaced by ProfileMusicBar in ProfileScreen */}
      <ExpandedMusicPlayer />
      <PlaylistBrowser />

      {/* Welcome Modal - Shows on first app launch */}
      <WelcomePermissionModal
        visible={showWelcomeModal}
        onComplete={() => {
          setShowWelcomeModal(false);
          console.log('✅ Welcome modal closed');
        }}
      />
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
        installGlobalJsExceptionHandler();

        // SENIOR DEVELOPER FIX: Initialize WebSocket polyfill immediately with error handling
        try {
          initializeWebSocketPolyfill();
        } catch (error) {
          console.error('🚨 WebSocket polyfill initialization failed:', error);
          // App can continue without polyfill in most cases
        }

        // Initialize i18n language from saved preference
        try {
          await LanguagePreferenceService.initializeLanguage();
          console.log('[App] 🌐 Language preference initialized');
        } catch (error) {
          console.warn('[App] Failed to initialize language preference:', error);
          // App continues with default language
        }

        // Enable WebSocket debugging in development mode for NWC troubleshooting
        if (__DEV__) {
          try {
            const { enableWebSocketDebugging } = await import(
              './utils/webSocketDebugger'
            );
            enableWebSocketDebugging();
            console.log(
              '[App] 🔍 WebSocket debugger enabled for NWC troubleshooting'
            );
          } catch (debugError) {
            console.warn(
              '[App] Failed to enable WebSocket debugger:',
              debugError
            );
            // Non-critical - app continues without debugger
          }
        }

        // 🔧 iOS FIX: Verify background location task is defined for distance tracking
        try {
          const isTaskDefined = await TaskManager.isTaskDefined(
            SIMPLE_TRACKER_TASK
          );
          const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(
            SIMPLE_TRACKER_TASK
          );

          console.log(
            `📍 Background task status - Defined: ${isTaskDefined}, Registered: ${isTaskRegistered}`
          );

          if (!isTaskDefined) {
            console.error(
              '❌ Background location task NOT defined - distance tracking will fail'
            );
            console.error(
              '   This should not happen - check SimpleRunTrackerTask import in index.js'
            );
          } else {
            console.log(
              '✅ Background location task defined and ready for distance tracking'
            );

            // 🔧 ZOMBIE SESSION CLEANUP: Stop any registered background tasks from previous sessions
            // This prevents the activity tracker from appearing to auto-start when navigating to Activity tab
            if (isTaskRegistered) {
              console.log(
                '⚠️  Background task registered from previous session - cleaning up zombie session'
              );
              try {
                // simpleRunTracker.stopTracking() handles both background task and internal state
                await simpleRunTracker.stopTracking();

                await safeRemoveItem('@runstr:session_state', 2000);
                await safeRemoveItem('@runstr:gps_points', 2000);
                console.log('✅ Zombie session cleaned up successfully');
              } catch (cleanupError) {
                console.warn(
                  '⚠️  Failed to cleanup zombie session:',
                  cleanupError
                );
                // Don't block app startup if cleanup fails
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to check background task status:', error);
          // Don't block app initialization - tracking will fall back to foreground only
        }

        // Give app a moment to ensure black background is set
        await new Promise((resolve) => setTimeout(resolve, 100));

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
      <CustomAlertProvider>
        <RewardNotificationProvider>
          <AuthProvider>
            <NavigationDataProvider>
              <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <AppContent />
              </View>
            </NavigationDataProvider>
          </AuthProvider>
        </RewardNotificationProvider>
      </CustomAlertProvider>
      <Toast config={toastConfig} />
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
    color: theme.colors.text,
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
