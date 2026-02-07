/**
 * FullScreenVerticalCard - Native full-screen workout card for social sharing
 * Fills entire screen with clean vertical layout optimized for screenshots
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { theme } from '../../../styles/theme';
import type { PublishableWorkout } from '../../../services/nostr/workoutPublishingService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullScreenVerticalCardProps {
  workout: PublishableWorkout;
  userAvatar?: string;
  userName?: string;
}

// Motivational quotes by workout/exercise type
const QUOTES: Record<string, string[]> = {
  pushups: [
    'Every pushup is a step toward a stronger you.',
    'The floor is your foundation. Push through and rise.',
    'Your strength is not in your arms, but in your will to continue.',
  ],
  pullups: [
    'Pull yourself up, one rep at a time.',
    "The bar is waiting. Show it who's boss.",
    'Every pullup is proof that you can rise above.',
  ],
  bench: [
    'Press through. The bar is your friend.',
    'Your chest, your power. Push it to new limits.',
    'Lift heavy, grow stronger.',
  ],
  squats: [
    'Squat low, rise high.',
    'Build your throne, one squat at a time.',
    'Your legs are your foundation.',
  ],
  deadlifts: [
    "Pick it up. Put it down. That's how legends are made.",
    "The deadlift shows exactly what you're made of.",
    'Lift from the ground up.',
  ],
  curls: [
    'Curl your way to greatness.',
    'Every curl is a commitment to your stronger self.',
  ],
  situps: [
    'Core strength starts with discipline.',
    "Every situp is a victory over yesterday's limits.",
  ],
  plank: [
    'Hold steady. Your core is stronger than you think.',
    "The plank reveals your true strength.",
  ],
  running: [
    'Every step forward is a step toward something bigger.',
    "The miracle isn't that I finished. It's that I started.",
    "It's your mind you have to convince.",
  ],
  walking: [
    'One step at a time.',
    'Every step counts.',
    'Progress is progress, no matter how small.',
  ],
  cycling: [
    'To keep your balance, you must keep moving.',
    'It never gets easier; you just go faster.',
  ],
  meditation: [
    'Peace comes from within.',
    'The mind is everything.',
    'Keep stillness inside of you.',
  ],
  gym: [
    "The only bad workout is the one that didn't happen.",
    "Strength comes from overcoming what you thought you couldn't.",
  ],
  default: [
    'You showed up. That matters.',
    'Consistency beats perfection.',
    'Progress, not perfection.',
  ],
};

export const FullScreenVerticalCard: React.FC<FullScreenVerticalCardProps> = ({
  workout,
  userAvatar,
  userName,
}) => {
  // Get random quote based on exercise/workout type
  const quote = useMemo(() => {
    const exerciseType = workout.exerciseType?.toLowerCase() || '';
    const workoutType = workout.type?.toLowerCase() || '';

    // Try exercise-specific quotes first
    for (const [key, quotes] of Object.entries(QUOTES)) {
      if (exerciseType.includes(key)) {
        return quotes[Math.floor(Math.random() * quotes.length)];
      }
    }

    // Fall back to workout type quotes
    const typeQuotes = QUOTES[workoutType] || QUOTES.default;
    return typeQuotes[Math.floor(Math.random() * typeQuotes.length)];
  }, [workout]);

  // Format date
  const dateStr = new Date(workout.startTime).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Get workout type display name
  const activityName = workout.exerciseType
    ? workout.exerciseType.charAt(0).toUpperCase() + workout.exerciseType.slice(1)
    : workout.type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Get primary stat (hero number)
  const getPrimaryStat = () => {
    // Strength training: show total reps
    // Note: workout.reps is already the TOTAL reps (sum across all sets), not per-set
    if (workout.type === 'strength_training' || workout.type === 'gym') {
      const totalReps = workout.reps || 0;
      return { value: totalReps.toString(), label: 'REPS' };
    }

    // Step counter: show steps (prefer workout.steps, fallback to metadata.steps)
    const stepCount = workout.steps ?? (workout.metadata as any)?.steps;
    if (workout.type === 'walking' && stepCount) {
      return { value: stepCount.toLocaleString(), label: 'STEPS' };
    }

    // Cardio with distance: show distance
    if (workout.distance && workout.distance > 0) {
      const km = (workout.distance / 1000).toFixed(2);
      return { value: km, label: 'KM' };
    }

    // Duration-based
    const minutes = Math.floor(workout.duration / 60);
    return { value: minutes.toString(), label: 'MIN' };
  };

  // Get secondary stats
  const getSecondaryStats = () => {
    const stats: Array<{ label: string; value: string }> = [];

    // Strength training: show sets breakdown with actual per-set reps
    if ((workout.type === 'strength_training' || workout.type === 'gym') && workout.sets) {
      // Use repsBreakdown if available (array of actual reps per set)
      const repsPerSet = workout.repsBreakdown as number[] | undefined;
      for (let i = 1; i <= workout.sets; i++) {
        const setReps = repsPerSet && repsPerSet[i - 1] !== undefined
          ? repsPerSet[i - 1]
          : Math.round((workout.reps || 0) / workout.sets);
        stats.push({ label: `SET ${i}`, value: `${setReps} reps` });
      }
      return stats;
    }

    // Step workouts: show estimated distance
    const stepCount = workout.steps ?? (workout.metadata as any)?.steps;
    if (stepCount) {
      const estDistKm = workout.distance && workout.distance > 0
        ? (workout.distance / 1000).toFixed(2)
        : (stepCount * 0.67 / 1000).toFixed(2);
      stats.push({ label: 'DISTANCE', value: `~${estDistKm} km` });
      if (workout.duration > 0) {
        const mins = Math.floor(workout.duration / 60);
        const secs = Math.floor(workout.duration % 60);
        stats.push({ label: 'TIME', value: `${mins}:${secs.toString().padStart(2, '0')}` });
      }
      return stats;
    }

    // Cardio stats
    if (workout.duration > 0 && workout.distance !== 0) {
      const mins = Math.floor(workout.duration / 60);
      const secs = Math.floor(workout.duration % 60);
      stats.push({ label: 'TIME', value: `${mins}:${secs.toString().padStart(2, '0')}` });
    }

    if (workout.distance && workout.distance > 0) {
      // Calculate pace
      const paceMinutes = workout.duration / 60 / (workout.distance / 1000);
      const paceMins = Math.floor(paceMinutes);
      const paceSecs = Math.round((paceMinutes - paceMins) * 60);
      stats.push({ label: 'PACE', value: `${paceMins}:${paceSecs.toString().padStart(2, '0')}/km` });
    }

    if (workout.calories && workout.calories > 0) {
      stats.push({ label: 'CALORIES', value: Math.round(workout.calories).toString() });
    }

    return stats;
  };

  const primaryStat = getPrimaryStat();
  const secondaryStats = getSecondaryStats();

  return (
    <View style={styles.container}>
      {/* Top branding */}
      <View style={styles.brandingTop}>
        <Text style={styles.brandingText}>R U N S T R</Text>
      </View>

      {/* Activity name and date */}
      <View style={styles.headerSection}>
        <Text style={styles.activityName}>{activityName}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>

      {/* Hero stat */}
      <View style={styles.heroSection}>
        <Text style={styles.heroValue}>{primaryStat.value}</Text>
        <Text style={styles.heroLabel}>{primaryStat.label}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Secondary stats */}
      {secondaryStats.length > 0 && (
        <View style={styles.statsSection}>
          {secondaryStats.map((stat, index) => (
            <View key={index} style={styles.statRow}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>"{quote}"</Text>
      </View>

      {/* User info (optional) */}
      {(userAvatar || userName) && (
        <View style={styles.userSection}>
          {userAvatar && (
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
          )}
          {userName && (
            <Text style={styles.userName}>{userName}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },

  brandingTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandingText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 8,
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  activityName: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  heroSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: 120,
    fontWeight: '200',
    color: '#fff',
    lineHeight: 130,
  },
  heroLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 4,
    marginTop: -10,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 24,
  },

  statsSection: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
  },

  quoteSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },

  userSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default FullScreenVerticalCard;
