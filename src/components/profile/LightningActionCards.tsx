/**
 * LightningActionCards — Three action buttons inside a rectangle,
 * divided by two zigzag lightning bolt lines creating:
 * - Top-left triangle: EXERCISE
 * - Middle parallelogram: HISTORY
 * - Bottom-right triangle: REWARDS
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface LightningActionCardsProps {
  onExercisePress: () => void;
  onHistoryPress: () => void;
  onRewardsPress: () => void;
}

const W = 400;
const H = 340;

// Line 1 endpoints: left-side (low) to right-side (high)
const L1_LEFT_Y = H * 0.55;
const L1_RIGHT_Y = H * 0.05;

// Line 2 endpoints: left-side (low) to right-side (high)
const L2_LEFT_Y = H * 0.95;
const L2_RIGHT_Y = H * 0.45;

// Generate zigzag points along a diagonal line
function zigzagPoints(
  x1: number, y1: number,
  x2: number, y2: number,
  segments: number,
  amplitude: number
): string {
  const points: string[] = [];
  points.push(`${x1},${y1}`);

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = x1 + (x2 - x1) * t;
    const baseY = y1 + (y2 - y1) * t;

    // Perpendicular offset alternating direction
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / len;
    const perpY = dx / len;

    const dir = i % 2 === 0 ? 1 : -1;
    const ox = baseX + perpX * amplitude * dir;
    const oy = baseY + perpY * amplitude * dir;

    points.push(`${Math.round(ox)},${Math.round(oy)}`);
  }

  points.push(`${x2},${y2}`);
  return points.join(' ');
}

const SEGS = 8;
const AMP = 12;

// Zigzag line 1 points
const ZZ1 = zigzagPoints(0, L1_LEFT_Y, W, L1_RIGHT_Y, SEGS, AMP);
const zz1Pts = ZZ1.split(' ').map(p => {
  const [x, y] = p.split(',').map(Number);
  return { x, y };
});

// Zigzag line 2 points
const ZZ2 = zigzagPoints(0, L2_LEFT_Y, W, L2_RIGHT_Y, SEGS, AMP);
const zz2Pts = ZZ2.split(' ').map(p => {
  const [x, y] = p.split(',').map(Number);
  return { x, y };
});

// Build polygon point strings using zigzag edges

// Exercise: top-left, top-right, then zigzag line 1 reversed (right to left)
const zz1Rev = [...zz1Pts].reverse().map(p => `${p.x},${p.y}`).join(' ');
const EXERCISE_POLY = `0,0 ${W},0 ${zz1Rev}`;

// History: zigzag line 1 (left to right), then zigzag line 2 reversed (right to left)
const zz1Fwd = zz1Pts.map(p => `${p.x},${p.y}`).join(' ');
const zz2Rev = [...zz2Pts].reverse().map(p => `${p.x},${p.y}`).join(' ');
const HISTORY_POLY = `${zz1Fwd} ${zz2Rev}`;

// Rewards: zigzag line 2 (left to right), then bottom-right, bottom-left
const zz2Fwd = zz2Pts.map(p => `${p.x},${p.y}`).join(' ');
const REWARDS_POLY = `${zz2Fwd} ${W},${H} 0,${H}`;

// Center points for text placement
const EXERCISE_CENTER_X = W * 0.35;
const EXERCISE_CENTER_Y = (0 + 0 + L1_RIGHT_Y + L1_LEFT_Y) / 4;

const HISTORY_CENTER_X = W * 0.45;
const HISTORY_CENTER_Y = (L1_LEFT_Y + L1_RIGHT_Y + L2_RIGHT_Y + L2_LEFT_Y) / 4;

const REWARDS_CENTER_X = W * 0.65;
const REWARDS_CENTER_Y = (L2_LEFT_Y + L2_RIGHT_Y + H + H) / 4;

export const LightningActionCards: React.FC<LightningActionCardsProps> = ({
  onExercisePress,
  onHistoryPress,
  onRewardsPress,
}) => {
  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        {/* Zone fills */}
        <Polygon points={EXERCISE_POLY} fill={theme.colors.cardBackground} />
        <Polygon points={HISTORY_POLY} fill={theme.colors.cardBackground} />
        <Polygon points={REWARDS_POLY} fill={theme.colors.cardBackground} />

        {/* Zigzag divider lines */}
        <Polyline
          points={ZZ1}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Polyline
          points={ZZ2}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Outer border */}
        <Polygon
          points={`0,0 ${W},0 ${W},${H} 0,${H}`}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth={2}
        />
      </Svg>

      {/* Touchable overlays */}
      <Pressable
        style={[styles.touchZone, {
          top: `${(EXERCISE_CENTER_Y / H) * 100 - 8}%`,
          left: `${(EXERCISE_CENTER_X / W) * 100 - 15}%`,
          width: '30%',
          height: '16%',
        }]}
        onPress={onExercisePress}
      >
        <Text style={styles.cardText}>EXERCISE</Text>
      </Pressable>

      <Pressable
        style={[styles.touchZone, {
          top: `${(HISTORY_CENTER_Y / H) * 100 - 8}%`,
          left: `${(HISTORY_CENTER_X / W) * 100 - 15}%`,
          width: '30%',
          height: '16%',
        }]}
        onPress={onHistoryPress}
      >
        <Text style={styles.cardText}>HISTORY</Text>
      </Pressable>

      <Pressable
        style={[styles.touchZone, {
          top: `${(REWARDS_CENTER_Y / H) * 100 - 8}%`,
          left: `${(REWARDS_CENTER_X / W) * 100 - 15}%`,
          width: '30%',
          height: '16%',
        }]}
        onPress={onRewardsPress}
      >
        <Text style={styles.cardText}>REWARDS</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: W / H,
    marginBottom: 16,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  touchZone: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    letterSpacing: 2,
  },
});
