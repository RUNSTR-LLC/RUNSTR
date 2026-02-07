import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalWorkoutStorageService, {
  type LocalWorkout,
} from '../fitness/LocalWorkoutStorageService';
import FitnessTestService from '../fitness/FitnessTestService';
import type { FitnessTestResult } from '../../types/fitnessTest';
import { BodyCompositionAnalytics } from '../analytics/BodyCompositionAnalytics';
import type { HealthProfile } from '../../types/analytics';
import { JournalService } from '../journal/JournalService';
import { getMoodOption, getEnergyOption } from '../../types/journal';

const CONTEXT_STORAGE_KEY = '@runstr:ai_context';
const CONTEXT_TIMESTAMP_KEY = '@runstr:ai_context_timestamp';
const CONVERSATION_MEMORY_KEY = '@runstr:ai_conversation_memory';
const MAX_MEMORY_ENTRIES = 10;

export interface ConversationMemory {
  timestamp: string;
  type: 'weekly' | 'trends' | 'tips' | 'bmi' | 'vo2max' | 'fitness_age';
  query: string;
  summary: string;
}

export class RunstrContextGenerator {
  /**
   * Generate complete RUNSTR.md context file
   */
  static async generateContext(): Promise<string> {
    const sections: string[] = [];

    // Header
    sections.push('# RUNSTR Context File');
    sections.push(`Last Updated: ${new Date().toISOString()}`);
    sections.push('');

    // Physical Profile
    const physicalProfile = await this.getPhysicalProfile();
    if (physicalProfile) {
      sections.push(physicalProfile);
    }

    // Body Composition Data (BMI, VO2 Max, Fitness Age)
    const bodyComposition = await this.getBodyCompositionData();
    if (bodyComposition) {
      sections.push(bodyComposition);
    }

    // Goals & Habits
    const goalsHabits = await this.getGoalsAndHabits();
    if (goalsHabits) {
      sections.push(goalsHabits);
    }

    // Fitness Test Results
    const fitnessTests = await this.getFitnessTestResults();
    if (fitnessTests) {
      sections.push(fitnessTests);
    }

    // Journal Entries
    const journalContext = await this.getJournalContext();
    if (journalContext) {
      sections.push(journalContext);
    }

    // Recent Performance
    const recentPerformance = await this.getRecentPerformance();
    if (recentPerformance) {
      sections.push(recentPerformance);
    }

    // Workout Details
    const workoutDetails = await this.getWorkoutDetails();
    if (workoutDetails) {
      sections.push(workoutDetails);
    }

    // Diet & Wellness
    const dietWellness = await this.getDietAndWellness();
    if (dietWellness) {
      sections.push(dietWellness);
    }

    // Conversation Memory
    const memory = await this.getConversationMemory();
    if (memory) {
      sections.push(memory);
    }

    return sections.join('\n');
  }

  /**
   * Update stored context
   */
  static async updateContext(): Promise<void> {
    try {
      const context = await this.generateContext();
      await AsyncStorage.setItem(CONTEXT_STORAGE_KEY, context);
      await AsyncStorage.setItem(
        CONTEXT_TIMESTAMP_KEY,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error updating RUNSTR context:', error);
    }
  }

  /**
   * Get stored context
   */
  static async getContext(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(CONTEXT_STORAGE_KEY);
    } catch (error) {
      console.error('Error retrieving RUNSTR context:', error);
      return null;
    }
  }

