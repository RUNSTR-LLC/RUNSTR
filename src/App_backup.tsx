/**
 * RUNSTR App Root Component - BACKUP
 * Main app component with navigation container and initialization
 */

import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './navigation/AppNavigator';
import { SplashScreen } from './components/ui/SplashScreen';
import { hasStoredNostrKeys } from './utils/nostr';
import { BackgroundSyncService } from './services/fitness/backgroundSyncService';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(
    'Connecting to Nostr...'
  );
  const [isConnected, setIsConnected] = useState(false);

  const handleSplashComplete = async () => {
    try {
      console.log('🚀 Splash screen completed, initializing app...');

      // Simulate Nostr connection progress (like iOS version)
      setConnectionStatus('Connecting to Nostr...');

      // Check proper authentication status using AuthService
      const { AuthService } = await import('./services/auth/authService');
      const authStatus = await AuthService.getAuthenticationStatus();
      console.log('🔍 Auth Status Check:', authStatus);
      setIsAuthenticated(authStatus.isAuthenticated);

      // Initialize background services
      await initializeBackgroundServices();

      // Simulate connection complete
      setIsConnected(true);
      setConnectionStatus('Connected');

      console.log(
        '✅ RUNSTR App initialization complete - Auth:',
        authStatus.isAuthenticated
      );
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setIsAuthenticated(false);
    } finally {
      console.log('🏁 Setting isInitializing to false, showing main app...');
      setIsInitializing(false);
    }
  };

  const initializeBackgroundServices = async () => {
    try {
      console.log('🏃‍♂️ Initializing background fitness sync...');
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
    }
  };

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
          <AppNavigator
            initialRoute={isAuthenticated ? 'Team' : 'Onboarding'}
            isFirstTime={!isAuthenticated}
          />
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
