/**
 * Auto-Entry Prompt - Workout completion → Event suggestion UI
 * Provides seamless one-click event entry with competition preview
 * Integrates with existing workout posting flow and event eligibility system
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { theme } from '../../styles/theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import EventEligibilityService from '../../services/competition/eventEligibilityService';
import type { EligibleEvent, EventAutoEntryResult } from '../../services/competition/eventEligibilityService';
import type { NostrWorkout } from '../../types/nostrWorkout';

export interface AutoEntryPromptProps {
  visible: boolean;
  workout: NostrWorkout;
  userTeams: string[];
  userPrivateKey: string;
  onClose: () => void;
  onEntryComplete: (result: EventAutoEntryResult) => void;
  onSkip: () => void;
}

export const AutoEntryPrompt: React.FC<AutoEntryPromptProps> = ({
  visible,
  workout,
  userTeams,
  userPrivateKey,
  onClose,
  onEntryComplete,
  onSkip,
}) => {
  const [suggestedEvents, setSuggestedEvents] = useState<EligibleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EligibleEvent | null>(null);
  const fadeAnim = new Animated.Value(0);

  // Load suggested events when modal opens
  useEffect(() => {
    if (visible && workout) {
      loadSuggestedEvents();
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation
      fadeAnim.setValue(0);
    }
  }, [visible, workout]);

  const loadSuggestedEvents = async () => {
    if (!workout || !userTeams.length) return;

    setIsLoading(true);
    try {
      console.log(`🔍 Loading event suggestions for workout: ${workout.type}`);
      const events = await EventEligibilityService.getSuggestedEvents(workout, userTeams);
      setSuggestedEvents(events);
      console.log(`💡 Found ${events.length} suggested events`);
    } catch (error) {
      console.error('❌ Failed to load suggested events:', error);
      setSuggestedEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventSelect = (event: EligibleEvent) => {
    setSelectedEvent(event);
  };

  const handleQuickEntry = async (event: EligibleEvent) => {
    if (!userPrivateKey) {
      Alert.alert('Error', 'Authentication required for event entry');
      return;
    }

    setIsEntering(true);
    setSelectedEvent(event);

    try {
      console.log(`🎯 Quick entry for event: ${event.eventName}`);
      const result = await EventEligibilityService.enterWorkoutInEvent(
        workout,
        event,
        userPrivateKey
      );

      // Show result to user
      if (result.success) {
        Alert.alert(
          '🎉 Event Entry Successful!',
          result.requiresApproval 
            ? `Your entry to "${event.eventName}" is pending captain approval.`
            : `You're now competing in "${event.eventName}"!`,
          [{ text: 'Great!', onPress: () => onEntryComplete(result) }]
        );
      } else {
        Alert.alert('Entry Failed', result.message, [
          { text: 'OK', style: 'default' }
        ]);
      }

    } catch (error) {
      console.error('❌ Event entry failed:', error);
      Alert.alert('Error', 'Failed to enter event. Please try again.');
    } finally {
      setIsEntering(false);
      setSelectedEvent(null);
    }
  };

  const handleSkip = () => {
    console.log('👋 User skipped event suggestions');
    onSkip();
    onClose();
  };

  const formatWorkoutSummary = (workout: NostrWorkout): string => {
    const parts = [workout.type];
    if (workout.distance) parts.push(`${(workout.distance / 1000).toFixed(1)}km`);
    if (workout.duration) parts.push(`${workout.duration}min`);
    if (workout.calories) parts.push(`${workout.calories}cal`);
    return parts.join(' • ');
  };

  const getEligibilityBadge = (score: number) => {
    if (score >= 90) return { text: 'Perfect Match', color: theme.colors.success };
    if (score >= 70) return { text: 'Great Match', color: theme.colors.accent };
    if (score >= 50) return { text: 'Good Match', color: theme.colors.warning };
    return { text: 'Possible Match', color: theme.colors.textMuted };
  };

  const renderEventCard = (event: EligibleEvent) => {
    const isSelected = selectedEvent?.eventId === event.eventId;
    const isCurrentlyEntering = isEntering && isSelected;
    const eligibilityBadge = getEligibilityBadge(event.eligibilityScore);

    return (
      <TouchableOpacity
        key={event.eventId}
        style={[
          styles.eventCard,
          isSelected && styles.eventCardSelected,
          isCurrentlyEntering && styles.eventCardEntering,
        ]}
        onPress={() => handleEventSelect(event)}
        disabled={isEntering}
        activeOpacity={0.7}
      >
        <View style={styles.eventCardHeader}>
          <View style={styles.eventCardTitleRow}>
            <Text style={styles.eventCardTitle} numberOfLines={1}>
              {event.eventName}
            </Text>
            <View style={[styles.eligibilityBadge, { backgroundColor: eligibilityBadge.color + '20' }]}>
              <Text style={[styles.eligibilityBadgeText, { color: eligibilityBadge.color }]}>
                {eligibilityBadge.text}
              </Text>
            </View>
          </View>
          
          <Text style={styles.eventCardActivity}>
            {event.activityType} • {event.competitionType}
          </Text>
        </View>

        <View style={styles.eventCardDetails}>
          <Text style={styles.eventCardReason}>{event.matchReason}</Text>
          
          <View style={styles.eventCardMeta}>
            <Text style={styles.eventCardMetaText}>
              Ends {new Date(event.endDate).toLocaleDateString()}
            </Text>
            {event.entryFeeSats && event.entryFeeSats > 0 && (
              <Text style={styles.eventCardFee}>
                {event.entryFeeSats} sats
              </Text>
            )}
          </View>
        </View>

        <View style={styles.eventCardActions}>
          <Button
            title={isCurrentlyEntering ? 'Entering...' : 'Quick Entry'}
            variant="primary"
            size="small"
            onPress={() => handleQuickEntry(event)}
            loading={isCurrentlyEntering}
            disabled={isEntering}
            style={styles.quickEntryButton}
          />
          
          {event.requiresApproval && (
            <Text style={styles.approvalNote}>Requires captain approval</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Active Events</Text>
      <Text style={styles.emptyStateMessage}>
        Your teams don't have any active events that match this workout.
      </Text>
      <Button
        title="Got it"
        variant="outline"
        onPress={onClose}
        style={styles.emptyStateButton}
      />
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.modalTitle}>🎯 Event Suggestions</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.workoutSummary}>
                {formatWorkoutSummary(workout)}
              </Text>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.loadingState}>
                  <Text style={styles.loadingText}>Finding eligible events...</Text>
                </View>
              ) : suggestedEvents.length > 0 ? (
                <View style={styles.eventsContainer}>
                  <Text style={styles.suggestionsHeader}>
                    Found {suggestedEvents.length} eligible event{suggestedEvents.length !== 1 ? 's' : ''}
                  </Text>
                  {suggestedEvents.map(renderEventCard)}
                </View>
              ) : (
                renderEmptyState()
              )}
            </ScrollView>

            {/* Footer */}
            {suggestedEvents.length > 0 && (
              <View style={styles.modalFooter}>
                <Button
                  title="Maybe Later"
                  variant="outline"
                  onPress={handleSkip}
                  disabled={isEntering}
                  style={styles.skipButton}
                />
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    overflow: 'hidden',
  },

  modalContent: {
    flex: 1,
  },

  modalHeader: {
    padding: 20,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  closeButton: {
    padding: 4,
  },

  closeButtonText: {
    fontSize: 18,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  workoutSummary: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  scrollContent: {
    flex: 1,
  },

  loadingState: {
    padding: 40,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  eventsContainer: {
    padding: 20,
    gap: 16,
  },

  suggestionsHeader: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  eventCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },

  eventCardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '10',
  },

  eventCardEntering: {
    opacity: 0.7,
  },

  eventCardHeader: {
    gap: 4,
  },

  eventCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  eventCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  eligibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  eligibilityBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    textTransform: 'uppercase',
  },

  eventCardActivity: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  eventCardDetails: {
    gap: 8,
  },

  eventCardReason: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },

  eventCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  eventCardMetaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  eventCardFee: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },

  eventCardActions: {
    gap: 8,
  },

  quickEntryButton: {
    alignSelf: 'flex-start',
  },

  approvalNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  emptyStateButton: {
    alignSelf: 'center',
  },

  modalFooter: {
    padding: 20,
    backgroundColor: theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  skipButton: {
    alignSelf: 'center',
  },
});