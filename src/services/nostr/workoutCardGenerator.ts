/**
 * WorkoutCardGenerator - Beautiful Social Media Cards for Workouts
 * React Native SVG-based card generation inspired by Quotestr
 * Creates visually stunning workout achievement cards with RUNSTR branding
 */

import type { UnifiedWorkout } from '../fitness/workoutMergeService';
import type { WorkoutType } from '../../types/workout';

export interface WorkoutCardOptions {
  template?: 'achievement' | 'progress' | 'minimal' | 'stats';
  backgroundColor?: string;
  accentColor?: string;
  includeQR?: boolean;
  includeMap?: boolean; // For workouts with GPS data
  customMessage?: string;
  showBranding?: boolean;
}

export interface WorkoutCardData {
  svgContent: string;
  base64Image?: string;
  dimensions: { width: number; height: number };
  metadata: {
    workoutId: string;
    template: string;
    generatedAt: string;
  };
}

// Card templates configuration
const CARD_TEMPLATES = {
  achievement: {
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    accentColor: '#ffffff',
    showStats: true,
    showMotivation: true,
    showBranding: true,
  },
  progress: {
    width: 800,
    height: 600,
    backgroundColor: '#1a1a1a',
    accentColor: '#0a84ff',
    showStats: true,
    showProgress: true,
    showBranding: true,
  },
  minimal: {
    width: 600,
    height: 400,
    backgroundColor: '#0a0a0a',
    accentColor: '#ffffff',
    showStats: false,
    showMotivation: false,
    showBranding: false,
  },
  stats: {
    width: 800,
    height: 800,
    backgroundColor: '#000000',
    accentColor: '#ffffff',
    showStats: true,
    showCharts: true,
    showBranding: true,
  },
} as const;

export class WorkoutCardGenerator {
  private static instance: WorkoutCardGenerator;

  private constructor() {}

  static getInstance(): WorkoutCardGenerator {
    if (!WorkoutCardGenerator.instance) {
      WorkoutCardGenerator.instance = new WorkoutCardGenerator();
    }
    return WorkoutCardGenerator.instance;
  }

