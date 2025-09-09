/**
 * RUNSTR App Root Component
 * Simplified app using AuthContext for state management
 * iOS-inspired architecture with single source of truth
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './contexts/AuthContext';
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

// Main App component with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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
