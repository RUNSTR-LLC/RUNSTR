/**
 * Auto Event Entry Hook - Integration between workout completion and event suggestions
 * Provides seamless workout-to-competition flow with smart event detection
 * Connects existing workout systems with new auto-entry capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import EventEligibilityService from '../services/competition/eventEligibilityService';
import { useUserStore } from '../store/userStore';
import { useTeamStore } from '../store/teamStore';
import type { NostrWorkout } from '../types/nostrWorkout';
import type { 
  EligibleEvent, 
  EventAutoEntryResult, 
  WorkoutEligibilityResult 
} from '../services/competition/eventEligibilityService';

export interface UseAutoEventEntryOptions {
  autoCheck?: boolean; // Automatically check eligibility when workout changes
  showPromptDelay?: number; // Delay before showing auto-entry prompt (ms)
  enableNotifications?: boolean; // Show notifications for eligible events
}

export interface UseAutoEventEntryReturn {
  // State
  isCheckingEligibility: boolean;
  eligibilityResult: WorkoutEligibilityResult | null;
  suggestedEvents: EligibleEvent[];
  bestMatch: EligibleEvent | null;
  showAutoEntryPrompt: boolean;
  
  // Actions
  checkWorkoutEligibility: (workout: NostrWorkout) => Promise<void>;
  showEventSuggestions: (workout: NostrWorkout) => void;
  hideEventSuggestions: () => void;
  enterWorkoutInEvent: (workout: NostrWorkout, event: EligibleEvent) => Promise<EventAutoEntryResult>;
  skipEventSuggestions: () => void;
  
  // Utilities
  hasEligibleEvents: boolean;
  totalEligibleEvents: number;
  clearEligibilityData: () => void;
}

export const useAutoEventEntry = (
  options: UseAutoEventEntryOptions = {}
): UseAutoEventEntryReturn => {
  
  const {
    autoCheck = true,
    showPromptDelay = 1000,
    enableNotifications = true,
  } = options;

  // Store access
  const user = useUserStore((state) => state.user);
  const userTeams = useTeamStore((state) => state.userTeams);

  // State
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<WorkoutEligibilityResult | null>(null);
  const [showAutoEntryPrompt, setShowAutoEntryPrompt] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<NostrWorkout | null>(null);
  const [promptTimeout, setPromptTimeout] = useState<NodeJS.Timeout | null>(null);

  // Derived state
  const suggestedEvents = eligibilityResult?.eligibleEvents || [];
  const bestMatch = eligibilityResult?.bestMatch || null;
  const hasEligibleEvents = suggestedEvents.length > 0;
  const totalEligibleEvents = eligibilityResult?.totalEligibleEvents || 0;

  // Get user teams list
  const getUserTeamIds = useCallback((): string[] => {
    if (!userTeams || userTeams.length === 0) {
      console.log('⚠️ No user teams available for event eligibility check');
      return [];
    }
    return userTeams.map(team => team.id);
  }, [userTeams]);

  // Check workout eligibility
  const checkWorkoutEligibility = useCallback(async (workout: NostrWorkout) => {
    if (!workout || !user) {
      console.log('⚠️ Missing workout or user for eligibility check');
      return;
    }

    const teamIds = getUserTeamIds();
    if (teamIds.length === 0) {
      console.log('⚠️ No teams available for event eligibility');
      setEligibilityResult(null);
      return;
    }

    setIsCheckingEligibility(true);
    setCurrentWorkout(workout);

    try {
      console.log(`🔍 Checking eligibility for workout: ${workout.type} (${workout.nostrEventId.slice(0, 16)}...)`);
      
      const result = await EventEligibilityService.checkWorkoutEligibility(
        workout, 
        teamIds
      );

      setEligibilityResult(result);
      
      console.log(`✅ Eligibility check complete: ${result.totalEligibleEvents} eligible events found`);
      
      // Show notifications if enabled and events found
      if (enableNotifications && result.totalEligibleEvents > 0) {
        console.log(`💡 Found ${result.totalEligibleEvents} eligible events for notification`);
      }

    } catch (error) {
      console.error('❌ Failed to check workout eligibility:', error);
      setEligibilityResult(null);
    } finally {
      setIsCheckingEligibility(false);
    }
  }, [user, getUserTeamIds, enableNotifications]);

  // Show event suggestions with optional delay
  const showEventSuggestions = useCallback((workout: NostrWorkout) => {
    console.log(`🎯 Showing event suggestions for workout: ${workout.type}`);
    
    // Clear any existing timeout
    if (promptTimeout) {
      clearTimeout(promptTimeout);
    }

    // Set workout and show prompt (with delay if specified)
    setCurrentWorkout(workout);
    
    if (showPromptDelay > 0) {
      const timeout = setTimeout(() => {
        setShowAutoEntryPrompt(true);
        setPromptTimeout(null);
      }, showPromptDelay);
      setPromptTimeout(timeout);
    } else {
      setShowAutoEntryPrompt(true);
    }
  }, [showPromptDelay, promptTimeout]);

  // Hide event suggestions
  const hideEventSuggestions = useCallback(() => {
    console.log('👋 Hiding event suggestions');
    
    // Clear timeout if active
    if (promptTimeout) {
      clearTimeout(promptTimeout);
      setPromptTimeout(null);
    }
    
    setShowAutoEntryPrompt(false);
  }, [promptTimeout]);

  // Enter workout in event
  const enterWorkoutInEvent = useCallback(async (
    workout: NostrWorkout, 
    event: EligibleEvent
  ): Promise<EventAutoEntryResult> => {
    
    if (!user?.nsec) {
      throw new Error('User authentication required for event entry');
    }

    console.log(`🎯 Entering workout in event: ${event.eventName}`);

    try {
      const result = await EventEligibilityService.enterWorkoutInEvent(
        workout,
        event,
        user.nsec
      );

      console.log(`✅ Event entry result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;

    } catch (error) {
      console.error('❌ Event entry failed:', error);
      throw error;
    }
  }, [user?.nsec]);

  // Skip event suggestions
  const skipEventSuggestions = useCallback(() => {
    console.log('👋 User skipped event suggestions');
    hideEventSuggestions();
    
    // Could track user preferences here
    // e.g., remember that user prefers not to see suggestions for this workout type
  }, [hideEventSuggestions]);

  // Clear eligibility data
  const clearEligibilityData = useCallback(() => {
    console.log('🧹 Clearing eligibility data');
    setEligibilityResult(null);
    setCurrentWorkout(null);
    hideEventSuggestions();
  }, [hideEventSuggestions]);

  // Auto-check eligibility when workout changes (if enabled)
  useEffect(() => {
    if (autoCheck && currentWorkout) {
      checkWorkoutEligibility(currentWorkout);
    }
  }, [autoCheck, currentWorkout, checkWorkoutEligibility]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (promptTimeout) {
        clearTimeout(promptTimeout);
      }
    };
  }, [promptTimeout]);

  // Auto-show suggestions if eligible events found and user hasn't seen them yet
  useEffect(() => {
    if (
      eligibilityResult && 
      eligibilityResult.totalEligibleEvents > 0 && 
      currentWorkout &&
      !showAutoEntryPrompt &&
      autoCheck
    ) {
      console.log(`💡 Auto-showing suggestions for ${eligibilityResult.totalEligibleEvents} eligible events`);
      showEventSuggestions(currentWorkout);
    }
  }, [eligibilityResult, currentWorkout, showAutoEntryPrompt, autoCheck, showEventSuggestions]);

  return {
    // State
    isCheckingEligibility,
    eligibilityResult,
    suggestedEvents,
    bestMatch,
    showAutoEntryPrompt,
    
    // Actions
    checkWorkoutEligibility,
    showEventSuggestions,
    hideEventSuggestions,
    enterWorkoutInEvent,
    skipEventSuggestions,
    
    // Utilities
    hasEligibleEvents,
    totalEligibleEvents,
    clearEligibilityData,
  };
};