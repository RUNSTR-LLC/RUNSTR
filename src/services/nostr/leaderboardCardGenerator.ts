/**
 * LeaderboardCardGenerator - SVG card generation for daily leaderboards
 * Creates shareable leaderboard cards for 5K/10K/Half/Marathon daily results
 */

import type { LeaderboardEntry } from '../competition/DailyLeaderboardService';
import { RUNSTR_LOGO_BASE64 } from './runstrLogoBase64';

export interface LeaderboardCardData {
  title: string; // "5K Today", "10K Today", etc.
  distance: string; // "5km", "10km", etc.
  date: Date;
  entries: LeaderboardEntry[];
}

export interface LeaderboardCardResult {
  svgContent: string;
  dimensions: { width: number; height: number };
  metadata: {
    title: string;
    date: string;
    participantCount: number;
    generatedAt: string;
  };
}

// Card configuration
const CARD_CONFIG = {
  width: 800,
  baseHeight: 400, // Minimum height
  rowHeight: 60, // Height per runner row
  maxRows: 15, // Maximum rows before truncating
  backgroundColor: '#000000',
  accentColor: '#FF6B35', // RUNSTR orange
  textColor: '#FFFFFF',
  mutedColor: '#999999',
  borderColor: '#1a1a1a',
};

export class LeaderboardCardGenerator {
  private static instance: LeaderboardCardGenerator;

  private constructor() {}

  static getInstance(): LeaderboardCardGenerator {
    if (!LeaderboardCardGenerator.instance) {
      LeaderboardCardGenerator.instance = new LeaderboardCardGenerator();
    }
    return LeaderboardCardGenerator.instance;
  }