  /**
   * Append conversation to memory
   */
  static async appendMemory(
    type: 'weekly' | 'trends' | 'tips' | 'bmi' | 'vo2max' | 'fitness_age',
    query: string,
    response: string
  ): Promise<void> {
    try {
      // Get existing memory
      const memoryJson = await AsyncStorage.getItem(CONVERSATION_MEMORY_KEY);
      const memory: ConversationMemory[] = memoryJson
        ? JSON.parse(memoryJson)
        : [];

      // Create summary from response (first 150 chars)
      const summary = response
        .split('\n')
        .slice(0, 2)
        .join(' ')
        .substring(0, 150);

      // Add new entry
      memory.unshift({
        timestamp: new Date().toISOString(),
        type,
        query,
        summary,
      });

      // Keep only last MAX_MEMORY_ENTRIES
      const trimmedMemory = memory.slice(0, MAX_MEMORY_ENTRIES);

      // Save back
      await AsyncStorage.setItem(
        CONVERSATION_MEMORY_KEY,
        JSON.stringify(trimmedMemory)
      );

      // Update context file
      await this.updateContext();
    } catch (error) {
      console.error('Error appending conversation memory:', error);
    }
  }

  /**
   * Clear conversation memory
   */
  static async clearMemory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONVERSATION_MEMORY_KEY);
      await this.updateContext();
    } catch (error) {
      console.error('Error clearing conversation memory:', error);
    }
  }

  // Private helper methods

  private static async getPhysicalProfile(): Promise<string | null> {
    try {
      // Get health profile from AsyncStorage (stored as JSON object)
      const profileData = await AsyncStorage.getItem('@runstr:health_profile');

      if (!profileData) {
        return null;
      }

      const profile = JSON.parse(profileData);

      if (!profile.height && !profile.weight) {
        return null;
      }

      const lines: string[] = ['## Physical Profile'];

      if (profile.height) {
        lines.push(`- Height: ${profile.height} cm`);
      }

      if (profile.weight) {
        lines.push(`- Weight: ${profile.weight} kg`);
      }

      if (profile.age) {
        lines.push(`- Age: ${profile.age} years`);
      }

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  private static async getBodyCompositionData(): Promise<string | null> {
    try {
      // Get health profile data from AsyncStorage (stored as JSON object)
      const profileData = await AsyncStorage.getItem('@runstr:health_profile');

      if (!profileData) {
        return null;
      }

      const profile = JSON.parse(profileData);
      const heightCm = profile.height; // Already in cm
      const weightKg = profile.weight; // Already in kg
      const age = profile.age;

      // Need at least height and weight for BMI
      if (!heightCm || !weightKg) {
        return null;
      }

      const lines: string[] = ['## Body Composition Data'];

      // Create health profile for calculations
      const healthProfile: HealthProfile = {
        height: heightCm,
        weight: weightKg,
        age: age,
        biologicalSex: profile.biologicalSex,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // BMI Calculation
      const bmi = BodyCompositionAnalytics.calculateBMI(weightKg, heightCm);
      const healthyRange = BodyCompositionAnalytics.getHealthyWeightRange(heightCm);

      lines.push('');
      lines.push('### BMI Analysis');
      lines.push(`- Height: ${heightCm} cm`);
      lines.push(`- Weight: ${weightKg} kg`);
      lines.push(`- BMI: ${bmi.value} (${bmi.category})`);
      lines.push(`- Healthy Weight Range: ${healthyRange.min} - ${healthyRange.max} kg`);
      lines.push(`- Note: BMI does not account for muscle mass - athletes may show "overweight" despite being fit`);

      // Get workouts for VO2 Max estimation
      const allWorkouts = await LocalWorkoutStorageService.getAllWorkouts();

      // VO2 Max Estimation (now returns extended VO2MaxResult with confidence/method)
      const vo2MaxData = BodyCompositionAnalytics.estimateVO2Max(allWorkouts, healthProfile);

      lines.push('');
      lines.push('### VO2 Max Estimation');

      if (vo2MaxData) {
        lines.push(`- Estimated VO2 Max: ${vo2MaxData.estimate} ml/kg/min`);
        lines.push(`- Fitness Category: ${vo2MaxData.category}`);
        lines.push(`- Percentile: ${vo2MaxData.percentile}th percentile for age/sex`);
        lines.push(`- Confidence: ${vo2MaxData.confidence.toUpperCase()}`);
        lines.push(`- Method: ${vo2MaxData.methodDescription}`);

        // Formula reference for transparency
        if (vo2MaxData.method === '5k' || vo2MaxData.method === '10k') {
          lines.push(`- Formula: Jack Daniels' VDOT (industry standard for race-based VO2 Max)`);
        } else {
          lines.push(`- Formula: Léger & Mercier running economy (pace-based estimate)`);
          lines.push(`- Recommendation: Complete a timed 5K or 10K for more accurate results`);
        }

        // RUNSTR Fitness Age (activity-focused, encouraging calculation)
        if (age) {
          const runstrFitnessAge = BodyCompositionAnalytics.calculateRunstrFitnessAge(age, allWorkouts);

          lines.push('');
          lines.push('### RUNSTR Fitness Age');
          lines.push(`- Chronological Age: ${age} years`);
          lines.push(`- RUNSTR Fitness Age: ${runstrFitnessAge.fitnessAge} years`);

          const ageDiff = age - runstrFitnessAge.fitnessAge;
          if (ageDiff > 0) {
            lines.push(`- Result: ${ageDiff} years younger than actual age`);
          } else if (ageDiff < 0) {
            lines.push(`- Result: ${Math.abs(ageDiff)} years older than actual age`);
          } else {
            lines.push(`- Result: Fitness age matches chronological age`);
          }

          lines.push(`- Summary: ${runstrFitnessAge.summary}`);
          lines.push('');
          lines.push('#### Breakdown:');
          lines.push(`- Consistency Bonus: ${runstrFitnessAge.breakdown.consistencyBonus} years (workout frequency)`);
          lines.push(`- Volume Bonus: ${runstrFitnessAge.breakdown.volumeBonus} years (weekly distance/time)`);
          lines.push(`- Variety Bonus: ${runstrFitnessAge.breakdown.varietyBonus} years (activity types)`);
          lines.push(`- Cardio Bonus: ${runstrFitnessAge.breakdown.cardioBonus} years (cardio performance)`);
          if (runstrFitnessAge.breakdown.inactivityPenalty > 0) {
            lines.push(`- Inactivity Penalty: +${runstrFitnessAge.breakdown.inactivityPenalty} years`);
          }
          lines.push('');
          lines.push(`- Formula: RUNSTR Activity-Based (rewards consistency and showing up)`);
        } else {
          lines.push('');
          lines.push('### RUNSTR Fitness Age');
          lines.push('- Age not provided in Health Profile - cannot calculate fitness age');
        }

        // Add workout frequency context
        const avgWeeklyWorkouts = BodyCompositionAnalytics.getAverageWeeklyWorkouts(allWorkouts, 4);
        let activityLevel = 'Sedentary';
        if (avgWeeklyWorkouts >= 5) activityLevel = 'Very Active (5+ workouts/week)';
        else if (avgWeeklyWorkouts >= 3) activityLevel = 'Active (3-4 workouts/week)';
        else if (avgWeeklyWorkouts >= 1) activityLevel = 'Moderate (1-2 workouts/week)';

        lines.push('');
        lines.push('### Activity Summary');
        lines.push(`- Average Workouts per Week (last 4 weeks): ${avgWeeklyWorkouts.toFixed(1)}`);
        lines.push(`- Activity Level: ${activityLevel}`);

      } else {
        lines.push('- No running/walking workouts found');
        lines.push('- Complete a timed 5K or 10K run to get VO2 Max estimate');

        // RUNSTR Fitness Age can still be calculated from any activity
        if (age) {
          const runstrFitnessAge = BodyCompositionAnalytics.calculateRunstrFitnessAge(age, allWorkouts);

          lines.push('');
          lines.push('### RUNSTR Fitness Age');
          lines.push(`- Chronological Age: ${age} years`);
          lines.push(`- RUNSTR Fitness Age: ${runstrFitnessAge.fitnessAge} years`);
          lines.push(`- Summary: ${runstrFitnessAge.summary}`);
          lines.push(`- Formula: RUNSTR Activity-Based (rewards consistency and showing up)`);
        }
      }

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      console.error('Error generating body composition data:', error);
      return null;
    }
  }

  private static async getJournalContext(): Promise<string | null> {
    try {
      // Get last 7 days of journal entries
      const recentEntries = await JournalService.getRecentEntries(7);

      if (!recentEntries || recentEntries.length === 0) {
        return null;
      }

      const lines: string[] = ['## Recent Journal Entries'];
      lines.push('');

      // Include each entry (truncate to 300 chars for API cost efficiency)
      recentEntries.forEach((entry) => {
        const date = new Date(entry.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        // Build mood/energy indicator
        const indicators: string[] = [];
        if (entry.mood) {
          const moodOpt = getMoodOption(entry.mood);
          if (moodOpt) {
            indicators.push(`Mood: ${moodOpt.label}`);
          }
        }
        if (entry.energy) {
          indicators.push(`Energy: ${entry.energy}/5`);
        }

        const indicatorStr = indicators.length > 0
          ? ` (${indicators.join(', ')})`
          : '';

        // Truncate content to 300 chars
        const truncatedContent =
          entry.content.length > 300
            ? entry.content.substring(0, 300) + '...'
            : entry.content;

        lines.push(`[${date}]${indicatorStr}`);
        lines.push(`"${truncatedContent}"`);
        lines.push('');
      });

      // Add journal stats
      const stats = await JournalService.getStats();
      if (stats.currentStreak > 1) {
        lines.push(`Journal Streak: ${stats.currentStreak} days`);
      }
      if (stats.averageMood) {
        const moodLabel =
          stats.averageMood >= 4 ? 'Good' :
          stats.averageMood >= 3 ? 'Neutral' : 'Low';
        lines.push(`Average Mood: ${moodLabel} (${stats.averageMood.toFixed(1)}/5)`);
      }

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      console.error('[RunstrContextGenerator] Journal context error:', error);
      return null;
    }
  }

  private static async getGoalsAndHabits(): Promise<string | null> {
    try {
      // Try to get goals/habits from AsyncStorage
      // These would be stored by Goals & Habits feature
      const goalsJson = await AsyncStorage.getItem('@runstr:goals');
      const habitsJson = await AsyncStorage.getItem('@runstr:habits');

      if (!goalsJson && !habitsJson) {
        return null;
      }

      const lines: string[] = ['## Goals & Habits'];

      if (goalsJson) {
        const goals = JSON.parse(goalsJson);
        if (goals.primary) {
          lines.push(`Primary Goal: ${goals.primary}`);
        }
        if (goals.focus) {
          lines.push(`Training Focus: ${goals.focus}`);
        }
      }

      if (habitsJson) {
        const habits = JSON.parse(habitsJson);
        if (habits.routine) {
          lines.push(`Habits: ${habits.routine}`);
        }
      }

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  private static async getFitnessTestResults(): Promise<string | null> {
    try {
      const history = await FitnessTestService.getTestHistory();
      if (!history || history.length === 0) {
        return null;
      }

      const lines: string[] = ['## Fitness Test Results'];

      // Latest test
      const latest = history[0];
      const date = new Date(latest.timestamp).toISOString().split('T')[0];
      lines.push(
        `Latest (${date}): ${latest.compositeScore}/300 (${latest.grade})`
      );

      // Component breakdown
      const components: string[] = [];
      if (latest.pushups) {
        components.push(
          `Pushups: ${latest.pushups.reps} → ${latest.pushups.score}pts`
        );
      }
      if (latest.situps) {
        components.push(
          `Situps: ${latest.situps.reps} → ${latest.situps.score}pts`
        );
      }
      if (latest.run && latest.run.timeSeconds) {
        const runTime = this.formatDuration(latest.run.timeSeconds);
        components.push(`5K: ${runTime} → ${latest.run.score}pts`);
      }
      if (components.length > 0) {
        lines.push(`- ${components.join(' | ')}`);
      }

      // Personal best
      const pb = await FitnessTestService.getPersonalBest();
      if (pb && pb.compositeScore === latest.compositeScore) {
        lines.push('Personal Best: Yes!');
      } else if (pb) {
        lines.push(`Personal Best: ${pb.compositeScore}/300`);
      }

      // History (last 5 tests)
      if (history.length > 1) {
        const historyScores = history
          .slice(1, 6)
          .map((test) => {
            const testDate = new Date(test.timestamp);
            const month = testDate.toLocaleDateString('en-US', {
              month: 'short',
            });
            return `${test.compositeScore} (${month})`;
          })
          .join(', ');
        lines.push(`History: ${historyScores}`);
      }

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  private static async getRecentPerformance(): Promise<string | null> {
    try {
      const allWorkouts = await LocalWorkoutStorageService.getAllWorkouts();
      if (!allWorkouts || allWorkouts.length === 0) {
        return null;
      }

      // Filter last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentWorkouts = allWorkouts.filter((w) => {
        const workoutDate = new Date(w.startTime);
        return workoutDate >= thirtyDaysAgo;
      });

      if (recentWorkouts.length === 0) {
        return null;
      }

      const lines: string[] = ['## Recent Performance (Last 30 Days)'];

      // Calculate totals
      const totalDistance = recentWorkouts.reduce(
        (sum, w) => sum + (w.distance || 0),
        0
      );
      const totalDuration = recentWorkouts.reduce(
        (sum, w) => sum + (w.duration || 0),
        0
      );
      const totalCalories = recentWorkouts.reduce(
        (sum, w) => sum + (w.calories || 0),
        0
      );

      lines.push(
        `Total: ${recentWorkouts.length} workouts, ` +
          `${(totalDistance / 1000).toFixed(1)}km, ` +
          `${this.formatDuration(totalDuration)}`
      );

      // Breakdown by activity type
      const byType: { [key: string]: { count: number; distance: number } } = {};
      recentWorkouts.forEach((w) => {
        if (!byType[w.type]) {
          byType[w.type] = { count: 0, distance: 0 };
        }
        byType[w.type].count++;
        byType[w.type].distance += w.distance || 0;
      });

      Object.entries(byType).forEach(([type, stats]) => {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        if (stats.distance > 0) {
          lines.push(
            `- ${typeName}: ${stats.count} workouts (${(
              stats.distance / 1000
            ).toFixed(1)}km)`
          );
        } else {
          lines.push(`- ${typeName}: ${stats.count} sessions`);
        }
      });

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  private static async getWorkoutDetails(): Promise<string | null> {
    try {
      const allWorkouts = await LocalWorkoutStorageService.getAllWorkouts();
      if (!allWorkouts || allWorkouts.length === 0) {
        return null;
      }

      const lines: string[] = ['## Workout Details (Last 10)'];

      // Get last 10 workouts
      const recentWorkouts = allWorkouts.slice(0, 10);

      recentWorkouts.forEach((workout, index) => {
        const date = new Date(workout.startTime).toISOString().split('T')[0];
        const type =
          workout.type.charAt(0).toUpperCase() + workout.type.slice(1);

        let details = `${index + 1}. [${date}] ${type}`;

        if (workout.distance) {
          details += ` - ${(workout.distance / 1000).toFixed(2)}km`;
        }

        if (workout.duration) {
          details += `, ${this.formatDuration(workout.duration)}`;
        }

        if (workout.pace) {
          details += `, ${this.formatPace(workout.pace)}/km`;
        }

        if (workout.calories) {
          details += `, ${workout.calories} cal`;
        }

        // Strength training details
        if (workout.type === 'strength' && workout.repsBreakdown) {
          const repsStr = workout.repsBreakdown.join(',');
          const sets = workout.sets || workout.repsBreakdown.length;
          details += ` - ${
            workout.exerciseType || 'Exercise'
          } ${sets}x[${repsStr}]`;
        }

        lines.push(details);
      });

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  private static async getDietAndWellness(): Promise<string | null> {
    try {
      const allWorkouts = await LocalWorkoutStorageService.getAllWorkouts();
      if (!allWorkouts || allWorkouts.length === 0) {
        return null;
      }

      // Filter last 7 days for diet/wellness
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentWorkouts = allWorkouts.filter((w) => {
        const workoutDate = new Date(w.startTime);
        return workoutDate >= sevenDaysAgo;
      });

      const dietWorkouts = recentWorkouts.filter(
        (w) => w.type === 'diet' || w.type === 'fasting'
      );
      const meditationWorkouts = recentWorkouts.filter(
        (w) => w.type === 'meditation'
      );

      if (dietWorkouts.length === 0 && meditationWorkouts.length === 0) {
        return null;
      }

      const lines: string[] = ['## Diet & Nutrition (Last 7 Days)'];

      if (dietWorkouts.length > 0) {
        const meals = dietWorkouts.filter((w) => w.type === 'diet');
        const fasting = dietWorkouts.filter((w) => w.type === 'fasting');

        if (meals.length > 0) {
          lines.push('');
          lines.push('### Meals Logged');
          lines.push(
            '*Please analyze these meals and provide improved calorie estimates based on the food descriptions.*'
          );
          lines.push('');

          // Sort meals by date (newest first)
          const sortedMeals = [...meals].sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );

          // Include up to 10 most recent meals for detailed analysis
          sortedMeals.slice(0, 10).forEach((meal) => {
            const date = new Date(meal.startTime).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const time = meal.mealTime
              ? new Date(meal.mealTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '';

            const mealType = meal.mealType
              ? meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)
              : 'Meal';
            const size = meal.mealSize || 'medium';
            const currentCalEst = meal.calories
              ? `[current est: ${meal.calories} cal]`
              : '';
            const description = meal.notes || 'No description';

            lines.push(
              `- **${date}** ${mealType} (${size}${time ? ', ' + time : ''}): "${description}" ${currentCalEst}`
            );
          });

          // Summary stats
          const totalCurrentCals = meals.reduce(
            (sum, m) => sum + (m.calories || 0),
            0
          );
          lines.push('');
          lines.push(
            `**Summary**: ${meals.length} meals logged, current calorie estimate: ${totalCurrentCals} cal`
          );
          lines.push(
            '*Note: Current estimates are based on portion size only. Please provide refined estimates based on the actual food descriptions above.*'
          );
        }

        if (fasting.length > 0) {
          lines.push('');
          const fastingDurations = fasting
            .map((w) => `${Math.round((w.fastingDuration || 0) / 3600)}h`)
            .join(', ');
          lines.push(
            `- Fasting: ${fasting.length} sessions (${fastingDurations})`
          );
        }
      }

      if (meditationWorkouts.length > 0) {
        const avgDuration =
          meditationWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) /
          meditationWorkouts.length;
        lines.push(
          `- Meditation: ${
            meditationWorkouts.length
          } sessions (avg ${Math.round(avgDuration / 60)}min)`
        );
      }

      lines.push('');
      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  private static async getConversationMemory(): Promise<string | null> {
    try {
      const memoryJson = await AsyncStorage.getItem(CONVERSATION_MEMORY_KEY);
      if (!memoryJson) {
        return null;
      }

      const memory: ConversationMemory[] = JSON.parse(memoryJson);
      if (memory.length === 0) {
        return null;
      }

      const lines: string[] = ['## Conversation Memory'];

      memory.forEach((entry) => {
        const date = new Date(entry.timestamp).toISOString().split('T')[0];
        const typeLabel =
          entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
        lines.push(`[${date} | ${typeLabel}] ${entry.query}`);
        lines.push(`- ${entry.summary}`);
        lines.push('');
      });

      return lines.join('\n');
    } catch (error) {
      return null;
    }
  }

  // Utility methods

  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${secs}s`;
    }
  }

  private static formatPace(pace: number): string {
    // pace is in seconds per km
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
