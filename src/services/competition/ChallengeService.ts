/**
 * ChallengeService
 * Manages 1v1 fitness challenges including creation, storage, and leaderboard calculation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrListService } from '../nostr/NostrListService';
import type { ListCreationData } from '../nostr/NostrListService';
import type { ChallengeMetadata, ChallengeStatus, ChallengeLeaderboard, ChallengeParticipant } from '../../types/challenge';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import { Competition1301QueryService } from './Competition1301QueryService';
import type { Kind1301Event } from '../season/Season1Service';

export class ChallengeService {
  private static instance: ChallengeService;
  private listService: NostrListService;
  private queryService: Competition1301QueryService;
  private readonly STORAGE_KEY_PREFIX = '@runstr:challenge:';

  constructor() {
    this.listService = NostrListService.getInstance();
    this.queryService = Competition1301QueryService.getInstance();
  }

  static getInstance(): ChallengeService {
    if (!ChallengeService.instance) {
      ChallengeService.instance = new ChallengeService();
    }
    return ChallengeService.instance;
  }

  /**
   * Create a new challenge
   * Initially only includes the challenger in the participant list
   */
  async createChallenge(metadata: Omit<ChallengeMetadata, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const challengeId = `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);

    // Get user's identifiers
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    const fullMetadata: ChallengeMetadata = {
      ...metadata,
      id: challengeId,
      status: ChallengeStatus.PENDING,
      createdAt: now,
      challengerPubkey: userIdentifiers.hexPubkey
    };

    // Store challenge metadata locally
    await this.storeChallengeLocally(fullMetadata);

    // Prepare kind 30000 list for the challenge
    const listData: ListCreationData = {
      name: metadata.name,
      description: metadata.description || `${metadata.activity} challenge for ${metadata.wager} sats`,
      members: [userIdentifiers.hexPubkey], // Initially only challenger
      dTag: challengeId,
      listType: 'people'
    };

    // Create the list event template (needs external signing)
    const listEvent = this.listService.prepareListCreation(listData, userIdentifiers.hexPubkey);

    // Add challenge-specific tags
    if (listEvent) {
      listEvent.tags.push(
        ['t', 'challenge'],
        ['t', 'fitness'],
        ['t', 'competition'],
        ['t', metadata.activity],
        ['activity', metadata.activity],
        ['metric', metadata.metric],
        ['wager', metadata.wager.toString()],
        ['status', 'pending'],
        ['starts', metadata.startsAt.toString()],
        ['expires', metadata.expiresAt.toString()]
      );

      if (metadata.target) {
        listEvent.tags.push(['target', metadata.target]);
      }
    }

    console.log(`✅ Created challenge: ${challengeId}`);
    return challengeId;
  }

  /**
   * Get challenge metadata
   */
  async getChallenge(challengeId: string): Promise<ChallengeMetadata | null> {
    try {
      // Try local storage first
      const local = await this.getChallengeFromLocal(challengeId);
      if (local) return local;

      // Try to reconstruct from Nostr list
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) return null;

      // Query for the challenge list
      const lists = await this.listService.getListsContainingUser(userIdentifiers.hexPubkey, {
        tags: ['challenge']
      });

      const challengeList = lists.find(list => list.dTag === challengeId);
      if (!challengeList) return null;

      return this.reconstructChallengeFromList(challengeList);
    } catch (error) {
      console.error('Error getting challenge:', error);
      return null;
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(challengeId: string): Promise<ChallengeLeaderboard | null> {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) return null;

    // Get participants from kind 30000 list
    const participants = await this.listService.getListMembers(
      challenge.challengerPubkey,
      challengeId
    );

    if (participants.length === 0) {
      console.log('No participants in challenge');
      return null;
    }

    // Query workout events for participants
    const startTime = challenge.startsAt;
    const endTime = challenge.expiresAt;

    const participantProgress: ChallengeParticipant[] = [];

    for (const pubkey of participants) {
      // Get workouts for this participant
      const workouts = await this.queryService.queryUserWorkouts(
        pubkey,
        startTime,
        endTime,
        challenge.activity
      );

      // Calculate progress based on metric
      const progress = this.calculateProgress(workouts, challenge.metric);

      participantProgress.push({
        pubkey,
        name: pubkey.slice(0, 8) + '...', // Will be replaced with actual name
        currentProgress: progress.value,
        lastWorkoutAt: progress.lastWorkoutAt,
        workoutCount: workouts.length
      });
    }

    // Sort by progress
    participantProgress.sort((a, b) => b.currentProgress - a.currentProgress);

    // Determine leader and if tied
    const leader = participantProgress[0]?.pubkey;
    const tied = participantProgress.length > 1 &&
      participantProgress[0].currentProgress === participantProgress[1].currentProgress;

    return {
      challengeId,
      participants: participantProgress,
      metric: challenge.metric,
      target: challenge.target ? parseFloat(challenge.target) : undefined,
      wager: challenge.wager,
      status: challenge.status,
      startsAt: challenge.startsAt,
      expiresAt: challenge.expiresAt,
      leader,
      tied
    };
  }

  /**
   * Update challenge status
   */
  async updateChallengeStatus(challengeId: string, status: ChallengeStatus): Promise<void> {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    challenge.status = status;
    await this.storeChallengeLocally(challenge);

    console.log(`✅ Updated challenge ${challengeId} status to ${status}`);
  }

  /**
   * Add participant to challenge (after acceptance)
   */
  async addParticipant(challengeId: string, participantPubkey: string): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Get current list
    const list = await this.listService.getList(userIdentifiers.hexPubkey, challengeId);
    if (!list) {
      throw new Error('Challenge list not found');
    }

    // Prepare updated list with new participant
    const updatedListEvent = this.listService.prepareAddMember(
      userIdentifiers.hexPubkey,
      challengeId,
      participantPubkey,
      list
    );

    if (updatedListEvent) {
      // Update status to active
      updatedListEvent.tags = updatedListEvent.tags.map(tag =>
        tag[0] === 'status' ? ['status', 'active'] : tag
      );
    }

    // Note: Actual publishing needs to be done externally with signing
    console.log(`✅ Prepared to add participant ${participantPubkey} to challenge ${challengeId}`);
  }

  /**
   * Calculate progress based on metric
   */
  private calculateProgress(
    workouts: Kind1301Event[],
    metric: string
  ): { value: number; lastWorkoutAt?: number } {
    if (workouts.length === 0) {
      return { value: 0 };
    }

    let value = 0;
    let lastWorkoutAt = 0;

    switch (metric) {
      case 'distance':
        // Sum total distance
        value = workouts.reduce((sum, w) => {
          const distance = this.extractDistance(w);
          return sum + distance;
        }, 0);
        break;

      case 'duration':
        // Sum total duration in seconds
        value = workouts.reduce((sum, w) => {
          const duration = this.extractDuration(w);
          return sum + duration;
        }, 0);
        break;

      case 'count':
        // Count of workouts
        value = workouts.length;
        break;

      case 'calories':
        // Sum total calories
        value = workouts.reduce((sum, w) => {
          const calories = this.extractCalories(w);
          return sum + calories;
        }, 0);
        break;

      case 'pace':
        // Average pace (lower is better)
        const validPaces = workouts
          .map(w => this.calculatePace(w))
          .filter(p => p > 0);

        if (validPaces.length > 0) {
          value = validPaces.reduce((sum, p) => sum + p, 0) / validPaces.length;
        }
        break;
    }

    // Get timestamp of last workout
    if (workouts.length > 0) {
      lastWorkoutAt = Math.max(...workouts.map(w => w.created_at || 0));
    }

    return { value, lastWorkoutAt };
  }

  private extractDistance(workout: Kind1301Event): number {
    const distanceTag = workout.tags?.find(t => t[0] === 'distance');
    if (distanceTag && distanceTag[1]) {
      const value = parseFloat(distanceTag[1]);
      const unit = distanceTag[2] || 'km';
      // Convert to meters for standardization
      if (unit === 'km') return value * 1000;
      if (unit === 'mi') return value * 1609.34;
      return value; // Assume meters
    }
    return 0;
  }

  private extractDuration(workout: Kind1301Event): number {
    const durationTag = workout.tags?.find(t => t[0] === 'duration');
    if (durationTag && durationTag[1]) {
      // Parse HH:MM:SS format
      const parts = durationTag[1].split(':');
      if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
    }
    return 0;
  }

  private extractCalories(workout: Kind1301Event): number {
    const caloriesTag = workout.tags?.find(t => t[0] === 'calories');
    return caloriesTag ? parseInt(caloriesTag[1]) || 0 : 0;
  }

  private calculatePace(workout: Kind1301Event): number {
    const distance = this.extractDistance(workout);
    const duration = this.extractDuration(workout);
    if (distance > 0 && duration > 0) {
      // Return minutes per kilometer
      return (duration / 60) / (distance / 1000);
    }
    return 0;
  }

  /**
   * Store challenge locally
   */
  private async storeChallengeLocally(challenge: ChallengeMetadata): Promise<void> {
    const key = `${this.STORAGE_KEY_PREFIX}${challenge.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(challenge));
  }

  /**
   * Get challenge from local storage
   */
  private async getChallengeFromLocal(challengeId: string): Promise<ChallengeMetadata | null> {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${challengeId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading challenge from storage:', error);
      return null;
    }
  }

  /**
   * Reconstruct challenge metadata from Nostr list
   */
  private reconstructChallengeFromList(list: any): ChallengeMetadata {
    const tags = new Map(list.tags.map((t: string[]) => [t[0], t[1]]));

    return {
      id: list.dTag,
      name: list.name,
      description: list.description,
      activity: tags.get('activity') as any || 'running',
      metric: tags.get('metric') as any || 'distance',
      target: tags.get('target'),
      wager: parseInt(tags.get('wager') || '0'),
      status: (tags.get('status') as ChallengeStatus) || ChallengeStatus.PENDING,
      createdAt: list.createdAt,
      startsAt: parseInt(tags.get('starts') || '0'),
      expiresAt: parseInt(tags.get('expires') || '0'),
      challengerPubkey: list.author,
      challengedPubkey: list.members.find((m: string) => m !== list.author) || ''
    };
  }

  /**
   * Get all user's challenges
   */
  async getUserChallenges(userPubkey: string): Promise<ChallengeMetadata[]> {
    const lists = await this.listService.getListsContainingUser(userPubkey, {
      tags: ['challenge']
    });

    return lists.map(list => this.reconstructChallengeFromList(list));
  }
}

export default ChallengeService.getInstance();