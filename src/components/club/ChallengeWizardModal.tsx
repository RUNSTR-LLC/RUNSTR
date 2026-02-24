/**
 * ChallengeWizardModal - 3-step bottom sheet for creating 1v1 challenges
 *
 * Step 1: Pick challenge type (Fastest 5K, 10K, Daily Streak, etc.)
 * Step 2: Pick duration (24 Hours, 3 Days, 1 Week)
 * Step 3: Confirm and send
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChallengeType =
  | 'fastest_5k'
  | 'fastest_10k'
  | 'daily_streak'
  | 'most_distance'
  | 'most_steps';

export type DurationDays = 1 | 3 | 7;

interface ChallengeWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (type: ChallengeType, durationDays: DurationDays) => void;
  opponentName: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

interface ChallengeOption {
  type: ChallengeType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CHALLENGE_OPTIONS: ChallengeOption[] = [
  { type: 'fastest_5k', label: 'Fastest 5K', icon: 'speedometer-outline' },
  { type: 'fastest_10k', label: 'Fastest 10K', icon: 'speedometer-outline' },
  { type: 'daily_streak', label: 'Daily Streak', icon: 'flame-outline' },
  { type: 'most_distance', label: 'Most Distance', icon: 'map-outline' },
  { type: 'most_steps', label: 'Most Steps', icon: 'footsteps-outline' },
];

interface DurationOption {
  days: DurationDays;
  label: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { days: 1, label: '24 Hours' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelForType(type: ChallengeType): string {
  const match = CHALLENGE_OPTIONS.find((o) => o.type === type);
  return match?.label ?? type;
}

function labelForDuration(days: DurationDays): string {
  const match = DURATION_OPTIONS.find((o) => o.days === days);
  return match?.label ?? `${days} Days`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChallengeWizardModal: React.FC<ChallengeWizardModalProps> = ({
  visible,
  onClose,
  onSend,
  opponentName,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationDays | null>(null);

  // Reset state every time modal closes
  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedType(null);
    setSelectedDuration(null);
    onClose();
  }, [onClose]);

  const handleSelectType = useCallback((type: ChallengeType) => {
    setSelectedType(type);
    setStep(2);
  }, []);

  const handleSelectDuration = useCallback((days: DurationDays) => {
    setSelectedDuration(days);
    setStep(3);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  }, [step]);

  const handleSend = useCallback(() => {
    if (selectedType && selectedDuration) {
      onSend(selectedType, selectedDuration);
      handleClose();
    }
  }, [selectedType, selectedDuration, onSend, handleClose]);

  // -------------------------------------------------------------------
  // Step renderers
  // -------------------------------------------------------------------

  const renderStep1 = () => (
    <View>
      <Text style={styles.heading}>
        Challenge {opponentName} to…
      </Text>

      {CHALLENGE_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.type}
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => handleSelectType(option.type)}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name={option.icon}
              size={22}
              color={theme.colors.accent}
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>{option.label}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.accent}
          />
        </TouchableOpacity>
        <Text style={styles.heading}>How long?</Text>
        <View style={{ width: 24 }} />
      </View>

      {DURATION_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.days}
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => handleSelectDuration(option.days)}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name="time-outline"
              size={22}
              color={theme.colors.accent}
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>{option.label}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.accent}
          />
        </TouchableOpacity>
        <Text style={styles.heading}>Confirm Challenge</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.confirmCard}>
        <Ionicons
          name="flash"
          size={32}
          color={theme.colors.accent}
          style={styles.confirmIcon}
        />
        <Text style={styles.confirmType}>
          {selectedType ? labelForType(selectedType) : ''}
        </Text>
        <Text style={styles.confirmDetail}>
          vs {opponentName}
        </Text>
        <Text style={styles.confirmDetail}>
          {selectedDuration ? labelForDuration(selectedDuration) : ''}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.sendButton}
        activeOpacity={0.8}
        onPress={handleSend}
      >
        <Ionicons
          name="send"
          size={18}
          color={theme.colors.accentText}
          style={styles.sendIcon}
        />
        <Text style={styles.sendButtonText}>Send Challenge</Text>
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <SafeAreaView>
            {/* Drag handle */}
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: theme.borderRadius.large,
    borderTopRightRadius: theme.borderRadius.large,
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },

  // Header
  heading: {
    fontSize: theme.typography.teamName,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },

  // Selectable rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: theme.spacing.xl,
  },
  rowLabel: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Step 3 confirmation
  confirmCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xxl,
  },
  confirmIcon: {
    marginBottom: theme.spacing.lg,
  },
  confirmType: {
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  confirmDetail: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  // Send button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.large,
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  sendIcon: {
    marginRight: theme.spacing.lg,
  },
  sendButtonText: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
  },
});

export default ChallengeWizardModal;
