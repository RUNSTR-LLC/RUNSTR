/**
 * Team Matching Algorithm
 * Intelligently matches users to teams based on skill level, preferences, and goals
 */

import type { DiscoveryTeam, DifficultyLevel, Workout } from '../types';

export interface UserPreferences {
  primaryGoal: 'earnings' | 'competition' | 'social' | 'fitness';
  competitiveLevel: 'casual' | 'moderate' | 'competitive' | 'elite';
  timeCommitment: 'low' | 'medium' | 'high'; // hours per week
  preferredRewardSize: 'small_frequent' | 'medium_regular' | 'large_rare';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface UserFitnessProfile {
  avgPaceSeconds?: number; // Average pace from recent workouts
  weeklyDistance?: number; // Meters per week average
  consistency?: number; // 0-1 score based on workout frequency
  improvement?: number; // 0-1 score based on performance trends
  recentWorkouts?: Workout[];
}

export interface TeamMatch {
  team: DiscoveryTeam;
  score: number; // 0-100 match score
  reasons: string[];
  warnings: string[];
  expectedEarnings: {
    weekly: number;
    monthly: number;
  };
  competitiveViability: number; // 0-1 how likely to win/place
}

export class TeamMatchingAlgorithm {
  /**
   * Find the best team matches for a user
   */
  static findMatches(
    teams: DiscoveryTeam[],
    userPrefs: UserPreferences,
    fitnessProfile: UserFitnessProfile,
    maxResults: number = 5
  ): TeamMatch[] {
    const matches = teams
      .map((team) => this.scoreTeamMatch(team, userPrefs, fitnessProfile))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return matches;
  }

  /**
   * Score how well a team matches a user (0-100)
   */
  private static scoreTeamMatch(
    team: DiscoveryTeam,
    userPrefs: UserPreferences,
    fitnessProfile: UserFitnessProfile
  ): TeamMatch {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1. Skill Level Match (25% of score)
    const skillScore = this.calculateSkillMatch(
      team,
      userPrefs,
      fitnessProfile
    );
    score += skillScore.score * 0.25;
    reasons.push(...skillScore.reasons);
    warnings.push(...skillScore.warnings);

    // 2. Goal Alignment (20% of score)
    const goalScore = this.calculateGoalAlignment(team, userPrefs);
    score += goalScore.score * 0.2;
    reasons.push(...goalScore.reasons);

    // 3. Reward Potential (20% of score)
    const rewardScore = this.calculateRewardPotential(
      team,
      userPrefs,
      fitnessProfile
    );
    score += rewardScore.score * 0.2;
    reasons.push(...rewardScore.reasons);
    warnings.push(...rewardScore.warnings);

    // 4. Activity Level Match (15% of score)
    const activityScore = this.calculateActivityMatch(team, userPrefs);
    score += activityScore.score * 0.15;
    reasons.push(...activityScore.reasons);

    // 5. Team Health (10% of score)
    const healthScore = this.calculateTeamHealth(team);
    score += healthScore.score * 0.1;
    reasons.push(...healthScore.reasons);
    warnings.push(...healthScore.warnings);

    // 6. Team Size Balance (10% of score)
    const sizeScore = this.calculateTeamSizeScore(team, userPrefs);
    score += sizeScore.score * 0.1;
    reasons.push(...sizeScore.reasons);

    // Calculate expected earnings and competitive viability
    const expectedEarnings = this.calculateExpectedEarnings(
      team,
      fitnessProfile
    );
    const competitiveViability = this.calculateCompetitiveViability(
      team,
      fitnessProfile
    );

    return {
      team,
      score: Math.round(score),
      reasons: reasons.filter(Boolean),
      warnings: warnings.filter(Boolean),
      expectedEarnings,
      competitiveViability,
    };
  }

