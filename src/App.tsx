/**
 * RUNSTR App Root Component
 * Simplified app using AuthContext for state management
 * iOS-inspired architecture with single source of truth
 */

// SENIOR DEVELOPER FIX: Initialize WebSocket polyfill early
import { initializeWebSocketPolyfill } from './utils/webSocketPolyfill';
import * as ExpoSplashScreen from 'expo-splash-screen';

import React from 'react';

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
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { SplashScreen } from './components/ui/SplashScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { TeamCreationWizard } from './components/wizards/TeamCreationWizard';
import { TeamDashboardScreen } from './screens/TeamDashboardScreen';
import { EventDetailScreen } from './screens/EventDetailScreen';
import { ChallengeDetailScreen } from './screens/ChallengeDetailScreen';
import { User } from './types';

// Types for authenticated app navigation
type AuthenticatedStackParamList = {
  MainTabs: undefined;
  TeamCreation: undefined;
  TeamDashboard: { team: any; userIsMember?: boolean };
  EventDetail: { eventId: string };
  ChallengeDetail: { challengeId: string };
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

        {/* Team Dashboard Screen */}
        <AuthenticatedStack.Screen
          name="TeamDashboard"
          options={{
            headerShown: false,
          }}
        >
          {({ navigation, route }) => (
            <TeamDashboardScreen
              team={route.params.team}
              userIsMember={route.params.userIsMember || false}
              currentUser={user}
              navigation={navigation}
              onBack={() => navigation.goBack()}
              onJoinTeam={() => {
                console.log('Team joined from dashboard');
                navigation.goBack(); // Return after joining
              }}
              onCaptainDashboard={() => {
                console.log('Navigate to captain dashboard');
                // TODO: Add captain dashboard navigation
              }}
            />
          )}
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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {isInitializing ? (
        <SplashScreen
          onComplete={() => {
            // AuthContext handles all initialization now
            // Just show a simple loading screen
            console.log('🚀 Splash screen completed - AuthContext is handling initialization');
          }}
          isConnected={isConnected}
          connectionStatus={connectionStatus}
        />
      ) : (
        <NavigationContainer>
          {(() => {
            console.log(
              '🚀 AppContent: Navigation decision - isAuthenticated:',
              isAuthenticated,
              'currentUser:',
              !!currentUser
            );

            if (isAuthenticated && currentUser) {
              // Authenticated users get bottom tabs with modal team creation
              return <AuthenticatedNavigator user={currentUser} />;
            } else {
              // Users without stored keys get nsec input (via Login screen)
              return (
                <AppNavigator initialRoute="Login" isFirstTime={true} />
              );
            }
          })()}
        </NavigationContainer>
      )}
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
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <AppContent />
        </View>
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
