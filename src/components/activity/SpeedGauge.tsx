/**
 * SpeedGauge - Visual speed gauge for cycling
 * Shows current speed with avg/max indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface SpeedGaugeProps {
  currentSpeed: number; // km/h
  maxSpeed: number; // km/h for this session
  avgSpeed: number; // km/h average
  unit?: 'km/h' | 'mph';
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  currentSpeed,
  maxSpeed,
  avgSpeed,
  unit = 'km/h',
}) => {
  const size = 160; // Compact size to fit all metrics on screen
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Gauge arc goes from 135deg to 405deg (270deg sweep)
  const startAngle = 135;
  const endAngle = 405;
  const sweepAngle = endAngle - startAngle;

  // Max displayable speed (for gauge scale)
  const gaugeMax = Math.max(60, Math.ceil(maxSpeed / 10) * 10 + 20);

  // Calculate angle for a given speed
  const speedToAngle = (speed: number): number => {
    const clampedSpeed = Math.min(Math.max(0, speed), gaugeMax);
    return startAngle + (clampedSpeed / gaugeMax) * sweepAngle;
  };

  // Convert angle to SVG path coordinates
  const angleToCoords = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  // Create arc path
  const createArc = (startAng: number, endAng: number, r: number): string => {
    const start = angleToCoords(startAng, r);
    const end = angleToCoords(endAng, r);
    const largeArcFlag = endAng - startAng > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Current speed arc
  const currentAngle = speedToAngle(currentSpeed);
  const speedArcPath = createArc(startAngle, currentAngle, radius);

  // Background arc (full gauge)
  const bgArcPath = createArc(startAngle, endAngle, radius);

  // Tick marks positions (0, gaugeMax/4, gaugeMax/2, 3*gaugeMax/4, gaugeMax)
  const tickPositions = [0, gaugeMax / 4, gaugeMax / 2, (3 * gaugeMax) / 4, gaugeMax];

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <Path
          d={bgArcPath}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Speed arc (colored based on speed) */}
        {currentSpeed > 0 && (
          <Path
            d={speedArcPath}
            stroke={currentSpeed > avgSpeed * 1.2 ? theme.colors.orangeBright : theme.colors.accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Tick marks */}
        {tickPositions.map((speed, i) => {
          const angle = speedToAngle(speed);
          const innerPoint = angleToCoords(angle, radius - strokeWidth - 4);
          const outerPoint = angleToCoords(angle, radius - strokeWidth - 12);
          return (
            <Path
              key={i}
              d={`M ${innerPoint.x} ${innerPoint.y} L ${outerPoint.x} ${outerPoint.y}`}
              stroke={theme.colors.textMuted}
              strokeWidth={2}
            />
          );
        })}

        {/* Tick labels */}
        {tickPositions.map((speed, i) => {
          const angle = speedToAngle(speed);
          const labelPoint = angleToCoords(angle, radius - strokeWidth - 24);
          return (
            <SvgText
              key={`label-${i}`}
              x={labelPoint.x}
              y={labelPoint.y}
              fill={theme.colors.textMuted}
              fontSize={10}
              fontWeight="500"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {Math.round(speed)}
            </SvgText>
          );
        })}

        {/* Center speed display */}
        <SvgText
          x={center}
          y={center - 8}
          fill={theme.colors.text}
          fontSize={34}
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {currentSpeed.toFixed(1)}
        </SvgText>
        <SvgText
          x={center}
          y={center + 18}
          fill={theme.colors.textMuted}
          fontSize={12}
          fontWeight="500"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {unit}
        </SvgText>
      </Svg>

      {/* Avg/Max stats below gauge */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>AVG</Text>
          <Text style={styles.statValue}>{avgSpeed.toFixed(1)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>MAX</Text>
          <Text style={[styles.statValue, styles.maxValue]}>{maxSpeed.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  maxValue: {
    color: theme.colors.orangeBright, // Bright orange for max speed
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
});
