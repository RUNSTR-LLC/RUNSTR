/**
 * Ostrich pull-to-refresh — RUNSTR-branded.
 *
 * Two wrappers:
 *   <OstrichRefreshScrollView refreshing onRefresh>{...}</OstrichRefreshScrollView>
 *   <OstrichRefreshFlatList refreshing onRefresh data renderItem ... />
 *
 * Both render the RUNSTR ostrich at the top; it fades + scales into view as the
 * user pulls, and triggers onRefresh once pull distance exceeds the threshold.
 * Built on the built-in Animated API so no additional dependencies are needed.
 */

import React, { useRef } from 'react';
import {
  Animated,
  FlatListProps,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
  StyleSheet,
  View,
} from 'react-native';

const OSTRICH_SIZE = 56;
const PULL_THRESHOLD = 80;
const HEADER_HEIGHT = 72;

type UseOstrichRefreshArgs = {
  refreshing: boolean;
  onRefresh: () => void;
  threshold?: number;
};

const useOstrichRefresh = ({ refreshing, onRefresh, threshold = PULL_THRESHOLD }: UseOstrichRefreshArgs) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y <= -threshold && !refreshing && !triggered.current) {
      triggered.current = true;
      onRefresh();
      setTimeout(() => {
        triggered.current = false;
      }, 1000);
    }
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  const ostrichOpacity = scrollY.interpolate({
    inputRange: [-threshold, -threshold / 2, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const ostrichScale = scrollY.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  });

  const ostrichRotate = scrollY.interpolate({
    inputRange: [-threshold * 2, 0],
    outputRange: ['-15deg', '0deg'],
    extrapolate: 'clamp',
  });

  const overlay = (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.header,
        {
          opacity: refreshing ? 1 : ostrichOpacity,
          transform: [
            { scale: refreshing ? 1 : ostrichScale },
            { rotate: refreshing ? '0deg' : ostrichRotate },
          ],
        },
      ]}
    >
      <Image
        source={require('../../../assets/images/icon.png')}
        style={styles.ostrich}
        resizeMode="contain"
      />
    </Animated.View>
  );

  return { overlay, onScroll, onScrollEndDrag: handleScrollEndDrag };
};

interface ScrollViewWrapperProps extends Omit<ScrollViewProps, 'refreshControl' | 'onScroll'> {
  refreshing: boolean;
  onRefresh: () => void;
  threshold?: number;
  children: React.ReactNode;
}

export const OstrichRefreshScrollView: React.FC<ScrollViewWrapperProps> = ({
  refreshing,
  onRefresh,
  threshold,
  children,
  ...scrollViewProps
}) => {
  const { overlay, onScroll, onScrollEndDrag } = useOstrichRefresh({ refreshing, onRefresh, threshold });

  return (
    <View style={styles.container}>
      {overlay}
      <Animated.ScrollView
        {...scrollViewProps}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

interface FlatListWrapperProps<T> extends Omit<FlatListProps<T>, 'refreshControl' | 'onScroll' | 'refreshing'> {
  refreshing: boolean;
  onRefresh: () => void;
  threshold?: number;
}

export function OstrichRefreshFlatList<T>({
  refreshing,
  onRefresh,
  threshold,
  ...flatListProps
}: FlatListWrapperProps<T>) {
  const { overlay, onScroll, onScrollEndDrag } = useOstrichRefresh({ refreshing, onRefresh, threshold });

  return (
    <View style={styles.container}>
      {overlay}
      <Animated.FlatList
        {...(flatListProps as any)}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  ostrich: {
    width: OSTRICH_SIZE,
    height: OSTRICH_SIZE,
  },
});