  /**
   * Calculate skill level match
   */
  private static calculateSkillMatch(
    team: DiscoveryTeam,
    userPrefs: UserPreferences,
    fitnessProfile: UserFitnessProfile
  ) {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Match user experience level to team difficulty
    const experienceToTeamMatch: Record<string, DifficultyLevel[]> = {
      beginner: ['beginner'],
      intermediate: ['beginner', 'intermediate'],
      advanced: ['intermediate', 'advanced'],
      expert: ['advanced', 'elite'],
    };

    const goodMatch = experienceToTeamMatch[
      userPrefs.experienceLevel
    ]?.includes(team.difficulty);

    if (goodMatch) {
      score = 80;
      reasons.push(
        `Your ${userPrefs.experienceLevel} level matches this ${team.difficulty} team`
      );
    } else {
      // Check if it's too easy or too hard
      const difficultyLevels = [
        'beginner',
        'intermediate',
        'advanced',
        'elite',
      ];
      const userLevel = difficultyLevels.indexOf(userPrefs.experienceLevel);
      const teamLevel = difficultyLevels.indexOf(team.difficulty);

      if (teamLevel < userLevel - 1) {
        score = 40;
        warnings.push('This team may be too easy for your skill level');
      } else if (teamLevel > userLevel + 1) {
        score = 30;
        warnings.push(
          'This team may be very challenging for your current level'
        );
      } else {
        score = 60;
        reasons.push('Skill level is close to team difficulty');
      }
    }

    // Bonus for pace compatibility (if we have user pace data)
    if (fitnessProfile.avgPaceSeconds && team.stats.avgPace !== '0:00/mi') {
      const teamPaceSeconds = this.parsePaceToSeconds(team.stats.avgPace);
      if (teamPaceSeconds) {
        const paceDiff = Math.abs(
          fitnessProfile.avgPaceSeconds - teamPaceSeconds
        );

        if (paceDiff < 60) {
          // Within 1 minute/mile
          score += 15;
          reasons.push('Your pace matches team average closely');
        } else if (paceDiff < 120) {
          // Within 2 minutes/mile
          score += 5;
          reasons.push('Your pace is compatible with team average');
        } else {
          warnings.push(
            `Team pace (${team.stats.avgPace}) differs significantly from yours`
          );
        }
      }
    }

    return { score: Math.min(score, 100), reasons, warnings };
  }

  /**
   * Calculate goal alignment score
   */
  private static calculateGoalAlignment(
    team: DiscoveryTeam,
    userPrefs: UserPreferences
  ) {
    let score = 50; // baseline
    const reasons: string[] = [];

    switch (userPrefs.primaryGoal) {
      case 'earnings':
        if (team.prizePool > 200000) {
          score = 90;
          reasons.push('High prize pool for maximum earning potential');
        } else if (team.prizePool > 100000) {
          score = 75;
          reasons.push('Good prize pool for earning opportunities');
        } else {
          score = 40;
        }
        break;

      case 'competition':
        if (team.difficulty === 'elite' || team.difficulty === 'advanced') {
          score = 85;
          reasons.push('Highly competitive team environment');
        }
        if (team.stats.activeChallenges > 10) {
          score += 10;
          reasons.push('Very active challenge participation');
        }
        break;

      case 'social':
        if (team.stats.memberCount > 100) {
          score = 80;
          reasons.push('Large community for social interaction');
        } else if (team.stats.memberCount > 50) {
          score = 70;
          reasons.push('Good-sized community');
        }
        if (team.stats.activeEvents > 5) {
          score += 10;
          reasons.push('Regular team events and activities');
        }
        break;

      case 'fitness':
        if (
          team.difficulty === 'intermediate' ||
          team.difficulty === 'advanced'
        ) {
          score = 75;
          reasons.push('Good challenge level for fitness improvement');
        }
        if (team.stats.activeEvents > 3) {
          score += 15;
          reasons.push('Regular training events and challenges');
        }
        break;
    }

    return { score: Math.min(score, 100), reasons };
  }

