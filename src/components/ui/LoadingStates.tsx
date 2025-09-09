/**
 * LoadingStates - Skeleton screens and loading indicators for team discovery
 * Provides smooth loading experiences during data fetching and team operations
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Text,
} from 'react-native';
import { theme } from '../../styles/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

// Animated skeleton component
const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.border,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Team card skeleton loader
export const TeamCardSkeleton: React.FC = () => (
  <View style={styles.teamCardSkeleton}>
    {/* Header */}
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonTeamInfo}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={14} />
      </View>
      <Skeleton width={50} height={16} borderRadius={8} />
    </View>

    {/* Prize Section */}
    <View style={styles.skeletonPrizeSection}>
      <Skeleton width="40%" height={28} style={{ marginBottom: 4 }} />
      <Skeleton width="60%" height={12} />
    </View>

    {/* Stats Grid */}
    <View style={styles.skeletonStatsGrid}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonStatItem}>
          <Skeleton width="70%" height={11} style={{ marginBottom: 4 }} />
          <Skeleton width="50%" height={16} />
        </View>
      ))}
    </View>

    {/* Difficulty */}
    <View style={styles.skeletonDifficulty}>
      <View style={styles.skeletonDots}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={6} height={6} borderRadius={3} />
        ))}
      </View>
      <Skeleton width={60} height={10} style={{ marginLeft: 8 }} />
    </View>

    {/* Activities */}
    <View style={styles.skeletonActivities}>
      <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width="90%" height={12} style={{ marginBottom: 4 }} />
      ))}
    </View>

    {/* Join Button */}
    <Skeleton
      width="100%"
      height={48}
      borderRadius={12}
      style={{ marginTop: 12 }}
    />
  </View>
);

// Discovery screen skeleton
export const TeamDiscoverySkeleton: React.FC = () => (
  <View style={styles.discoveryContainer}>
    {/* Welcome Section Skeleton */}
    <View style={styles.skeletonWelcome}>
      <Skeleton width="70%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="90%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="80%" height={14} />
    </View>

    {/* Team Cards */}
    <View style={styles.skeletonContent}>
      {[1, 2, 3].map((i) => (
        <TeamCardSkeleton key={i} />
      ))}
    </View>
  </View>
);

// Join modal skeleton
export const JoinModalSkeleton: React.FC = () => (
  <View style={styles.modalSkeleton}>
    <View style={styles.skeletonModalHeader}>
      <Skeleton width={20} height={20} borderRadius={10} />
      <Skeleton width="50%" height={18} />
      <Skeleton width={20} height={20} borderRadius={10} />
    </View>

    <View style={styles.skeletonModalContent}>
      <TeamCardSkeleton />
      <Skeleton
        width="100%"
        height={48}
        borderRadius={12}
        style={{ marginTop: 20 }}
      />
    </View>
  </View>
);

// Loading overlay with message
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  type?: 'joining' | 'leaving' | 'loading';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  type = 'loading',
}) => {
  if (!visible) return null;

  const getLoadingMessage = () => {
    if (message) return message;

    switch (type) {
      case 'joining':
        return 'Joining team...';
      case 'leaving':
        return 'Leaving team...';
      default:
        return 'Loading...';
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={styles.overlayText}>{getLoadingMessage()}</Text>
      </View>
    </View>
  );
};

// Search loading state
export const SearchLoadingSkeleton: React.FC = () => (
  <View style={styles.searchLoading}>
    <View style={styles.searchResults}>
      <Skeleton width="30%" height={16} style={{ marginBottom: 16 }} />
      {[1, 2].map((i) => (
        <TeamCardSkeleton key={i} />
      ))}
    </View>
  </View>
);

// Error state component
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
}) => (
  <View style={styles.errorState}>
    <Text style={styles.errorTitle}>{title}</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    {onRetry && (
      <View style={styles.retryButton}>
        <Text style={styles.retryText} onPress={onRetry}>
          {retryText}
        </Text>
      </View>
    )}
  </View>
);

// Empty state component
interface EmptyStateProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionText,
  onAction,
}) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionText && onAction && (
      <View style={styles.emptyButton}>
        <Text style={styles.emptyButtonText} onPress={onAction}>
          {actionText}
        </Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  // Team Card Skeleton
  teamCardSkeleton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  skeletonTeamInfo: {
    flex: 1,
    marginRight: 16,
  },
  skeletonPrizeSection: {
    marginBottom: 16,
  },
  skeletonStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonStatItem: {
    width: '48%',
    marginBottom: 12,
  },
  skeletonDifficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonDots: {
    flexDirection: 'row',
    gap: 4,
  },
  skeletonActivities: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },

  // Discovery Container
  discoveryContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  skeletonWelcome: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  skeletonContent: {
    padding: 20,
  },

  // Modal Skeleton
  modalSkeleton: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  skeletonModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  skeletonModalContent: {
    flex: 1,
    padding: 20,
  },

  // Loading Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: theme.colors.cardBackground,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 150,
  },
  overlayText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },

  // Search Loading
  searchLoading: {
    flex: 1,
    padding: 20,
  },
  searchResults: {
    flex: 1,
  },

  // Error State
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
