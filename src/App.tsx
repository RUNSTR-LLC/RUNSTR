/**
 * RUNSTR App Root Component
 * Main app component with navigation container and initialization
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './navigation/AppNavigator';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { SplashScreen } from './components/ui/SplashScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { TeamCreationWizard } from './components/wizards/TeamCreationWizard';
import { User } from './types';

// Types for authenticated app navigation
type AuthenticatedStackParamList = {
  MainTabs: undefined;
  TeamCreation: undefined;
};

const AuthenticatedStack = createStackNavigator<AuthenticatedStackParamList>();

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(
    'Connecting to Nostr...'
  );
  const [isConnected, setIsConnected] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const handleSplashComplete = async () => {
    try {
      console.log('🚀 Splash screen completed, initializing app...');

      // Simulate Nostr connection progress
      setConnectionStatus('Connecting to Nostr...');

      // Check authentication status with improved error handling
      try {
        const { AuthService } = await import('./services/auth/authService');
        console.log('🔍 Starting authentication check...');

        const authStatus = await AuthService.getAuthenticationStatus();
        console.log('🔍 Auth Status Check:', {
          isAuthenticated: authStatus.isAuthenticated,
          hasUser: !!authStatus.user,
          needsOnboarding: authStatus.needsOnboarding,
          needsRoleSelection: authStatus.needsRoleSelection,
        });

        if (authStatus.isAuthenticated && authStatus.user) {
          // User is properly authenticated with valid data
          console.log('✅ User authenticated with valid data:', {
            userId: authStatus.user.id,
            name: authStatus.user.name,
            role: authStatus.user.role,
          });
          setIsAuthenticated(true);
          setCurrentUser(authStatus.user);
        } else {
          // Not authenticated or no valid user data
          console.log('❌ User not authenticated or no valid user data');

          // Clear any stale authentication data
          const { clearNostrStorage } = await import('./utils/nostr');
          await clearNostrStorage();

          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (authError) {
        console.error('❌ Auth service failed:', authError);
        setIsAuthenticated(false); // Default to not authenticated
        setCurrentUser(null);
      }

      // Initialize background services with error handling
      try {
        await initializeBackgroundServices();
      } catch (bgError) {
        console.warn('⚠️  Background services failed to initialize:', bgError);
        // Continue anyway - this shouldn't block the app
      }

      // Start background Nostr preloading for authenticated users
      if (isAuthenticated) {
        try {
          console.log('🚀 Starting background Nostr preloading...');
          const { NostrPreloadService } = await import('./services/preload/NostrPreloadService');
          // Start preloading in background - don't await to avoid blocking app startup
          NostrPreloadService.startBackgroundPreload().catch(preloadError => {
            console.warn('⚠️ Nostr preloading failed:', preloadError);
          });
        } catch (importError) {
          console.warn('⚠️ Failed to import NostrPreloadService:', importError);
        }
      }

      // Simulate connection complete
      setIsConnected(true);
      setConnectionStatus('Connected');

      console.log('✅ RUNSTR App initialization complete');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setInitError(
        error instanceof Error ? error.message : 'Initialization failed'
      );
      setIsAuthenticated(false);
    } finally {
      console.log('🏁 Setting isInitializing to false, showing main app...');
      setIsInitializing(false);
    }
  };

  const initializeBackgroundServices = async () => {
    try {
      console.log('🏃‍♂️ Initializing background fitness sync...');
      const { BackgroundSyncService } = await import(
        './services/fitness/backgroundSyncService'
      );
      const syncService = BackgroundSyncService.getInstance();
      const result = await syncService.initialize();

      if (result.success) {
        console.log('✅ Background sync activated');
      } else {
        console.warn(
          '⚠️  Background sync initialization failed:',
          result.error
        );
      }
    } catch (error) {
      console.error('❌ Failed to initialize background services:', error);
      throw error; // Re-throw to be caught by parent
    }
  };

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
          onComplete={handleSplashComplete}
          isConnected={isConnected}
          connectionStatus={connectionStatus}
        />
      ) : (
        <NavigationContainer>
          {(() => {
            console.log(
              '🚀 App.tsx: Navigation decision - isAuthenticated:',
              isAuthenticated,
              'currentUser:',
              !!currentUser
            );

            if (isAuthenticated && currentUser) {
              // Authenticated users get bottom tabs with modal team creation
              return <AuthenticatedNavigator user={currentUser} />;
            } else {
              // Unauthenticated users get onboarding flow
              return (
                <AppNavigator initialRoute="Onboarding" isFirstTime={true} />
              );
            }
          })()}
        </NavigationContainer>
      )}
    </SafeAreaProvider>
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