  /**
   * Calculate reward potential and earning expectations
   */
  private static calculateRewardPotential(
    team: DiscoveryTeam,
    userPrefs: UserPreferences,
    fitnessProfile: UserFitnessProfile
  ) {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Base score on prize pool size
    if (team.prizePool > 200000) {
      score = 85;
      reasons.push('Very high prize pool');
    } else if (team.prizePool > 100000) {
      score = 70;
      reasons.push('High prize pool');
    } else if (team.prizePool > 50000) {
      score = 55;
      reasons.push('Moderate prize pool');
    } else {
      score = 35;
      reasons.push('Smaller prize pool');
    }

    // Adjust for user's competitive viability
    const competitiveScore = this.calculateCompetitiveViability(
      team,
      fitnessProfile
    );
    if (competitiveScore < 0.3) {
      score *= 0.6; // Reduce score if user is unlikely to win
      warnings.push('High competition may limit earning opportunities');
    } else if (competitiveScore > 0.7) {
      score *= 1.2; // Boost if user is likely to do well
      reasons.push('Good chance to earn rewards in this team');
    }

    // Match reward preference
    const avgPayout = team.recentPayout?.amount || 0;
    const payoutFrequency = this.estimatePayoutFrequency(team);

    if (
      userPrefs.preferredRewardSize === 'small_frequent' &&
      payoutFrequency === 'high'
    ) {
      score += 15;
      reasons.push('Frequent small rewards match your preference');
    } else if (
      userPrefs.preferredRewardSize === 'large_rare' &&
      avgPayout > 10000
    ) {
      score += 15;
      reasons.push('Potential for large rewards matches your preference');
    }

    return { score: Math.min(score, 100), reasons, warnings };
  }

  /**
   * Calculate activity level match
   */
  private static calculateActivityMatch(
    team: DiscoveryTeam,
    userPrefs: UserPreferences
  ) {
    let score = 50;
    const reasons: string[] = [];

    const totalActivity = team.stats.activeEvents + team.stats.activeChallenges;

    if (userPrefs.timeCommitment === 'high' && totalActivity > 12) {
      score = 90;
      reasons.push('Very active team matches your high time commitment');
    } else if (
      userPrefs.timeCommitment === 'medium' &&
      totalActivity >= 6 &&
      totalActivity <= 12
    ) {
      score = 85;
      reasons.push('Balanced activity level matches your availability');
    } else if (userPrefs.timeCommitment === 'low' && totalActivity <= 8) {
      score = 80;
      reasons.push('Moderate activity level suits your schedule');
    } else if (userPrefs.timeCommitment === 'low' && totalActivity > 15) {
      score = 30;
      reasons.push('Very high activity may be overwhelming');
    } else {
      score = 60;
    }

    return { score: Math.min(score, 100), reasons };
  }

  /**
   * Calculate team health score
   */
  private static calculateTeamHealth(team: DiscoveryTeam) {
    let score = 70; // baseline
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Recent activity indicates health
    const recentActivity = team.recentActivities.length;
    if (recentActivity >= 3) {
      score += 20;
      reasons.push('Very active with recent events and updates');
    } else if (recentActivity >= 1) {
      score += 10;
      reasons.push('Recent team activity');
    } else {
      score -= 20;
      warnings.push('Limited recent activity');
    }

    // Recent payouts indicate active reward distribution
    if (team.recentPayout) {
      const daysSincePayout = this.daysSince(team.recentPayout.timestamp);
      if (daysSincePayout <= 7) {
        score += 15;
        reasons.push('Recent reward payouts');
      } else if (daysSincePayout <= 30) {
        score += 5;
      } else {
        warnings.push('No recent reward payouts');
      }
    }

    // Optimal member count
    if (team.stats.memberCount >= 50 && team.stats.memberCount <= 200) {
      score += 10;
      reasons.push('Well-sized team for good competition');
    } else if (team.stats.memberCount < 20) {
      warnings.push('Small team size may limit opportunities');
      score -= 10;
    } else if (team.stats.memberCount > 300) {
      warnings.push('Very large team may reduce individual attention');
      score -= 5;
    }

    return { score: Math.min(score, 100), reasons, warnings };
  }

  /**
   * Calculate team size scoring
   */
  private static calculateTeamSizeScore(
    team: DiscoveryTeam,
    userPrefs: UserPreferences
  ) {
    let score = 70;
    const reasons: string[] = [];

    if (userPrefs.primaryGoal === 'social' && team.stats.memberCount > 100) {
      score = 90;
      reasons.push('Large team provides more social opportunities');
    } else if (
      userPrefs.primaryGoal === 'competition' &&
      team.stats.memberCount < 150
    ) {
      score = 85;
      reasons.push('Optimal size for competitive recognition');
    } else if (team.stats.memberCount < 10) {
      score = 40;
      reasons.push('Very small team may have limited activity');
    }

    return { score, reasons };
  }