  /**
   * Generate leaderboard card as SVG
   */
  async generateLeaderboardCard(
    data: LeaderboardCardData
  ): Promise<LeaderboardCardResult> {
    try {
      console.log(
        `🎨 Generating leaderboard card for ${data.title} with ${data.entries.length} entries...`
      );

      // Calculate dynamic height based on number of entries
      const rowsToShow = Math.min(data.entries.length, CARD_CONFIG.maxRows);
      const contentHeight = rowsToShow * CARD_CONFIG.rowHeight;
      const height = CARD_CONFIG.baseHeight + contentHeight;

      const dimensions = { width: CARD_CONFIG.width, height };

      // Generate SVG content
      const svgContent = this.createSVGCard(data, dimensions);

      if (!svgContent || svgContent.trim().length === 0) {
        throw new Error('Generated SVG content is empty');
      }

      return {
        svgContent,
        dimensions,
        metadata: {
          title: data.title,
          date: data.date.toISOString(),
          participantCount: data.entries.length,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Error generating leaderboard card:', error);
      throw error;
    }
  }

  /**
   * Create SVG card content
   */
  private createSVGCard(
    data: LeaderboardCardData,
    dimensions: { width: number; height: number }
  ): string {
    const { width, height } = dimensions;
    const { accentColor, textColor, mutedColor, backgroundColor } = CARD_CONFIG;

    const sansFont = 'system-ui, -apple-system, sans-serif';
    const centerX = width / 2;

    // Format date
    const formattedDate = data.date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Build runner rows
    const rowsToShow = Math.min(data.entries.length, CARD_CONFIG.maxRows);
    const runnerRows = this.createRunnerRows(
      data.entries.slice(0, rowsToShow),
      width,
      sansFont
    );

    // Show truncation notice if needed
    const truncationNotice =
      data.entries.length > CARD_CONFIG.maxRows
        ? this.createTruncationNotice(
            data.entries.length - CARD_CONFIG.maxRows,
            width,
            height - 60,
            sansFont
          )
        : '';

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leaderboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#leaderboardGradient)"/>

        <!-- Header Section -->
        <g transform="translate(0, 40)">
          <!-- RUNSTR Logo -->
          <image
            href="${RUNSTR_LOGO_BASE64}"
            x="${centerX - 30}"
            y="0"
            width="60"
            height="60"
            preserveAspectRatio="xMidYMid meet"
          />

          <!-- Title -->
          <text
            x="${centerX}"
            y="100"
            font-family="${sansFont}"
            font-size="36"
            font-weight="700"
            text-anchor="middle"
            fill="${textColor}"
            letter-spacing="2"
          >${this.escapeXml(data.title.toUpperCase())}</text>

          <!-- Date -->
          <text
            x="${centerX}"
            y="130"
            font-family="${sansFont}"
            font-size="16"
            font-weight="400"
            text-anchor="middle"
            fill="${mutedColor}"
          >${formattedDate}</text>

          <!-- Participant count -->
          <text
            x="${centerX}"
            y="155"
            font-family="${sansFont}"
            font-size="14"
            font-weight="500"
            text-anchor="middle"
            fill="${accentColor}"
          >${data.entries.length} ${data.entries.length === 1 ? 'runner' : 'runners'}</text>
        </g>

        <!-- Divider -->
        <line
          x1="60"
          y1="210"
          x2="${width - 60}"
          y2="210"
          stroke="${accentColor}"
          stroke-width="2"
          opacity="0.3"
        />

        <!-- Runner Rows -->
        <g transform="translate(0, 230)">
          ${runnerRows}
        </g>

        ${truncationNotice}

        <!-- Footer Branding -->
        <text
          x="${centerX}"
          y="${height - 25}"
          font-family="${sansFont}"
          font-size="12"
          font-weight="600"
          text-anchor="middle"
          fill="${mutedColor}"
          letter-spacing="2"
        >RUNSTR</text>
      </svg>
    `.trim();
  }

  /**
   * Create runner rows SVG content
   */
  private createRunnerRows(
    entries: LeaderboardEntry[],
    width: number,
    font: string
  ): string {
    const { accentColor, textColor, mutedColor } = CARD_CONFIG;
    const rowHeight = CARD_CONFIG.rowHeight;
    const padding = 60;

    return entries
      .map((entry, index) => {
        const y = index * rowHeight;
        const isTopThree = entry.rank <= 3;

        // Rank badge colors
        const rankBgColor = isTopThree ? accentColor : '#1a1a1a';
        const rankTextColor = isTopThree ? '#000000' : textColor;

        // Truncate name if too long
        const displayName =
          entry.name.length > 20
            ? entry.name.substring(0, 17) + '...'
            : entry.name;

        return `
          <g transform="translate(${padding}, ${y})">
            <!-- Row background for top 3 -->
            ${
              isTopThree
                ? `
              <rect
                x="-10"
                y="0"
                width="${width - padding * 2 + 20}"
                height="${rowHeight - 8}"
                rx="8"
                fill="${accentColor}"
                opacity="0.1"
              />
            `
                : ''
            }

            <!-- Rank badge -->
            <rect
              x="0"
              y="8"
              width="36"
              height="36"
              rx="18"
              fill="${rankBgColor}"
            />
            <text
              x="18"
              y="32"
              font-family="${font}"
              font-size="16"
              font-weight="700"
              text-anchor="middle"
              fill="${rankTextColor}"
            >${entry.rank}</text>

            <!-- Runner name -->
            <text
              x="56"
              y="32"
              font-family="${font}"
              font-size="18"
              font-weight="${isTopThree ? '600' : '400'}"
              fill="${textColor}"
            >${this.escapeXml(displayName)}</text>

            <!-- Time -->
            <text
              x="${width - padding * 2}"
              y="32"
              font-family="${font}"
              font-size="20"
              font-weight="600"
              text-anchor="end"
              fill="${isTopThree ? accentColor : mutedColor}"
            >${entry.formattedScore}</text>
          </g>
        `;
      })
      .join('');
  }

  /**
   * Create truncation notice if there are more runners than shown
   */
  private createTruncationNotice(
    hiddenCount: number,
    width: number,
    y: number,
    font: string
  ): string {
    const { mutedColor } = CARD_CONFIG;
    const centerX = width / 2;

    return `
      <text
        x="${centerX}"
        y="${y}"
        font-family="${font}"
        font-size="14"
        font-weight="400"
        text-anchor="middle"
        fill="${mutedColor}"
        font-style="italic"
      >+ ${hiddenCount} more ${hiddenCount === 1 ? 'runner' : 'runners'}</text>
    `;
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
   * Generate post text for Nostr
   */
  generatePostText(data: LeaderboardCardData): string {
    // Format: "RUNSTR 5K 12/03/2025"
    const dateStr = data.date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    // Extract distance from title or use distance prop
    const distance = data.distance.replace('km', 'K').toUpperCase();

    return `RUNSTR ${distance} ${dateStr}`;
  }
}

export default LeaderboardCardGenerator.getInstance();
