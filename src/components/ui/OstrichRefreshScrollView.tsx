/**
 * Thin wrapper around ScrollView / FlatList that adds a native RefreshControl.
 *
 * Originally this component rendered a branded RUNSTR ostrich overlay during pull.
 * The overlay lived inside the scroll container and overlapped content (banners,
 * card headers), which felt off. The public API is kept so every existing
 * consumer keeps working — they now get the native iOS/Android spinner instead.
 *
 *   <OstrichRefreshScrollView refreshing onRefresh>{...}</OstrichRefreshScrollView>
 *   <OstrichRefreshFlatList refreshing onRefresh data renderItem ... />
 */

import React from 'react';
import {
  FlatList,
  FlatListProps,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
} from 'react-native';
import { theme } from '../../styles/theme';

interface ScrollViewWrapperProps extends Omit<ScrollViewProps, 'refreshControl'> {
  refreshing: boolean;
  onRefresh: () => void;
  /** Kept for API compatibility; no longer used. */
  threshold?: number;
  children: React.ReactNode;
}

const buildRefreshControl = (refreshing: boolean, onRefresh: () => void) => (
  <RefreshControl
    refreshing={refreshing}
    onRefresh={onRefresh}
    tintColor={theme.colors.accent}
    colors={[theme.colors.accent]}
  />
);

export const OstrichRefreshScrollView: React.FC<ScrollViewWrapperProps> = ({
  refreshing,
  onRefresh,
  threshold: _threshold,
  children,
  ...scrollViewProps
}) => (
  <ScrollView
    {...scrollViewProps}
    refreshControl={buildRefreshControl(refreshing, onRefresh)}
  >
    {children}
  </ScrollView>
);

interface FlatListWrapperProps<T> extends Omit<FlatListProps<T>, 'refreshControl' | 'refreshing'> {
  refreshing: boolean;
  onRefresh: () => void;
  /** Kept for API compatibility; no longer used. */
  threshold?: number;
}

export function OstrichRefreshFlatList<T>({
  refreshing,
  onRefresh,
  threshold: _threshold,
  ...flatListProps
}: FlatListWrapperProps<T>) {
  return (
    <FlatList
      {...(flatListProps as any)}
      refreshControl={buildRefreshControl(refreshing, onRefresh)}
    />
  );
}