  /**
   * Calculate expected weekly/monthly earnings
   */
  private static calculateExpectedEarnings(
    team: DiscoveryTeam,
    fitnessProfile: UserFitnessProfile
  ) {
    const competitiveViability = this.calculateCompetitiveViability(
      team,
      fitnessProfile
    );
    const basePayout = team.recentPayout?.amount || team.prizePool * 0.05;
    const payoutFrequency = this.estimatePayoutFrequency(team);

    let weeklyMultiplier = 0.5; // conservative estimate
    if (payoutFrequency === 'high') weeklyMultiplier = 2;
    else if (payoutFrequency === 'medium') weeklyMultiplier = 1;

    const weeklyExpected = basePayout * competitiveViability * weeklyMultiplier;
    const monthlyExpected = weeklyExpected * 4.33;

    return {
      weekly: Math.round(weeklyExpected),
      monthly: Math.round(monthlyExpected),
    };
  }

  /**
   * Calculate how competitively viable a user would be (0-1)
   */
  private static calculateCompetitiveViability(
    team: DiscoveryTeam,
    fitnessProfile: UserFitnessProfile
  ): number {
    if (!fitnessProfile.avgPaceSeconds || team.stats.avgPace === '0:00/mi') {
      return 0.5; // unknown, assume average
    }

    const teamPaceSeconds = this.parsePaceToSeconds(team.stats.avgPace);
    if (!teamPaceSeconds) return 0.5;

    const userPace = fitnessProfile.avgPaceSeconds;

    // Better pace = higher viability
    if (userPace <= teamPaceSeconds * 0.9) {
      return 0.9; // Significantly better than average
    } else if (userPace <= teamPaceSeconds) {
      return 0.7; // Better than average
    } else if (userPace <= teamPaceSeconds * 1.1) {
      return 0.5; // Close to average
    } else if (userPace <= teamPaceSeconds * 1.2) {
      return 0.3; // Below average
    } else {
      return 0.1; // Significantly below average
    }
  }

  /**
   * Utility: Parse pace string to seconds
   */
  private static parsePaceToSeconds(paceStr: string): number | null {
    const match = paceStr.match(/(\d+):(\d+)/);
    if (!match) return null;

    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    return minutes * 60 + seconds;
  }

  /**
   * Utility: Estimate payout frequency
   */
  private static estimatePayoutFrequency(
    team: DiscoveryTeam
  ): 'low' | 'medium' | 'high' {
    const totalActivity = team.stats.activeEvents + team.stats.activeChallenges;

    if (totalActivity > 15) return 'high';
    if (totalActivity > 8) return 'medium';
    return 'low';
  }

  /**
   * Utility: Days since timestamp
   */
  private static daysSince(timestamp: string): number {
    const now = new Date();
    const past = new Date(timestamp);
    return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get user fitness profile from recent workouts
   */
  static generateFitnessProfile(recentWorkouts: Workout[]): UserFitnessProfile {
    if (recentWorkouts.length === 0) {
      return { consistency: 0, improvement: 0.5 };
    }

    // Calculate average pace for running workouts
    const runningWorkouts = recentWorkouts.filter(
      (w) => w.type === 'running' && w.distance && w.duration
    );

    let avgPaceSeconds: number | undefined;
    if (runningWorkouts.length > 0) {
      const totalPaceSeconds = runningWorkouts.reduce((sum, workout) => {
        const paceSeconds = workout.duration / (workout.distance! / 1609.34); // pace per mile
        return sum + paceSeconds;
      }, 0);
      avgPaceSeconds = totalPaceSeconds / runningWorkouts.length;
    }

    // Calculate weekly distance average
    const weeklyDistance =
      recentWorkouts.reduce(
        (sum, workout) => sum + (workout.distance || 0),
        0
      ) / Math.max(1, recentWorkouts.length / 7);

    // Calculate consistency (workouts per week)
    const weeksSpanned = Math.max(1, recentWorkouts.length / 7);
    const consistency = Math.min(1, recentWorkouts.length / (weeksSpanned * 3)); // 3 workouts per week = 1.0

    // Simple improvement calculation (compare first half to second half)
    const improvement = 0.5; // Default neutral - would need more complex logic

    return {
      avgPaceSeconds,
      weeklyDistance,
      consistency,
      improvement,
      recentWorkouts,
    };
  }
}
