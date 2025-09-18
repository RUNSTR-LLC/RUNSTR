/**
 * RUNSTR App Root Component
 * Simplified app using AuthContext for state management
 * iOS-inspired architecture with single source of truth
 */

// SENIOR DEVELOPER FIX: Initialize WebSocket polyfill early
import { initializeWebSocketPolyfill } from './utils/webSocketPolyfill';
import * as ExpoSplashScreen from 'expo-splash-screen';

import React from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
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

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationDataProvider } from './contexts/NavigationDataContext';
import { AppNavigator } from './navigation/AppNavigator';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { SplashScreen as AppSplashScreen } from './components/ui/SplashScreen';
import { SplashInitScreen } from './screens/SplashInitScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { TeamCreationWizard } from './components/wizards/TeamCreationWizard';
import { EventDetailScreen } from './screens/EventDetailScreen';
import { ChallengeDetailScreen } from './screens/ChallengeDetailScreen';
import { EnhancedTeamScreen } from './screens/EnhancedTeamScreen';
import { CaptainDashboardScreen } from './screens/CaptainDashboardScreen';
import { HelpSupportScreen } from './screens/HelpSupportScreen';
import { ContactSupportScreen } from './screens/ContactSupportScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { User } from './types';

// Types for authenticated app navigation
type AuthenticatedStackParamList = {
  SplashInit: undefined;
  Auth: undefined;
  Main: undefined;
  MainTabs: undefined;
  TeamCreation: undefined;
  EnhancedTeamScreen: { team: any; userIsMember?: boolean; currentUserNpub?: string; userIsCaptain?: boolean };
  EventDetail: { eventId: string };
  ChallengeDetail: { challengeId: string };
  CaptainDashboard: { teamId?: string; teamName?: string; isCaptain?: boolean };
  HelpSupport: undefined;
  ContactSupport: undefined;
  PrivacyPolicy: undefined;
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
    initError
  } = useAuth();

  // Removed showSplashInit - we'll show login immediately if not authenticated

  // Authenticated app with bottom tabs and team creation modal
  const AuthenticatedNavigator: React.FC<{ user: User }> = ({ user }) => {
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
            />
          )}
        </AuthenticatedStack.Screen>

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
            const { team, userIsMember = false, currentUserNpub, userIsCaptain = false } = route.params || {};

            return (
              <EnhancedTeamScreen
                data={{
                  team: team || {},
                  leaderboard: [],
                  events: [],
                  challenges: [],
                }}
                onMenuPress={() => console.log('Menu pressed')}
                onCaptainDashboard={() => {
                  console.log('Captain dashboard from EnhancedTeamScreen');
                  console.log('Navigating to CaptainDashboard with team:', team?.id);
                  navigation.navigate('CaptainDashboard', {
                    teamId: team?.id,
                    teamName: team?.name,
                    isCaptain: true
                  });
                }}
                onAddChallenge={() => console.log('Add challenge')}
                onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                onChallengePress={(challengeId) => navigation.navigate('ChallengeDetail', { challengeId })}
                onNavigateToProfile={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
                onLeaveTeam={() => {
                  console.log('Leave team');
                  navigation.navigate('MainTabs', { screen: 'Teams' });
                }}
                onTeamDiscovery={() => navigation.navigate('MainTabs', { screen: 'Teams' })}
                onJoinTeam={() => console.log('Join team')}
                showJoinButton={!userIsMember}
                userIsMemberProp={userIsMember}
                currentUserNpub={currentUserNpub}
                userIsCaptain={userIsCaptain}
              />
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
            const { teamId, teamName, isCaptain } = route.params || {};
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
                  joinRequests: [],
                  activityLog: [],
                  recentActivity: [],
                  walletBalance: 0,
                }}
                teamId={teamId || ''}
                captainId={user.npub || user.id}
                onNavigateToTeam={() => navigation.goBack()}
                onNavigateToProfile={() => navigation.goBack()}
                onSettingsPress={() => console.log('Settings')}
                onKickMember={(memberId) => console.log('Kick member:', memberId)}
                onViewAllActivity={() => console.log('View all activity')}
              />
            );
          }}
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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <NavigationContainer>
        {(() => {
          console.log(
            '🚀 AppContent: Navigation decision - isAuthenticated:',
            isAuthenticated,
            'currentUser:',
            !!currentUser,
            'isInitializing:',
            isInitializing
          );

          // Show login immediately if not authenticated
          if (!isAuthenticated) {
            return <AppNavigator initialRoute="Login" isFirstTime={true} />;
          }

          // User is authenticated but profile still loading
          if (isAuthenticated && !currentUser) {
            return (
              <SplashInitScreen />
            );
          }

          // Authenticated with loaded profile - show main app
          if (isAuthenticated && currentUser) {
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
