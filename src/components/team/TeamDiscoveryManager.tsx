/**
 * TeamDiscoveryManager - Coordinates team discovery with real-time updates and error handling
 * Provides advanced team discovery features, real-time data syncing, and comprehensive error handling
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  AppState,
  AppStateStatus,
  BackHandler,
} from 'react-native';
import { useTeamDiscovery } from '../../store/teamStore';
import { useUserProfile, useTeamRecommendations } from '../../store/userStore';
import { TeamJoinModal } from './TeamJoinModal';
import {
  LoadingOverlay,
  ErrorState,
  TeamDiscoverySkeleton,
} from '../ui/LoadingStates';
import type { DiscoveryTeam } from '../../types';

interface TeamDiscoveryManagerProps {
  visible: boolean;
  onClose: () => void;
  onTeamJoined?: (teamId: string) => void;
  children: React.ReactNode;
}

interface RetryAttempt {
  count: number;
  lastAttempt: number;
  backoffMs: number;
}

export const TeamDiscoveryManager: React.FC<TeamDiscoveryManagerProps> = ({
  visible,
  onClose,
  onTeamJoined,
  children,
}) => {
  // Store hooks
  const {
    teams,
    isLoading: isLoadingTeams,
    error: teamError,
    loadTeams,
    clearError: clearTeamError,
  } = useTeamDiscovery();

  const {
    user,
    isLoading: isLoadingUser,
    error: userError,
    loadUser,
    clearErrors: clearUserErrors,
  } = useUserProfile();

  const {
    recommendations,
    isLoading: isLoadingRecommendations,
    loadRecommendations,
  } = useTeamRecommendations();

  // Local state
  const [selectedTeam, setSelectedTeam] = useState<DiscoveryTeam | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'offline'
  >('connected');
  const [retryAttempts, setRetryAttempts] = useState<RetryAttempt>({
    count: 0,
    lastAttempt: 0,
    backoffMs: 1000,
  });

  // Real-time subscription management
  const [isSubscribed, setIsSubscribed] = useState(false);

  /**
   * Initialize data loading with retry logic
   */
  const initializeData = useCallback(
    async (forceRefresh = false) => {
      try {
        setConnectionStatus('reconnecting');

        // Load teams first
        if (teams.length === 0 || forceRefresh) {
          await loadTeams();
        }

        // Load user if needed
        if (user && (!user.preferences || forceRefresh)) {
          await loadUser(user.id);
        }

        // Load recommendations if we have both user and teams
        if (
          user &&
          teams.length > 0 &&
          (recommendations.length === 0 || forceRefresh)
        ) {
          await loadRecommendations(teams);
        }

        setConnectionStatus('connected');
        setRetryAttempts({ count: 0, lastAttempt: 0, backoffMs: 1000 });
      } catch (error) {
        console.error('Error initializing data:', error);
        setConnectionStatus('offline');

        // Implement exponential backoff retry
        const now = Date.now();
        const timeSinceLastAttempt = now - retryAttempts.lastAttempt;

        if (timeSinceLastAttempt > retryAttempts.backoffMs) {
          const newBackoffMs = Math.min(retryAttempts.backoffMs * 2, 30000); // Cap at 30s
          setRetryAttempts({
            count: retryAttempts.count + 1,
            lastAttempt: now,
            backoffMs: newBackoffMs,
          });

          // Retry after backoff delay
          setTimeout(() => initializeData(forceRefresh), newBackoffMs);
        }
      }
    },
    [
      teams,
      user,
      recommendations,
      loadTeams,
      loadUser,
      loadRecommendations,
      retryAttempts,
    ]
  );

  /**
   * Handle app state changes for real-time sync
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && visible) {
        // Refresh data when app becomes active
        initializeData(true);
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [visible, initializeData]);

  /**
   * Initialize data when component mounts or becomes visible
   */
  useEffect(() => {
    if (visible) {
      initializeData();
    }
  }, [visible, initializeData]);

  /**
   * Handle hardware back button on Android
   */
  useEffect(() => {
    const handleBackPress = () => {
      if (showJoinModal) {
        setShowJoinModal(false);
        return true; // Prevent default back action
      }
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => subscription.remove();
  }, [visible, showJoinModal, onClose]);

  /**
   * Handle team selection and join modal
   */
  const handleTeamPress = useCallback((team: DiscoveryTeam) => {
    setSelectedTeam(team);
    setShowJoinModal(true);
  }, []);

  /**
   * Handle successful team join
   */
  const handleTeamJoined = useCallback(
    (teamId: string) => {
      setShowJoinModal(false);
      setSelectedTeam(null);

      // Refresh data to reflect new team membership
      initializeData(true);

      // Notify parent component
      onTeamJoined?.(teamId);

      // Show success feedback
      Alert.alert(
        'Team Joined!',
        'Welcome to your new team! You can now participate in events and challenges.',
        [{ text: 'Continue', onPress: () => onClose() }]
      );
    },
    [initializeData, onTeamJoined, onClose]
  );

  /**
   * Handle join modal close
   */
  const handleJoinModalClose = useCallback(() => {
    setShowJoinModal(false);
    setSelectedTeam(null);
  }, []);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    clearTeamError();
    clearUserErrors();
    initializeData(true);
  }, [clearTeamError, clearUserErrors, initializeData]);

  /**
   * Enhanced error handling with specific error types
   */
  const getErrorInfo = () => {
    if (teamError && userError) {
      return {
        title: 'Connection Problems',
        message:
          'Having trouble connecting to our servers. Check your internet connection and try again.',
        canRetry: true,
      };
    }

    if (teamError) {
      return {
        title: 'Teams Unavailable',
        message: teamError.includes('network')
          ? 'Network error loading teams. Please check your connection.'
          : 'Unable to load available teams. Please try again.',
        canRetry: true,
      };
    }

    if (userError) {
      return {
        title: 'Profile Error',
        message: userError.includes('preferences')
          ? 'Unable to load your preferences. Some features may be limited.'
          : 'Unable to load your profile. Please try again.',
        canRetry: true,
      };
    }

    return null;
  };

  /**
   * Connection status indicator
   */
  const renderConnectionStatus = () => {
    if (connectionStatus === 'reconnecting') {
      return (
        <LoadingOverlay
          visible={true}
          message="Syncing latest team data..."
          type="loading"
        />
      );
    }

    if (connectionStatus === 'offline' && retryAttempts.count > 0) {
      return (
        <LoadingOverlay
          visible={true}
          message={`Reconnecting... (attempt ${retryAttempts.count})`}
          type="loading"
        />
      );
    }

    return null;
  };

  // Show error state if there's a critical error
  const errorInfo = getErrorInfo();
  if (errorInfo && !isLoadingTeams && !isLoadingUser) {
    return (
      <ErrorState
        title={errorInfo.title}
        message={errorInfo.message}
        onRetry={errorInfo.canRetry ? handleRetry : undefined}
        retryText="Try Again"
      />
    );
  }

  // Show loading skeleton on initial load
  if ((isLoadingTeams || isLoadingUser) && teams.length === 0) {
    return <TeamDiscoverySkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Main content with team discovery functionality */}
      {React.cloneElement(children as React.ReactElement<any>, {
        teams,
        recommendations,
        isLoading: isLoadingTeams || isLoadingUser || isLoadingRecommendations,
        onTeamPress: handleTeamPress,
        onRefresh: () => initializeData(true),
        connectionStatus,
      })}

      {/* Team join modal */}
      <TeamJoinModal
        visible={showJoinModal}
        team={selectedTeam}
        userId={user?.id || ''}
        onClose={handleJoinModalClose}
        onSuccess={() => handleTeamJoined(selectedTeam?.id || '')}
      />

      {/* Connection status overlay */}
      {renderConnectionStatus()}
    </View>
  );
};

/**
 * Error Boundary for team discovery
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TeamDiscoveryErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      'TeamDiscovery Error Boundary caught error:',
      error,
      errorInfo
    );

    // In production, you might want to log this to an error reporting service
    if (__DEV__) {
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Something went wrong"
          message="The team discovery feature encountered an error. Please try restarting."
          onRetry={this.handleReset}
          retryText="Restart"
        />
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for team discovery with error boundary
 */
export const withTeamDiscoveryManager = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = React.forwardRef<any, P & TeamDiscoveryManagerProps>(
    (props, ref) => {
      const { visible, onClose, onTeamJoined, ...componentProps } = props;
      return (
        <TeamDiscoveryErrorBoundary>
          <TeamDiscoveryManager
            visible={visible}
            onClose={onClose}
            onTeamJoined={onTeamJoined}
          >
            <Component {...(componentProps as P)} ref={ref} />
          </TeamDiscoveryManager>
        </TeamDiscoveryErrorBoundary>
      );
    }
  );

  WrappedComponent.displayName = `withTeamDiscoveryManager(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TeamDiscoveryManager;
