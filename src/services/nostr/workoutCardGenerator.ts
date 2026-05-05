/**
 * WorkoutCardGenerator - Beautiful Social Media Cards for Workouts
 * React Native SVG-based card generation inspired by Quotestr
 * Creates visually stunning workout achievement cards with RUNSTR branding
 */

import type { WorkoutType } from '../../types/workout';
import type { PublishableWorkout } from './workoutPublishingService';
import { RUNSTR_LOGO_BASE64 } from './runstrLogoBase64';
import { formatDistanceValue } from '../../utils/distanceFormatter';

export interface WorkoutCardOptions {
  template?: 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant';
  backgroundColor?: string;
  accentColor?: string;
  includeQR?: boolean;
  includeMap?: boolean; // For workouts with GPS data
  customMessage?: string;
  showBranding?: boolean;
  userAvatar?: string; // User's profile picture URL
  userName?: string; // User's display name
  teamName?: string; // User's competition team name (e.g., "Team RUNSTR")
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

// Card templates configuration - RUNSTR orange and black theme
const CARD_TEMPLATES = {
  achievement: {
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    accentColor: '#FF6B35', // RUNSTR orange
    showStats: true,
    showMotivation: true,
    showBranding: true,
  },
  progress: {
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    accentColor: '#FF6B35', // RUNSTR orange
    showStats: true,
    showProgress: true,
    showBranding: true,
  },
  minimal: {
    width: 600,
    height: 600,
    backgroundColor: '#000000',
    accentColor: '#FF6B35', // RUNSTR orange
    showStats: true, // Show just duration and distance
    showMotivation: false,
    showBranding: false,
  },
  stats: {
    width: 800,
    height: 800,
    backgroundColor: '#000000',
    accentColor: '#FF6B35', // RUNSTR orange
    showStats: true,
    showCharts: true,
    showBranding: true,
  },
  elegant: {
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    accentColor: '#FFFFFF', // White for elegant design
    showStats: true,
    showMotivation: false,
    showBranding: true,
    useSplitLayout: true, // Two-panel split
    useSerifFont: true, // Serif typography
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
   * Check if avatar URL is a supported static image format
   * GIF and other animated formats can crash react-native-svg
   */
  private isValidAvatarFormat(url: string | undefined): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // Only allow static image formats that react-native-svg handles reliably
    return (
      lowerUrl.endsWith('.png') ||
      lowerUrl.endsWith('.jpg') ||
      lowerUrl.endsWith('.jpeg') ||
      lowerUrl.endsWith('.webp') ||
      // Also allow URLs without extension (CDN URLs) - these usually work
      (!lowerUrl.endsWith('.gif') &&
        !lowerUrl.endsWith('.svg') &&
        !lowerUrl.includes('.gif?') &&
        !lowerUrl.includes('.svg?'))
    );
  }

  /**
   * Create fallback avatar with user initials
   * Used when avatar URL is unsupported format (GIF, SVG) or fails to load
   */
  private createFallbackInitials(
    userName: string | undefined,
    size: number = 60,
    accentColor: string = '#FF6B35'
  ): string {
    const initials = userName
      ? userName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

    const radius = size / 2;
    const fontSize = size * 0.4;
    const textY = radius + fontSize * 0.35; // Vertically center text

    return `
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${accentColor}"/>
      <text
        x="${radius}"
        y="${textY}"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="#FFFFFF"
      >${this.escapeXml(initials)}</text>
    `;
  }

  /**
   * Detect if this is a step counter post (daily steps) vs GPS-tracked walk
   * Step counter posts have distance = 0 and steps in metadata
   */
  private static isStepCounterPost(workout: PublishableWorkout): boolean {
    return (
      workout.type === 'walking' &&
      workout.distance === 0 &&
      workout.metadata?.steps !== undefined
    );
  }

  /**
   * Generate workout card as SVG
   */
  async generateWorkoutCard(
    workout: PublishableWorkout,
    options: WorkoutCardOptions = {}
  ): Promise<WorkoutCardData> {
    try {
      console.log(`🎨 Generating workout card for ${workout.type} workout...`);

      const template = options.template || 'achievement';
      const config = CARD_TEMPLATES[template];
      const dimensions = { width: config.width, height: config.height };

      // Generate SVG content
      const svgContent = this.createSVGCard(workout, config, options);

      // Validate SVG content is not empty
      if (!svgContent || svgContent.trim().length === 0) {
        throw new Error('Generated SVG content is empty');
      }

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

      // Return fallback minimal card instead of throwing
      const fallbackDimensions = { width: 800, height: 600 };
      const fallbackSvg = this.getFallbackSVG(
        workout,
        fallbackDimensions.width,
        fallbackDimensions.height
      );

      return {
        svgContent: fallbackSvg,
        dimensions: fallbackDimensions,
        metadata: {
          workoutId: workout.id,
          template: 'fallback',
          generatedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Create SVG card content
   */
  private createSVGCard(
    workout: PublishableWorkout,
    config: (typeof CARD_TEMPLATES)[keyof typeof CARD_TEMPLATES],
    options: WorkoutCardOptions
  ): string {
    // Use elegant split-panel layout for 'elegant' template
    if (options.template === 'elegant') {
      return this.createElegantCard(workout, config, options);
    }

    // Use modern centered layout for 'minimal' template
    if (options.template === 'minimal') {
      return this.createMinimalCard(workout, config, options);
    }

    const { width, height } = config;

    // Get dynamic colors based on activity type
    const activityColors = this.getActivityColors(workout.type);
    const backgroundColor =
      options.backgroundColor || activityColors.background;
    const accentColor = options.accentColor || activityColors.accent;

    // Build SVG components based on template configuration
    const background = this.createBackground(width, height, backgroundColor);
    const avatar = options.userAvatar
      ? this.createUserAvatar(
          options.userAvatar,
          options.userName,
          20,
          20,
          accentColor
        )
      : '';
    const teamBadge = options.teamName
      ? this.createTeamBadge(options.teamName, 20, 90, accentColor)
      : '';
    const weather = workout.weather
      ? this.createWeatherBadge(workout.weather, width - 120, 20, accentColor)
      : '';
    const activityIcon = this.createActivityIcon(
      workout.type,
      80,
      80,
      accentColor
    );
    const title = this.createTitle(workout, 100, accentColor);

    // Only show stats if template config allows it
    const stats = config.showStats
      ? this.createStatsSection(workout, 180, accentColor)
      : '';

    // Only show achievement badge if we have one and template supports it
    const achievement =
      'showMotivation' in config && config.showMotivation
        ? this.createAchievementBadge(workout, 320, accentColor)
        : '';

    // Only show motivational message if template config allows it
    const motivation =
      'showMotivation' in config && config.showMotivation
        ? this.createMotivationalMessage(workout, 420, accentColor)
        : '';

    // Branding can be disabled via options or template
    const branding =
      options.showBranding !== false && config.showBranding
        ? this.createBranding(workout, height - 60, accentColor)
        : '';

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${background}
        ${avatar}
        ${teamBadge}
        ${weather}
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
   * Create elegant Quotestr-inspired split-panel card
   * Left panel: Grayscale user avatar or workout icon (400px)
   * Right panel: Black background with elegant serif text (400px)
   */
  private createElegantCard(
    workout: PublishableWorkout,
    config: (typeof CARD_TEMPLATES)[keyof typeof CARD_TEMPLATES],
    options: WorkoutCardOptions
  ): string {
    const { width, height } = config;
    const panelWidth = width / 2; // 400px each panel

    // Serif font family (system fonts with good cross-platform support)
    const serifFont = 'Georgia, Times New Roman, serif';
    const sansFont = 'system-ui, -apple-system, sans-serif';

    // Left panel: Grayscale avatar or workout icon
    const leftPanel = this.createElegantLeftPanel(
      workout,
      options.userAvatar,
      panelWidth,
      height,
      options.userName
    );

    // Right panel: Black background with workout details
    const rightPanel = this.createElegantRightPanel(
      workout,
      options,
      panelWidth,
      height,
      serifFont,
      sansFont
    );

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="grayscale">
            <feColorMatrix type="saturate" values="0"/>
          </filter>
        </defs>

        <!-- Black background -->
        <rect width="${width}" height="${height}" fill="#000000"/>

        <!-- Left panel with grayscale image -->
        <g transform="translate(0, 0)">
          ${leftPanel}
        </g>

        <!-- Dividing line -->
        <line x1="${panelWidth}" y1="0" x2="${panelWidth}" y2="${height}" stroke="#FFFFFF" stroke-width="0.5" opacity="0.2"/>

        <!-- Right panel with text -->
        <g transform="translate(${panelWidth}, 0)">
          ${rightPanel}
        </g>
      </svg>
    `.trim();
  }

  /**
   * Create left panel for elegant card (grayscale image)
   */
  private createElegantLeftPanel(
    workout: PublishableWorkout,
    userAvatar: string | undefined,
    width: number,
    height: number,
    userName?: string
  ): string {
    // Check if avatar format is supported (skip GIF, SVG - they can crash)
    if (userAvatar && this.isValidAvatarFormat(userAvatar)) {
      // User avatar with grayscale filter
      return `
        <image
          href="${userAvatar}"
          x="0"
          y="0"
          width="${width}"
          height="${height}"
          preserveAspectRatio="xMidYMid slice"
          filter="url(#grayscale)"
          opacity="0.8"
        />
      `;
    } else if (userAvatar && !this.isValidAvatarFormat(userAvatar)) {
      // Unsupported format (GIF, etc.) - show large initials with grayscale background
      console.warn(
        `⚠️ Unsupported avatar format in card: ${userAvatar.substring(0, 50)}...`
      );
      const initials = userName
        ? userName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '?';
      return `
        <rect width="${width}" height="${height}" fill="#1a1a1a"/>
        <circle cx="${width / 2}" cy="${height / 2}" r="100" fill="#333333"/>
        <text
          x="${width / 2}"
          y="${height / 2 + 30}"
          font-size="80"
          font-weight="700"
          text-anchor="middle"
          fill="#666666"
          font-family="system-ui, -apple-system, sans-serif"
        >${this.escapeXml(initials)}</text>
      `;
    } else {
      // No avatar - fallback to large centered workout icon
      const icon = this.getWorkoutIcon(workout.type);
      return `
        <rect width="${width}" height="${height}" fill="#1a1a1a"/>
        <text
          x="${width / 2}"
          y="${height / 2}"
          font-size="120"
          text-anchor="middle"
          alignment-baseline="middle"
          opacity="0.3"
        >${icon}</text>
      `;
    }
  }

  /**
   * Create right panel for elegant card (text content)
   */
  private createElegantRightPanel(
    workout: PublishableWorkout,
    options: WorkoutCardOptions,
    width: number,
    height: number,
    serifFont: string,
    sansFont: string
  ): string {
    const padding = 40;
    const contentWidth = width - padding * 2;

    // Calculate base Y offset for stats based on header content
    const hasUserName = !!options.userName;
    const hasTeamName = !!options.teamName;
    const baseYOffset =
      hasUserName && hasTeamName ? 20 : hasUserName || hasTeamName ? 0 : -20;

    // Workout type and date
    const workoutType = this.getWorkoutTypeName(workout);
    const date = new Date(workout.startTime).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Key stats with null safety and validation
    const stats = this.getWorkoutStats(workout);

    // Validate stats array to prevent SVG rendering errors
    if (!Array.isArray(stats) || stats.length === 0) {
      console.warn('No stats available for workout card');
    }

    // For strength training, show all sets; for other workouts, show primary + secondary stat
    const isStrengthTraining = ['strength_training', 'gym'].includes(
      workout.type
    );

    const primaryStat = stats[0] || {
      value: this.formatDurationDetailed(workout.duration),
      label: 'Duration',
    };
    const secondaryStat = stats[1]; // Keep optional (handled with conditional rendering)
    const tertiaryStat = stats[2]; // Optional third stat (for GPS walks with distance + duration + steps)

    // Motivational quote (optional) - wrap text ONCE and cache result
    const quote = options.customMessage || this.getMotivationalMessage(workout);
    const wrappedLines = quote ? this.wrapText(quote, 35) : [];

    // Build quote tspans safely
    let quoteTspans = '';
    if (wrappedLines.length > 0) {
      quoteTspans = `<tspan x="${padding}" dy="0">"${this.escapeXml(
        wrappedLines[0]
      )}"</tspan>`;
      for (let i = 1; i < wrappedLines.length; i++) {
        quoteTspans += `<tspan x="${padding}" dy="18">${this.escapeXml(
          wrappedLines[i]
        )}</tspan>`;
      }
    }

    return `
      <!-- User name (if available) -->
      ${
        options.userName
          ? `
        <text
          x="${padding}"
          y="40"
          font-family="${sansFont}"
          font-size="12"
          font-weight="500"
          fill="#FFFFFF"
          opacity="0.6"
          letter-spacing="0.5"
        >${this.escapeXml(options.userName).toUpperCase()}</text>
      `
          : ''
      }

      <!-- Team name (if available) -->
      ${
        options.teamName
          ? `
        <text
          x="${padding}"
          y="${options.userName ? 60 : 40}"
          font-family="${sansFont}"
          font-size="14"
          font-weight="600"
          fill="#FF6B35"
          letter-spacing="0.5"
        >${this.escapeXml(options.teamName)}</text>
      `
          : ''
      }

      <!-- Workout type -->
      <text
        x="${padding}"
        y="${
          options.userName && options.teamName
            ? 100
            : options.userName || options.teamName
            ? 80
            : 60
        }"
        font-family="${serifFont}"
        font-size="32"
        font-weight="400"
        fill="#FFFFFF"
        letter-spacing="-0.5"
      >${this.escapeXml(workoutType)}</text>

      <!-- Date -->
      <text
        x="${padding}"
        y="${
          options.userName && options.teamName
            ? 130
            : options.userName || options.teamName
            ? 110
            : 90
        }"
        font-family="${sansFont}"
        font-size="14"
        font-weight="400"
        fill="#FFFFFF"
        opacity="0.5"
      >${date}</text>

      ${
        isStrengthTraining
          ? `
        <!-- Strength training: Show all sets -->
        ${stats
          .filter((stat) => stat && stat.value && stat.label) // Filter out invalid stats
          .map((stat, index) => {
            const yOffset = 160 + baseYOffset;
            const statY = yOffset + index * 70; // 70px spacing between sets
            return `
              <text
                x="${padding}"
                y="${statY}"
                font-family="${serifFont}"
                font-size="36"
                font-weight="300"
                fill="#FFFFFF"
              >${this.escapeXml(String(stat.value))}</text>

              <text
                x="${padding}"
                y="${statY + 25}"
                font-family="${sansFont}"
                font-size="12"
                font-weight="500"
                fill="#FFFFFF"
                opacity="0.5"
                letter-spacing="1"
              >${this.escapeXml(String(stat.label).toUpperCase())}</text>
            `;
          })
          .join('')}
      `
          : `
        <!-- Primary stat (duration) -->
        <text
          x="${padding}"
          y="${180 + baseYOffset}"
          font-family="${serifFont}"
          font-size="64"
          font-weight="300"
          fill="#FFFFFF"
          letter-spacing="-1"
        >${primaryStat.value}</text>

        <text
          x="${padding}"
          y="${210 + baseYOffset}"
          font-family="${sansFont}"
          font-size="12"
          font-weight="500"
          fill="#FFFFFF"
          opacity="0.5"
          letter-spacing="1"
        >${primaryStat.label.toUpperCase()}</text>

        <!-- Secondary stat (distance, calories, etc.) -->
        ${
          secondaryStat
            ? `
          <text
            x="${padding}"
            y="${270 + baseYOffset}"
            font-family="${serifFont}"
            font-size="36"
            font-weight="300"
            fill="#FFFFFF"
          >${secondaryStat.value}</text>

          <text
            x="${padding}"
            y="${295 + baseYOffset}"
            font-family="${sansFont}"
            font-size="12"
            font-weight="500"
            fill="#FFFFFF"
            opacity="0.5"
            letter-spacing="1"
          >${secondaryStat.label.toUpperCase()}</text>
        `
            : ''
        }

        <!-- Tertiary stat (steps for GPS walks) -->
        ${
          tertiaryStat
            ? `
          <text
            x="${padding}"
            y="${360 + baseYOffset}"
            font-family="${serifFont}"
            font-size="24"
            font-weight="300"
            fill="#FFFFFF"
          >${tertiaryStat.value}</text>

          <text
            x="${padding}"
            y="${380 + baseYOffset}"
            font-family="${sansFont}"
            font-size="10"
            font-weight="500"
            fill="#FFFFFF"
            opacity="0.5"
            letter-spacing="1"
          >${tertiaryStat.label.toUpperCase()}</text>
        `
            : ''
        }
      `
      }

      <!-- Motivational quote -->
      ${
        quoteTspans
          ? `
        <text
          x="${padding}"
          y="${height - 100}"
          font-family="${serifFont}"
          font-size="14"
          font-weight="400"
          font-style="italic"
          fill="#FFFFFF"
          opacity="0.7"
        >${quoteTspans}</text>
      `
          : ''
      }

      <!-- RUNSTR branding -->
      <text
        x="${padding}"
        y="${height - 40}"
        font-family="${sansFont}"
        font-size="10"
        font-weight="600"
        fill="#FFFFFF"
        opacity="0.4"
        letter-spacing="1"
      >RUNSTR</text>
    `;
  }

  /**
   * Create modern minimal card with centered RUNSTR logo
   * Instagram-story-style vertical layout with clean typography
   */
  private createMinimalCard(
    workout: PublishableWorkout,
    config: (typeof CARD_TEMPLATES)[keyof typeof CARD_TEMPLATES],
    options: WorkoutCardOptions
  ): string {
    const { width, height } = config;
    const centerX = width / 2;
    const sansFont = 'system-ui, -apple-system, sans-serif';

    // Get activity name (e.g., "MEDITATION", "RUNNING")
    const activityName = this.getWorkoutTypeName(workout).toUpperCase();

    // Check if this is a step counter post (daily steps, not GPS walk)
    const isStepCounter = WorkoutCardGenerator.isStepCounterPost(workout);

    // Format duration as MM:SS (unless step counter post)
    const duration = this.formatDurationDetailed(workout.duration);

    // Get distance if available
    const distance = workout.distance
      ? `${formatDistanceValue(workout.distance)} km`
      : null;

    // Get steps for step counter posts (primary stat) or GPS walks (secondary stat)
    const steps = workout.metadata?.steps
      ? Math.round(workout.metadata.steps).toLocaleString()
      : null;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Subtle gradient background -->
          <linearGradient id="minimalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#minimalGradient)"/>

        <!-- Team name (if available) -->
        ${
          options.teamName
            ? `
        <text
          x="${centerX}"
          y="60"
          font-family="${sansFont}"
          font-size="16"
          font-weight="600"
          text-anchor="middle"
          fill="${config.accentColor}"
          letter-spacing="0.5"
        >${this.escapeXml(options.teamName)}</text>
        `
            : ''
        }

        <!-- RUNSTR Ostrich Logo (centered, 120x120) -->
        <image
          href="${RUNSTR_LOGO_BASE64}"
          x="${centerX - 60}"
          y="${options.teamName ? '90' : '80'}"
          width="120"
          height="120"
          preserveAspectRatio="xMidYMid meet"
        />

        <!-- Activity name (white) -->
        <text
          x="${centerX}"
          y="${options.teamName ? '270' : '260'}"
          font-family="${sansFont}"
          font-size="36"
          font-weight="700"
          text-anchor="middle"
          fill="#FFFFFF"
          letter-spacing="2"
        >${this.escapeXml(activityName)}</text>

        <!-- "COMPLETED" text (orange) -->
        <text
          x="${centerX}"
          y="${options.teamName ? '310' : '300'}"
          font-family="${sansFont}"
          font-size="36"
          font-weight="700"
          text-anchor="middle"
          fill="${config.accentColor}"
          letter-spacing="2"
        >COMPLETED</text>

        <!-- Primary stat label (DURATION for workouts, STEPS for step counter) -->
        <text
          x="${centerX}"
          y="${options.teamName ? '380' : '370'}"
          font-family="${sansFont}"
          font-size="14"
          font-weight="500"
          text-anchor="middle"
          fill="#FFFFFF"
          opacity="0.6"
          letter-spacing="1"
        >${isStepCounter ? 'STEPS' : 'DURATION'}</text>

        <!-- Primary stat value (large, bold, orange) -->
        <text
          x="${centerX}"
          y="${options.teamName ? '440' : '430'}"
          font-family="${sansFont}"
          font-size="72"
          font-weight="300"
          text-anchor="middle"
          fill="${config.accentColor}"
          letter-spacing="-2"
        >${isStepCounter ? steps : duration}</text>

        ${
          distance
            ? `
        <!-- Distance (if available) -->
        <text
          x="${centerX}"
          y="480"
          font-family="${sansFont}"
          font-size="24"
          font-weight="400"
          text-anchor="middle"
          fill="#FFFFFF"
          opacity="0.7"
        >${distance}</text>
        `
            : ''
        }

        ${
          // Show steps for GPS walks only (not step counter posts, since they show steps as primary stat)
          workout.type === 'walking' &&
          workout.metadata?.steps &&
          !isStepCounter
            ? `
        <!-- Steps (for GPS walks) -->
        <text
          x="${centerX}"
          y="${distance ? '520' : '480'}"
          font-family="${sansFont}"
          font-size="20"
          font-weight="500"
          text-anchor="middle"
          fill="#FFFFFF"
          opacity="0.8"
        >${steps} STEPS</text>
        `
            : ''
        }

        ${
          // Show reps and sets for strength training
          ['strength_training', 'gym'].includes(workout.type) &&
          (workout.reps || workout.sets)
            ? `
        <!-- Reps and Sets (for strength training) -->
        <text
          x="${centerX}"
          y="${distance ? '520' : '480'}"
          font-family="${sansFont}"
          font-size="20"
          font-weight="500"
          text-anchor="middle"
          fill="#FFFFFF"
          opacity="0.8"
        >${workout.reps || 0} REPS • ${workout.sets || 0} SETS</text>
        `
            : ''
        }

        <!-- RUNSTR branding (bottom) -->
        <text
          x="${centerX}"
          y="540"
          font-family="${sansFont}"
          font-size="12"
          font-weight="600"
          text-anchor="middle"
          fill="#FFFFFF"
          opacity="0.3"
          letter-spacing="2"
        >RUNSTR</text>
      </svg>
    `.trim();
  }

  /**
   * Get workout icon (no emoji, just simple shapes)
   */
  private getWorkoutIcon(type: WorkoutType): string {
    const icons = {
      running: '🏃',
      cycling: '🚴',
      walking: '🚶',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️',
      yoga: '🧘',
      meditation: '🧘',
      other: '⚡',
    };
    return (icons as Record<string, string>)[type] || icons.other;
  }

  /**
   * Get clean workout type name (no underscores)
   */
  private getWorkoutTypeName(workout: PublishableWorkout): string {
    // For strength training, show specific exercise if available
    if (
      (workout.type === 'strength_training' || workout.type === 'gym') &&
      workout.exerciseType
    ) {
      // Capitalize exercise type: "bench" → "Bench", "pushups" → "Pushups"
      return (
        workout.exerciseType.charAt(0).toUpperCase() +
        workout.exerciseType.slice(1)
      );
    }

    // For diet, show specific meal type if available
    if (workout.type === 'diet' && workout.mealType) {
      // Capitalize meal type: "breakfast" → "Breakfast", "lunch" → "Lunch"
      return (
        workout.mealType.charAt(0).toUpperCase() + workout.mealType.slice(1)
      );
    }

    // For meditation, show specific meditation type if available
    if (workout.type === 'meditation' && workout.meditationType) {
      // Format meditation type: "body_scan" → "Body Scan", "guided" → "Guided"
      return workout.meditationType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Fall back to generic type mapping
    const typeMap: Record<string, string> = {
      running: 'Running',
      cycling: 'Cycling',
      walking: 'Walking',
      hiking: 'Hiking',
      gym: 'Gym Session',
      strength_training: 'Strength Training',
      yoga: 'Yoga',
      meditation: 'Meditation',
      diet: 'Meal',
      fasting: 'Fasting',
      other: 'Workout',
    };
    return typeMap[workout.type] || 'Workout';
  }

  /**
   * Check if exercise is bodyweight-only (no external weight)
   */
  private isBodyweightExercise(exerciseType: string | undefined): boolean {
    if (!exerciseType) return false;

    const bodyweightExercises = [
      'pushups',
      'pullups',
      'chinups',
      'situps',
      'crunches',
      'plank',
      'burpees',
      'jumping jacks',
      'mountain climbers',
      'dips',
      'handstand',
      'muscle ups',
      'lunges',
      'squats', // bodyweight squats
    ];

    return bodyweightExercises.some((ex) =>
      exerciseType.toLowerCase().includes(ex)
    );
  }

  /**
   * Wrap text to fit within a certain character width
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      if ((currentLine + word).length <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Max 3 lines
  }

  /**
   * Get RUNSTR brand colors (orange and black theme)
   */
  private getActivityColors(type: WorkoutType): {
    background: string;
    accent: string;
  } {
    // All workouts use RUNSTR's signature orange and black theme
    return { background: '#000000', accent: '#FF6B35' }; // RUNSTR orange
  }

  /**
   * Create user avatar with circular clip
   */
  private createUserAvatar(
    avatarUrl: string,
    userName: string | undefined,
    x: number,
    y: number,
    accentColor: string
  ): string {
    // Check if avatar format is supported (skip GIF, SVG - they can crash)
    const useImage = this.isValidAvatarFormat(avatarUrl);

    if (!useImage) {
      console.warn(
        `⚠️ Unsupported avatar format, using initials: ${avatarUrl.substring(0, 50)}...`
      );
    }

    return `
      <g transform="translate(${x}, ${y})">
        <defs>
          <clipPath id="avatarClip">
            <circle cx="30" cy="30" r="30"/>
          </clipPath>
        </defs>
        <!-- Avatar circle background -->
        <circle cx="30" cy="30" r="30" fill="${accentColor}20" stroke="${accentColor}" stroke-width="2"/>
        ${
          useImage
            ? `<!-- Avatar image -->
        <image href="${avatarUrl}" x="0" y="0" width="60" height="60" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
            : `<!-- Initials fallback for unsupported format -->
        ${this.createFallbackInitials(userName, 60, accentColor)}`
        }
        ${
          userName
            ? `<text x="70" y="35" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="${accentColor}">${this.escapeXml(
                userName
              )}</text>`
            : ''
        }
      </g>
    `;
  }

  /**
   * Create team badge with team name
   */
  private createTeamBadge(
    teamName: string,
    x: number,
    y: number,
    accentColor: string
  ): string {
    return `
      <g transform="translate(${x}, ${y})">
        <text
          x="0"
          y="0"
          font-family="Arial, sans-serif"
          font-size="16"
          font-weight="600"
          fill="${accentColor}"
        >${this.escapeXml(teamName)}</text>
      </g>
    `;
  }

  /**
   * Create weather badge with icon and temperature
   */
  private createWeatherBadge(
    weather: { icon: string; temp: number; description?: string },
    x: number,
    y: number,
    accentColor: string
  ): string {
    const weatherEmoji = this.getWeatherEmoji(weather.icon);

    return `
      <g transform="translate(${x}, ${y})">
        <rect x="0" y="0" width="100" height="50" fill="${accentColor}15" rx="25" ry="25" stroke="${accentColor}30" stroke-width="1"/>
        <text x="25" y="30" font-size="20" text-anchor="middle" alignment-baseline="middle">${weatherEmoji}</text>
        <text x="65" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" alignment-baseline="middle" fill="${accentColor}">${weather.temp}°C</text>
      </g>
    `;
  }

  /**
   * Get weather emoji from icon code
   */
  private getWeatherEmoji(icon: string): string {
    const iconMap: Record<string, string> = {
      '01d': '☀️',
      '01n': '🌙',
      '02d': '⛅',
      '02n': '☁️',
      '03d': '☁️',
      '03n': '☁️',
      '04d': '☁️',
      '04n': '☁️',
      '09d': '🌧️',
      '09n': '🌧️',
      '10d': '🌦️',
      '10n': '🌧️',
      '11d': '⛈️',
      '11n': '⛈️',
      '13d': '❄️',
      '13n': '❄️',
      '50d': '🌫️',
      '50n': '🌫️',
    };
    return iconMap[icon] || '🌤️';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      meditation: '🧘‍♂️', // Same as yoga icon for meditation workouts
      other: '⚡',
    };

    const icon = (icons as Record<string, string>)[type] || icons.other;

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
    workout: PublishableWorkout,
    y: number,
    accentColor: string
  ): string {
    // Use getWorkoutTypeName() to show specific exercise names (e.g., "Pushups" instead of "Strength Training")
    const workoutType = this.getWorkoutTypeName(workout);
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
    workout: PublishableWorkout,
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
    workout: PublishableWorkout,
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
    workout: PublishableWorkout,
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
    workout: PublishableWorkout,
    y: number,
    accentColor: string
  ): string {
    // Use specific exercise name for hashtag (e.g., #pushups instead of #strengthtraining)
    const workoutName = this.getWorkoutTypeName(workout);
    return `
      <g transform="translate(40, ${y})">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="${accentColor}60">
          💪 Tracked with RUNSTR
        </text>
        <text x="600" y="0" font-family="Arial, sans-serif" font-size="12" text-anchor="end" fill="${accentColor}40">
          #fitness #${this.sanitizeHashtag(workoutName)} #RUNSTR
        </text>
      </g>
    `;
  }

  /**
   * Get formatted workout stats
   */
  private getWorkoutStats(
    workout: PublishableWorkout
  ): Array<{ value: string; label: string }> {
    const stats = [];

    // Special handling for step counter posts (daily steps tracking)
    // Show only steps, no duration/calories/distance
    if (WorkoutCardGenerator.isStepCounterPost(workout)) {
      if (workout.metadata?.steps) {
        const steps = Math.round(workout.metadata.steps);
        stats.push({
          value: steps.toLocaleString(),
          label: 'Steps',
        });
      }
      return stats;
    }

    // Duration (skip for diet and strength training)
    // Strength training primary stats are reps/sets, not duration
    if (!['diet', 'strength_training', 'gym'].includes(workout.type)) {
      // Check if this is a weekly summary (has weekly metadata and zero duration)
      const isWeeklySummary =
        workout.id?.startsWith('weekly_') ||
        (workout.duration === 0 && workout.metadata?.weeklyGoal !== undefined);

      if (isWeeklySummary) {
        stats.push({ value: 'This Week', label: 'Summary' });
      } else {
        const duration = this.formatDurationDetailed(workout.duration);
        stats.push({ value: duration, label: 'Duration' });
      }
    }

    // Distance
    if (workout.distance) {
      const distance = `${formatDistanceValue(workout.distance)} km`;
      stats.push({ value: distance, label: 'Distance' });
    }

    // Walking: Show steps from metadata (before calories for GPS walks)
    if (workout.type === 'walking' && workout.metadata?.steps) {
      const steps = Math.round(workout.metadata.steps);
      stats.push({
        value: steps.toLocaleString(),
        label: 'Steps',
      });
    }

    // Calories (skip for meditation and strength training - not meaningful)
    if (
      workout.calories &&
      !['meditation', 'strength_training', 'gym'].includes(workout.type)
    ) {
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

    // Activity-specific stats

    // Cycling: Show speed (km/h) instead of pace
    if (workout.type === 'cycling' && workout.distance && workout.duration) {
      const speedKmh = workout.distance / 1000 / (workout.duration / 3600);
      stats.push({
        value: `${speedKmh.toFixed(1)} km/h`,
        label: 'Speed',
      });
    }

    // Pace (for running only - cycling shows speed instead)
    if (workout.type === 'running' && workout.pace && workout.distance) {
      const paceMin = Math.floor(workout.pace / 60);
      const paceSec = workout.pace % 60;
      stats.push({
        value: `${paceMin}:${paceSec.toString().padStart(2, '0')}`,
        label: 'Pace/km',
      });
    }

    // Strength training: Show per-set breakdown or summary
    if (['strength_training', 'gym'].includes(workout.type)) {
      // If we have per-set weight data, show detailed breakdown
      if (workout.weightsPerSet && workout.weightsPerSet.length > 0) {
        // Get reps breakdown from the top-level field (historical strength workouts on Nostr)
        const repsBreakdown = workout.repsBreakdown;

        // Show first 3 sets (to avoid overcrowding the card)
        const setsToShow = Math.min(3, workout.weightsPerSet.length);
        const isBodyweight = this.isBodyweightExercise(workout.exerciseType);

        for (let i = 0; i < setsToShow; i++) {
          const reps = repsBreakdown?.[i] || 0;
          const weight = workout.weightsPerSet[i];

          // For bodyweight exercises, skip weight display; otherwise show "reps @ weight lbs"
          stats.push({
            value: isBodyweight ? `${reps} reps` : `${reps} @ ${weight} lbs`,
            label: `Set ${i + 1}`,
          });
        }

        // If more than 3 sets, show "..." indicator
        if (workout.weightsPerSet.length > 3) {
          stats.push({
            value: `+${workout.weightsPerSet.length - 3} more`,
            label: 'Sets',
          });
        }
      } else {
        // Fallback: Show summary stats (sets, reps, weight)
        if (workout.sets) {
          stats.push({
            value: workout.sets.toString(),
            label: 'Sets',
          });
        }
        if (workout.reps) {
          stats.push({
            value: workout.reps.toString(),
            label: 'Reps',
          });
        }
        if (workout.weight && workout.weight > 0) {
          stats.push({
            value: `${workout.weight} lbs`,
            label: 'Avg Weight',
          });
        }
      }
    }

    // Diet: Show meal description, portion size, and calories
    // NOTE: Don't show meal type here - it's already the card title
    if (workout.type === 'diet') {
      // Show meal description from notes (if available and not auto-generated)
      if (workout.notes && !workout.notes.includes('at ')) {
        // Skip auto-generated notes like "Breakfast at 8:30 AM"
        // Show user-provided food descriptions (truncate to 30 chars for card)
        const description =
          workout.notes.length > 30
            ? workout.notes.substring(0, 27) + '...'
            : workout.notes;
        stats.push({
          value: description,
          label: 'Food',
        });
      }
      if (workout.mealSize) {
        // Capitalize first letter
        const mealSizeFormatted =
          workout.mealSize.charAt(0).toUpperCase() + workout.mealSize.slice(1);
        stats.push({
          value: mealSizeFormatted,
          label: 'Portion',
        });
      }
      // Re-add calories for diet workouts (it was removed earlier, but is useful here)
      if (workout.calories) {
        stats.push({
          value: Math.round(workout.calories).toString(),
          label: 'Calories',
        });
      }
    }

    // Meditation: Show meditation type
    if (workout.type === 'meditation') {
      if (workout.meditationType) {
        // Format meditation type nicely (e.g., "body_scan" → "Body Scan")
        const typeFormatted = workout.meditationType
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        stats.push({
          value: typeFormatted,
          label: 'Type',
        });
      }
    }

    return stats;
  }

  /**
   * Get achievement text for workout
   */
  private getAchievementText(workout: PublishableWorkout): string | null {
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
   * Get motivational message (with exercise-specific messages for strength training)
   */
  private getMotivationalMessage(workout: PublishableWorkout): string {
    // Exercise-specific messages for strength training
    if (
      (workout.type === 'strength_training' || workout.type === 'gym') &&
      workout.exerciseType
    ) {
      const exerciseType = workout.exerciseType.toLowerCase();

      const exerciseMessages: Record<string, string[]> = {
        pushups: [
          'Every pushup is a step toward a stronger you.',
          'The floor is your foundation. Push through and rise.',
          'Your strength is not in your arms, but in your will to continue.',
        ],
        pullups: [
          'Pull yourself up, one rep at a time. Your goals are within reach.',
          "The bar is waiting. Show it who's boss.",
          'Every pullup is proof that you can rise above.',
        ],
        bench: [
          'Press through the pain. The bar is your friend, not your enemy.',
          'Your chest, your power. Push it to new limits.',
          "Strength isn't built in comfort zones. Lift heavy, grow stronger.",
        ],
        squats: [
          'Squat low, rise high. Your legs are your foundation.',
          'The weight on your shoulders is nothing compared to what you can handle.',
          'Build your throne, one squat at a time.',
        ],
        deadlifts: [
          "Pick it up. Put it down. Repeat. That's how legends are made.",
          "The deadlift doesn't lie. It shows exactly what you're made of.",
          'Lift from the ground up. Your power comes from within.',
        ],
        curls: [
          'Curl your way to greatness, one rep at a time.',
          'Your biceps are calling. Answer with strength.',
          'Every curl is a commitment to your stronger self.',
        ],
        situps: [
          'Core strength starts with discipline, not with motivation.',
          'Your core is your center. Strengthen it, strengthen everything.',
          "Every situp is a victory over yesterday's limits.",
        ],
        plank: [
          'Hold steady. Your core is stronger than you think.',
          'Time stands still when your body is on fire. Keep holding.',
          "The plank reveals your true strength. Don't give up.",
        ],
      };

      // Find matching exercise
      for (const [key, messages] of Object.entries(exerciseMessages)) {
        if (exerciseType.includes(key)) {
          return messages[Math.floor(Math.random() * messages.length)];
        }
      }
    }

    // Meditation type-specific messages
    if (workout.type === 'meditation' && workout.meditationType) {
      const meditationType = workout.meditationType.toLowerCase();

      const meditationMessages: Record<string, string[]> = {
        gratitude: [
          'Gratitude turns what we have into enough, and more.',
          'In every moment of gratitude, we find peace.',
          'Count your blessings, not your problems. Today, you chose gratitude.',
        ],
        breathwork: [
          'Your breath is the bridge between body and mind.',
          'Breathe in peace, breathe out stress. You are in control.',
          'Every breath is a new beginning. Inhale possibility, exhale doubt.',
        ],
        body_scan: [
          'Every part of your body holds wisdom. Listen closely.',
          'Scan inward, find stillness. Your body knows what it needs.',
          'Mindfulness begins in the body. You are present, you are aware.',
        ],
        guided: [
          'You showed up and followed through. That is strength.',
          'Guided meditation is not about perfection, but presence.',
          'Every guided session builds your inner sanctuary.',
        ],
        unguided: [
          'You sat with yourself. That takes courage.',
          'In silence, you found your own way. Trust that wisdom.',
          'Self-directed meditation reveals your inner teacher.',
        ],
      };

      // Find matching meditation type
      for (const [key, messages] of Object.entries(meditationMessages)) {
        if (meditationType.includes(key)) {
          return messages[Math.floor(Math.random() * messages.length)];
        }
      }
    }

    // Fallback to workout type messages
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
      meditation: [
        'Peace comes from within. Do not seek it without.',
        'The mind is everything. What you think you become.',
        'In the midst of movement and chaos, keep stillness inside of you.',
        'Meditation is not about stopping thoughts, but recognizing that we are more than our thoughts.',
      ],
      yoga: [
        'Yoga is the journey of the self, through the self, to the self.',
        'The body benefits from movement, and the mind benefits from stillness.',
        'Inhale the future, exhale the past.',
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
   * Format duration with seconds (MM:SS or H:MM:SS)
   * Used for elegant cards where precision matters
   */
  private formatDurationDetailed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
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
    workouts: PublishableWorkout[],
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
   * Get available templates (simplified to 3 core options)
   */
  getAvailableTemplates(): Array<{
    id: keyof typeof CARD_TEMPLATES;
    name: string;
    description: string;
  }> {
    return [
      {
        id: 'elegant',
        name: 'Elegant',
        description: 'Quotestr-inspired split design with serif typography',
      },
      {
        id: 'minimal',
        name: 'RUNSTR Theme',
        description: 'RUNSTR-branded card with ostrich logo',
      },
      {
        id: 'achievement',
        name: 'Text-based',
        description: 'Full stats with motivational messages',
      },
    ];
  }

  /**
   * Generate a simple fallback SVG when card generation fails
   * Prevents app crashes by providing a minimal valid SVG
   */
  private getFallbackSVG(
    workout: PublishableWorkout,
    width: number,
    height: number
  ): string {
    const workoutType = this.getWorkoutTypeName(workout);
    const duration = this.formatDurationDetailed(workout.duration);
    const icon = this.getWorkoutIcon(workout.type);

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="#000000"/>

        <!-- Activity Icon -->
        <text
          x="${width / 2}"
          y="${height / 2 - 80}"
          font-size="80"
          text-anchor="middle"
          fill="#FF6B35"
        >${icon}</text>

        <!-- Workout Type -->
        <text
          x="${width / 2}"
          y="${height / 2}"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="36"
          font-weight="600"
          text-anchor="middle"
          fill="#FFFFFF"
        >${this.escapeXml(workoutType)}</text>

        <!-- Duration -->
        <text
          x="${width / 2}"
          y="${height / 2 + 50}"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="24"
          text-anchor="middle"
          fill="#FFFFFF"
          opacity="0.7"
        >${duration}</text>

        <!-- RUNSTR Branding -->
        <text
          x="${width / 2}"
          y="${height - 40}"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="14"
          font-weight="600"
          text-anchor="middle"
          fill="#FF6B35"
          letter-spacing="2"
        >RUNSTR</text>
      </svg>
    `;
  }

  /**
   * Generate fitness test card with score and component breakdown
   */
  async generateFitnessTestCard(
    testData: {
      score: number;
      maxScore: number;
      grade: string;
      duration: number;
      components: {
        pushups: { reps: number; score: number } | null;
        situps: { reps: number; score: number } | null;
        run5k: { timeSeconds: number; score: number } | null;
      };
    },
    options: WorkoutCardOptions = {}
  ): Promise<WorkoutCardData> {
    try {
      console.log('🎨 Generating fitness test card...');

      const width = 800;
      const height = 800;

      const svgContent = this.createFitnessTestSVG(
        testData,
        width,
        height,
        options
      );

      if (!svgContent || svgContent.trim().length === 0) {
        throw new Error('Generated fitness test SVG content is empty');
      }

      return {
        svgContent,
        dimensions: { width, height },
        metadata: {
          workoutId: `fitness_test_${Date.now()}`,
          template: 'fitness_test',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Error generating fitness test card:', error);
      throw error;
    }
  }

  /**
   * Create fitness test SVG content
   */
  private createFitnessTestSVG(
    testData: {
      score: number;
      maxScore: number;
      grade: string;
      duration: number;
      components: {
        pushups: { reps: number; score: number } | null;
        situps: { reps: number; score: number } | null;
        run5k: { timeSeconds: number; score: number } | null;
      };
    },
    width: number,
    height: number,
    options: WorkoutCardOptions
  ): string {
    const duration = this.formatDuration(testData.duration);
    const scorePercentage = Math.round(
      (testData.score / testData.maxScore) * 100
    );

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="#000000"/>

        <!-- RUNSTR Logo at top -->
        <image
          href="${RUNSTR_LOGO_BASE64}"
          x="${width / 2 - 40}"
          y="60"
          width="80"
          height="80"
        />

        <!-- Title -->
        <text
          x="${width / 2}"
          y="200"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="42"
          font-weight="700"
          text-anchor="middle"
          fill="#FFFFFF"
        >RUNSTR FITNESS TEST</text>

        <!-- Score Circle -->
        <circle
          cx="${width / 2}"
          cy="350"
          r="90"
          fill="none"
          stroke="#1A1A1A"
          stroke-width="12"
        />
        <circle
          cx="${width / 2}"
          cy="350"
          r="90"
          fill="none"
          stroke="#FF6B35"
          stroke-width="12"
          stroke-dasharray="${2 * Math.PI * 90}"
          stroke-dashoffset="${2 * Math.PI * 90 * (1 - scorePercentage / 100)}"
          transform="rotate(-90 ${width / 2} 350)"
          stroke-linecap="round"
        />

        <!-- Score Text -->
        <text
          x="${width / 2}"
          y="345"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="56"
          font-weight="800"
          text-anchor="middle"
          fill="#FFFFFF"
        >${testData.score}</text>
        <text
          x="${width / 2}"
          y="375"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="20"
          text-anchor="middle"
          fill="#999999"
        >/ ${testData.maxScore}</text>

        <!-- Grade Badge -->
        <rect
          x="${width / 2 - 80}"
          y="460"
          width="160"
          height="44"
          rx="22"
          fill="#FF6B35"
        />
        <text
          x="${width / 2}"
          y="489"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="20"
          font-weight="700"
          text-anchor="middle"
          fill="#000000"
        >${testData.grade.toUpperCase()}</text>

        <!-- Component Breakdown -->
        <text
          x="${width / 2}"
          y="560"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="18"
          font-weight="600"
          text-anchor="middle"
          fill="#999999"
          letter-spacing="1"
        >COMPONENT BREAKDOWN</text>

        <!-- Pushups -->
        ${
          testData.components.pushups
            ? `
        <g>
          <text
            x="140"
            y="620"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            fill="#FFFFFF"
          >Pushups</text>
          <text
            x="340"
            y="620"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            fill="#999999"
            text-anchor="end"
          >${testData.components.pushups.reps} reps</text>
          <text
            x="660"
            y="620"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="20"
            font-weight="700"
            fill="#FF6B35"
            text-anchor="end"
          >${testData.components.pushups.score} pts</text>
        </g>
        `
            : ''
        }

        <!-- Situps -->
        ${
          testData.components.situps
            ? `
        <g>
          <text
            x="140"
            y="670"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            fill="#FFFFFF"
          >Situps</text>
          <text
            x="340"
            y="670"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            fill="#999999"
            text-anchor="end"
          >${testData.components.situps.reps} reps</text>
          <text
            x="660"
            y="670"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="20"
            font-weight="700"
            fill="#FF6B35"
            text-anchor="end"
          >${testData.components.situps.score} pts</text>
        </g>
        `
            : ''
        }

        <!-- 5K Run -->
        ${
          testData.components.run5k
            ? `
        <g>
          <text
            x="140"
            y="720"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            fill="#FFFFFF"
          >5K Run</text>
          <text
            x="340"
            y="720"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            fill="#999999"
            text-anchor="end"
          >${this.formatDuration(testData.components.run5k.timeSeconds)}</text>
          <text
            x="660"
            y="720"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="20"
            font-weight="700"
            fill="#FF6B35"
            text-anchor="end"
          >${testData.components.run5k.score} pts</text>
        </g>
        `
            : ''
        }

        <!-- Footer -->
        <text
          x="${width / 2}"
          y="${height - 30}"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="14"
          text-anchor="middle"
          fill="#666666"
        >Completed in ${duration}</text>
      </svg>
    `;
  }
}

export default WorkoutCardGenerator.getInstance();
