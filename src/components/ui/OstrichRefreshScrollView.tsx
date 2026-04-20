/**
 * OstrichRefreshScrollView — RUNSTR-branded pull-to-refresh.
 *
 * Drop-in replacement for ScrollView where you want the brand ostrich to
 * appear as the user pulls, instead of a generic system spinner.
 *
 * Usage:
 *   <OstrichRefreshScrollView refreshing={isLoading} onRefresh={refetch}>
 *     {children}
 *   </OstrichRefreshScrollView>
 *
 * Migration note: screens currently using <ScrollView refreshControl={...}>
 * can switch to this wrapper organically. FlatList callers need a separate
 * FlatList variant — add when first requested.
 */

import React, { useRef } from 'react';
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../styles/theme';

const OSTRICH_SIZE = 56;
const PULL_THRESHOLD = 80;
const HEADER_HEIGHT = 72;

interface Props extends Omit<ScrollViewProps, 'refreshControl' | 'onScroll'> {
  refreshing: boolean;
  onRefresh: () => void;
  threshold?: number;
  children: React.ReactNode;
}

export const OstrichRefreshScrollView: React.FC<Props> = ({
  refreshing,
  onRefresh,
  threshold = PULL_THRESHOLD,
  children,
  contentContainerStyle,
  ...scrollViewProps
}) => {
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

  return (
    <View style={styles.container}>
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
      <Animated.ScrollView
        {...scrollViewProps}
        contentContainerStyle={contentContainerStyle}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
