// src/components/lottery/LotteryWheel.tsx

import React, { useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, G, Text as SvgText, Polygon } from 'react-native-svg';
import { theme } from '../../styles/theme';
import { DEFAULT_SEGMENTS } from '../../types/lottery';
import type { LotterySegment } from '../../types/lottery';

const WHEEL_SIZE = 280;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 10;
const SEGMENT_COLORS = ['#1a1a1a', '#111111'];
const SEGMENT_GLOW = theme.colors.orangeDeep;

export interface LotteryWheelRef {
  spinToSegment: (segmentIndex: number) => void;
  startSpinning: () => void;
  stopWithError: () => void;
}

interface LotteryWheelProps {
  segments?: LotterySegment[];
  dimmed?: boolean;
  winningIndex?: number | null;
  onSpinComplete?: () => void;
  size?: number;
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (Math.PI / 180) * startAngle;
  const endRad = (Math.PI / 180) * endAngle;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export const LotteryWheel = forwardRef<LotteryWheelRef, LotteryWheelProps>(
  ({ segments = DEFAULT_SEGMENTS, dimmed = false, winningIndex = null, onSpinComplete, size: sizeProp }, ref) => {
    const wheelSize = sizeProp || WHEEL_SIZE;
    const center = wheelSize / 2;
    const radius = wheelSize / 2 - 10;
    const rotation = useRef(new Animated.Value(0)).current;
    const currentRotation = useRef(0);
    const isSpinning = useRef(false);
    const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);
    const glowOpacity = useRef(new Animated.Value(0)).current;

    const segmentAngle = 360 / segments.length;

    useEffect(() => {
      const id = rotation.addListener(({ value }) => {
        currentRotation.current = value;
      });
      return () => rotation.removeListener(id);
    }, [rotation]);

    useEffect(() => {
      if (winningIndex !== null) {
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 300, useNativeDriver: false }),
        ]).start();
      } else {
        glowOpacity.setValue(0);
      }
    }, [winningIndex]);

    const startSpinning = useCallback(() => {
      if (isSpinning.current) return;
      isSpinning.current = true;

      const spin = () => {
        const anim = Animated.timing(rotation, {
          toValue: currentRotation.current + 360,
          duration: 600,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        spinAnimation.current = anim;
        anim.start(({ finished }) => {
          if (finished && isSpinning.current) {
            spin();
          }
        });
      };
      spin();
    }, []);

    const spinToSegment = useCallback((segmentIndex: number) => {
      isSpinning.current = false;
      if (spinAnimation.current) {
        spinAnimation.current.stop();
      }

      const targetSegmentCenter = segmentIndex * segmentAngle + segmentAngle / 2;
      const targetAngle = 360 - targetSegmentCenter;
      const extraRotations = 3 * 360;
      const base = currentRotation.current;
      const normalizedBase = base % 360;
      const totalTarget = base + extraRotations + ((targetAngle - normalizedBase + 360) % 360);

      Animated.timing(rotation, {
        toValue: totalTarget,
        duration: 2500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onSpinComplete?.();
        }
      });
    }, [segmentAngle, onSpinComplete]);

    const stopWithError = useCallback(() => {
      isSpinning.current = false;
      if (spinAnimation.current) {
        spinAnimation.current.stop();
      }
      Animated.timing(rotation, {
        toValue: currentRotation.current + 90,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, []);

    useImperativeHandle(ref, () => ({
      spinToSegment,
      startSpinning,
      stopWithError,
    }));

    const rotationDeg = rotation.interpolate({
      inputRange: [-360, 0, 360],
      outputRange: ['-360deg', '0deg', '360deg'],
      extrapolate: 'extend',
    });

    return (
      <View style={[styles.container, dimmed && styles.dimmed]}>
        <View style={styles.pointerContainer}>
          <Svg width={20} height={16} viewBox="0 0 20 16">
            <Polygon
              points="10,16 0,0 20,0"
              fill={theme.colors.orangeDeep}
            />
          </Svg>
        </View>

        <Animated.View style={{ transform: [{ rotate: rotationDeg }] }}>
          <Svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
            {segments.map((seg, i) => {
              const startAngle = i * segmentAngle - 90;
              const endAngle = startAngle + segmentAngle;
              const midAngle = startAngle + segmentAngle / 2;
              const midRad = (Math.PI / 180) * midAngle;
              const textRadius = radius * 0.65;
              const textX = center + textRadius * Math.cos(midRad);
              const textY = center + textRadius * Math.sin(midRad);
              const isWinner = winningIndex === i;

              return (
                <G key={seg.segment}>
                  <Path
                    d={describeArc(center, center, radius, startAngle, endAngle)}
                    fill={isWinner ? '#2a1a0a' : SEGMENT_COLORS[i % 2]}
                    stroke={isWinner ? SEGMENT_GLOW : theme.colors.border}
                    strokeWidth={isWinner ? 2 : 1}
                    opacity={isWinner ? undefined : 1}
                  />
                  <SvgText
                    x={textX}
                    y={textY}
                    fill={isWinner ? theme.colors.orangeBright : theme.colors.text}
                    fontSize={isWinner ? 16 : 14}
                    fontWeight={isWinner ? '700' : '600'}
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    {seg.baseValue}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      </View>
    );
  }
);

LotteryWheel.displayName = 'LotteryWheel';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dimmed: {
    opacity: 0.6,
  },
  pointerContainer: {
    position: 'absolute',
    top: -2,
    zIndex: 10,
    alignItems: 'center',
  },
});