  /**
   * Generate workout card as SVG
   */
  async generateWorkoutCard(
    workout: UnifiedWorkout,
    options: WorkoutCardOptions = {}
  ): Promise<WorkoutCardData> {
    try {
      console.log(`🎨 Generating workout card for ${workout.type} workout...`);

      const template = options.template || 'achievement';
      const config = CARD_TEMPLATES[template];
      const dimensions = { width: config.width, height: config.height };

      // Generate SVG content
      const svgContent = this.createSVGCard(workout, config, options);

      return {
        svgContent,
        dimensions,
        metadata: {
          workoutId: workout.id,
          template,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Error generating workout card:', error);
      throw new Error('Failed to generate workout card');
    }
  }

  /**
   * Create SVG card content
   */
  private createSVGCard(
    workout: UnifiedWorkout,
    config: (typeof CARD_TEMPLATES)[keyof typeof CARD_TEMPLATES],
    options: WorkoutCardOptions
  ): string {
    const { width, height } = config;
    const backgroundColor = options.backgroundColor || config.backgroundColor;
    const accentColor = options.accentColor || config.accentColor;

    // Build SVG components
    const background = this.createBackground(width, height, backgroundColor);
    const activityIcon = this.createActivityIcon(
      workout.type,
      80,
      80,
      accentColor
    );
    const title = this.createTitle(workout, 100, accentColor);
    const stats = this.createStatsSection(workout, 180, accentColor);
    const achievement = this.createAchievementBadge(workout, 320, accentColor);
    const motivation = this.createMotivationalMessage(
      workout,
      420,
      accentColor
    );
    const branding =
      options.showBranding !== false
        ? this.createBranding(workout, height - 60, accentColor)
        : '';

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${background}
        <g transform="translate(40, 40)">
          ${activityIcon}
          ${title}
          ${stats}
          ${achievement}
          ${motivation}
        </g>
        ${branding}
      </svg>
    `.trim();
  }

  /**
   * Create background with gradient
   */
  private createBackground(
    width: number,
    height: number,
    backgroundColor: string
  ): string {
    return `
      <defs>
        <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${this.adjustBrightness(
            backgroundColor,
            20
          )};stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#backgroundGradient)" rx="12" ry="12"/>
    `;
  }

  /**
   * Create activity icon with workout type
   */
  private createActivityIcon(
    type: WorkoutType,
    y: number,
    size: number,
    accentColor: string
  ): string {
    const icons = {
      running: '🏃‍♂️',
      cycling: '🚴‍♂️',
      walking: '🚶‍♂️',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️‍♂️',
      yoga: '🧘‍♂️',
      other: '⚡',
    };

    const icon = icons[type] || icons.other;

    return `
      <g transform="translate(0, ${y})">
        <circle cx="40" cy="40" r="40" fill="${accentColor}20" stroke="${accentColor}" stroke-width="2"/>
        <text x="40" y="50" font-size="${
          size * 0.6
        }" text-anchor="middle" alignment-baseline="middle">${icon}</text>
      </g>
    `;
  }

  /**
   * Create workout title
   */
  private createTitle(
    workout: UnifiedWorkout,
    y: number,
    accentColor: string
  ): string {
    const workoutType =
      workout.type.charAt(0).toUpperCase() +
      workout.type.slice(1).replace('_', ' ');
    const completedText = 'Workout Complete!';

    return `
      <g transform="translate(100, ${y})">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${accentColor}">
          ${completedText}
        </text>
        <text x="0" y="35" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="${accentColor}">
          ${workoutType}
        </text>
      </g>
    `;
  }

  /**
   * Create stats section with key metrics
   */
  private createStatsSection(
    workout: UnifiedWorkout,
    y: number,
    accentColor: string
  ): string {
    const stats = this.getWorkoutStats(workout);
    let statsElements = '';
    let xOffset = 100;

    stats.forEach((stat, index) => {
      if (index < 4) {
        // Max 4 stats to fit nicely
        statsElements += `
          <g transform="translate(${xOffset}, ${y})">
            <rect x="0" y="0" width="140" height="80" fill="${accentColor}15" rx="8" ry="8" stroke="${accentColor}30" stroke-width="1"/>
            <text x="70" y="25" font-family="Arial, sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="${accentColor}">
              ${stat.value}
            </text>
            <text x="70" y="45" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="${accentColor}80">
              ${stat.label}
            </text>
          </g>
        `;
        xOffset += 160;
      }
    });

    return statsElements;
  }

  /**
   * Create achievement badge
   */
  private createAchievementBadge(
    workout: UnifiedWorkout,
    y: number,
    accentColor: string
  ): string {
    const achievement = this.getAchievementText(workout);

    if (!achievement) return '';

    return `
      <g transform="translate(100, ${y})">
        <rect x="0" y="0" width="500" height="60" fill="${accentColor}" rx="30" ry="30" filter="url(#glow)"/>
        <text x="250" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="600" text-anchor="middle" fill="#000000">
          🎉 ${achievement}
        </text>
      </g>
    `;
  }

  /**
   * Create motivational message
   */
  private createMotivationalMessage(
    workout: UnifiedWorkout,
    y: number,
    accentColor: string
  ): string {
    const message = this.getMotivationalMessage(workout);

    return `
      <g transform="translate(100, ${y})">
        <text x="250" y="0" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${accentColor}90">
          "${message}"
        </text>
      </g>
    `;
  }

  /**
   * Create RUNSTR branding
   */
  private createBranding(
    workout: UnifiedWorkout,
    y: number,
    accentColor: string
  ): string {
    return `
      <g transform="translate(40, ${y})">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="${accentColor}60">
          💪 Tracked with RUNSTR
        </text>
        <text x="600" y="0" font-family="Arial, sans-serif" font-size="12" text-anchor="end" fill="${accentColor}40">
          #fitness #${this.sanitizeHashtag(workout.type)} #RUNSTR
        </text>
      </g>
    `;
  }

  /**
   * Get formatted workout stats
   */
  private getWorkoutStats(
    workout: UnifiedWorkout
  ): Array<{ value: string; label: string }> {
    const stats = [];

    // Duration
    const duration = this.formatDuration(workout.duration);
    stats.push({ value: duration, label: 'Duration' });

    // Distance
    if (workout.distance) {
      const distance =
        workout.distance < 1000
          ? `${workout.distance}m`
          : `${(workout.distance / 1000).toFixed(2)}km`;
      stats.push({ value: distance, label: 'Distance' });
    }

    // Calories
    if (workout.calories) {
      stats.push({
        value: Math.round(workout.calories).toString(),
        label: 'Calories',
      });
    }

    // Heart Rate
    if (workout.heartRate?.avg) {
      stats.push({
        value: `${Math.round(workout.heartRate.avg)}`,
        label: 'Avg HR',
      });
    }

    // Pace (for running/cycling)
    if (
      workout.pace &&
      workout.distance &&
      ['running', 'cycling'].includes(workout.type)
    ) {
      const paceMin = Math.floor(workout.pace / 60);
      const paceSec = workout.pace % 60;
      stats.push({
        value: `${paceMin}:${paceSec.toString().padStart(2, '0')}`,
        label: 'Pace/km',
      });
    }

    return stats;
  }

  /**
   * Get achievement text for workout
   */
  private getAchievementText(workout: UnifiedWorkout): string | null {
    // Distance-based achievements
    if (workout.distance) {
      const km = workout.distance / 1000;
      if (km >= 21.1) return 'Half Marathon Distance!';
      if (km >= 10) return '10K Achievement!';
      if (km >= 5) return '5K Complete!';
    }

    // Duration-based achievements
    if (workout.duration >= 3600) return '1+ Hour Workout!';
    if (workout.duration >= 1800) return '30+ Minute Session!';

    // Calorie achievements
    if (workout.calories && workout.calories >= 500)
      return '500+ Calories Burned!';

    // First workout of the day/week
    const today = new Date().toDateString();
    const workoutDate = new Date(workout.startTime).toDateString();
    if (today === workoutDate) return "Today's Workout Done!";

    return null;
  }

  /**
   * Get motivational message
   */
  private getMotivationalMessage(workout: UnifiedWorkout): string {
    const messages = {
      running: [
        'Every step forward is a step toward achieving something bigger and better than your current situation.',
        "The miracle isn't that I finished. The miracle is that I had the courage to start.",
        "Your body can stand almost anything. It's your mind you have to convince.",
      ],
      cycling: [
        'Life is like riding a bicycle. To keep your balance, you must keep moving.',
        'It never gets easier; you just go faster.',
        'The bicycle is a curious vehicle. Its passenger is its engine.',
      ],
      gym: [
        "The only bad workout is the one that didn't happen.",
        "Your body can stand almost anything. It's your mind you have to convince.",
        "Strength doesn't come from what you can do. It comes from overcoming the things you thought you couldn't.",
      ],
    };

    const typeMessages =
      messages[workout.type as keyof typeof messages] || messages.gym;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  }

  /**
   * Sanitize text for hashtag use
   */
  private sanitizeHashtag(text: string): string {
    return text.replace(/_/g, '').replace(/\s+/g, '').toLowerCase();
  }

  /**
   * Adjust color brightness
   */
  private adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  /**
   * Generate batch cards for multiple workouts
   */
  async generateBatchCards(
    workouts: UnifiedWorkout[],
    options: WorkoutCardOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<WorkoutCardData[]> {
    const results: WorkoutCardData[] = [];

    for (let i = 0; i < workouts.length; i++) {
      try {
        const card = await this.generateWorkoutCard(workouts[i], options);
        results.push(card);
        onProgress?.(i + 1, workouts.length);
      } catch (error) {
        console.error(
          `Failed to generate card for workout ${workouts[i].id}:`,
          error
        );
        // Continue with other workouts
      }
    }

    return results;
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): Array<{
    id: keyof typeof CARD_TEMPLATES;
    name: string;
    description: string;
  }> {
    return [
      {
        id: 'achievement',
        name: 'Achievement',
        description: 'Celebration-focused with achievement badges',
      },
      {
        id: 'progress',
        name: 'Progress',
        description: 'Progress tracking with visual indicators',
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean and simple design',
      },
      {
        id: 'stats',
        name: 'Stats',
        description: 'Detailed statistics and charts',
      },
    ];
  }
}

export default WorkoutCardGenerator.getInstance();
