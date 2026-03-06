/**
 * useRunstrEventCreation - Form state and validation for event creation
 *
 * Manages form state, validation, and submission for the event creation modal.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  RunstrEventFormState,
  RunstrActivityType,
  RunstrScoringType,
  RunstrPayoutScheme,
  RunstrDuration,
  ValidationError,
} from '../types/runstrEvent';
import {
  DEFAULT_FORM_STATE,
  validateEventForm,
  getValidPayoutSchemes,
} from '../types/runstrEvent';
import {
  RunstrEventPublishService,
  EventPublishResult,
} from '../services/events/RunstrEventPublishService';
import UnifiedSigningService from '../services/auth/UnifiedSigningService';

export interface UseRunstrEventCreationReturn {
  // Form state
  form: RunstrEventFormState;
  updateField: <K extends keyof RunstrEventFormState>(
    field: K,
    value: RunstrEventFormState[K]
  ) => void;
  resetForm: () => void;

  // Validation
  errors: ValidationError[];
  isValid: boolean;

  // Payout scheme options (filtered by scoring type)
  validPayoutSchemes: RunstrPayoutScheme[];

  // Submission
  isSubmitting: boolean;
  submitError: string | null;
  submitEvent: () => Promise<EventPublishResult>;

  // Helpers
  showDistanceInput: boolean;
  showDurationInput: boolean;
  showFixedPayoutInput: boolean;
}

export function useRunstrEventCreation(): UseRunstrEventCreationReturn {
  const [form, setForm] = useState<RunstrEventFormState>(DEFAULT_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Update single field
  const updateField = useCallback(
    <K extends keyof RunstrEventFormState>(
      field: K,
      value: RunstrEventFormState[K]
    ) => {
      setForm((prev) => {
        const updated = { ...prev, [field]: value };

        // Auto-adjust payout scheme if switching to participation (Complete)
        if (field === 'scoringType' && value === 'participation') {
          updated.payoutScheme = 'fixed_amount'; // Force fixed for Complete
        }
        // Auto-adjust if switching FROM participation to Speed/Distance
        if (field === 'scoringType' && value !== 'participation' && prev.payoutScheme === 'fixed_amount') {
          updated.payoutScheme = 'winner_takes_all'; // Default to Top 1
        }

        return updated;
      });
      setSubmitError(null);
    },
    []
  );

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM_STATE);
    setSubmitError(null);
  }, []);

  // Validation
  const errors = useMemo(() => validateEventForm(form), [form]);
  const isValid = errors.length === 0;

  // Valid payout schemes based on scoring type
  const validPayoutSchemes = useMemo(
    () => getValidPayoutSchemes(form.scoringType),
    [form.scoringType]
  );

  // Conditional field visibility
  const showDistanceInput = form.scoringType === 'fastest_time';
  const showDurationInput = form.scoringType === 'most_distance';
  const showFixedPayoutInput = form.payoutScheme === 'fixed_amount';

  // Submit event
  const submitEvent = useCallback(async (): Promise<EventPublishResult> => {
    if (!isValid) {
      const errorMsg = errors.map((e) => e.message).join(', ');
      return { success: false, error: errorMsg };
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get signer from UnifiedSigningService
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();

      if (!signer) {
        setSubmitError('Not authenticated');
        return { success: false, error: 'Not authenticated' };
      }

      // Build config from form state
      const config = RunstrEventPublishService.buildConfigFromForm(form);

      // Publish to Nostr
      const result = await RunstrEventPublishService.publishEvent(
        config,
        signer
      );

      if (!result.success) {
        setSubmitError(result.error || 'Failed to create event');
      }

      return result;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      setSubmitError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isValid, errors]);

  return {
    form,
    updateField,
    resetForm,
    errors,
    isValid,
    validPayoutSchemes,
    isSubmitting,
    submitError,
    submitEvent,
    showDistanceInput,
    showDurationInput,
    showFixedPayoutInput,
  };
}

// ============================================================================
// Preset helpers
// ============================================================================

export const ACTIVITY_OPTIONS: { value: RunstrActivityType; label: string }[] =
  [
    { value: 'running', label: 'Run' },
    { value: 'cycling', label: 'Cycle' },
    { value: 'walking', label: 'Walk' },
  ];

export const SCORING_OPTIONS: { value: RunstrScoringType; label: string }[] = [
  { value: 'fastest_time', label: 'Speed' },
  { value: 'most_distance', label: 'Distance' },
  { value: 'participation', label: 'Complete' },
];

export const DURATION_OPTIONS: { value: RunstrDuration; label: string }[] = [
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
];

export const PLEDGE_COST_OPTIONS = [
  { value: 0, label: 'Free' },
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 6, label: '6 days' },
  { value: 7, label: '7 days' },
];

export const PLEDGE_DESTINATION_OPTIONS = [
  { value: 'captain' as const, label: 'You (Captain)' },
  { value: 'charity' as const, label: 'Team' },
];

export const PAYOUT_OPTIONS: { value: RunstrPayoutScheme; label: string }[] = [
  { value: 'winner_takes_all', label: 'Top 1' },
  { value: 'top_3_split', label: 'Top 3' },
  { value: 'top_5_split', label: 'Top 5' },
  { value: 'fixed_amount', label: 'Fixed' },
];

export const DISTANCE_OPTIONS = [
  { label: '5K', value: '5' },
  { label: '10K', value: '10' },
  { label: '21K', value: '21.1' },
  { label: '42K', value: '42.2' },
];

// Impact Level tier options for event gating (donation-based)
export const IMPACT_TIER_OPTIONS = [
  { value: 'Supporter', level: 5, label: 'Supporter (5+)' },
  { value: 'Contributor', level: 10, label: 'Contributor (10+)' },
  { value: 'Champion', level: 20, label: 'Champion (20+)' },
  { value: 'Legend', level: 50, label: 'Legend (50+)' },
  { value: 'Philanthropist', level: 100, label: 'Philanthropist (100+)' },
] as const;

// @deprecated - Use IMPACT_TIER_OPTIONS instead
export const RANK_TIER_OPTIONS = [
  { value: 'New', score: 0.00001, label: 'New+' },
  { value: 'Known', score: 0.0001, label: 'Known+' },
  { value: 'Trusted', score: 0.001, label: 'Trusted+' },
  { value: 'Elite', score: 0.01, label: 'Elite' },
] as const;

export default useRunstrEventCreation;
