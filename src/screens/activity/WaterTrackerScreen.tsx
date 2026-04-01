/**
 * WaterTrackerScreen - Daily water intake tracker
 * Track water consumption with quick-add buttons and daily goal progress
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { CustomAlert } from '../../components/ui/CustomAlert';

interface WaterEntry {
  id: string;
  amount: number; // in ml
  timestamp: string; // ISO
  notes?: string;
}

const WATER_LOG_KEY_PREFIX = '@runstr:water_log_';

const getDateKey = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const getStorageKey = (date: Date = new Date()): string => {
  return `${WATER_LOG_KEY_PREFIX}${getDateKey(date)}`;
};

export const WaterTrackerScreen: React.FC = () => {
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [totalToday, setTotalToday] = useState<number>(0);
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  // Load data on mount
  useEffect(() => {
    loadDailyGoal();
    loadTodayEntries();
  }, []);

  const loadDailyGoal = async () => {
    try {
      const goal = await LocalWorkoutStorageService.getWaterDailyGoal();
      setDailyGoal(goal);
    } catch (error) {
      console.error('[WaterTracker] Failed to load daily goal:', error);
    }
  };

  const loadTodayEntries = async () => {
    try {
      const key = getStorageKey();
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed: WaterEntry[] = JSON.parse(data);
        setEntries(parsed);
        const total = parsed.reduce((sum, entry) => sum + entry.amount, 0);
        setTotalToday(total);
      } else {
        setEntries([]);
        setTotalToday(0);
      }
    } catch (error) {
      console.error('[WaterTracker] Failed to load today entries:', error);
    }
  };

  const saveEntry = async (amount: number, notes?: string) => {
    try {
      const newEntry: WaterEntry = {
        id: `water_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        amount,
        timestamp: new Date().toISOString(),
        notes,
      };

      const updatedEntries = [...entries, newEntry];
      const key = getStorageKey();
      await AsyncStorage.setItem(key, JSON.stringify(updatedEntries));

      setEntries(updatedEntries);
      setTotalToday(totalToday + amount);

      console.log(`[WaterTracker] Added ${amount}ml`);
    } catch (error) {
      console.error('[WaterTracker] Failed to save entry:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to save water entry. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const handleQuickAdd = (amount: number) => {
    saveEntry(amount);
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setAlertConfig({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount in milliliters.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
      return;
    }
    saveEntry(amount);
    setCustomAmount('');
    setShowCustomInput(false);
  };

  const handleSetGoal = async () => {
    const goal = parseInt(newGoal, 10);
    if (isNaN(goal) || goal <= 0) {
      setAlertConfig({
        title: 'Invalid Goal',
        message: 'Please enter a valid daily goal in milliliters.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
      return;
    }

    try {
      await LocalWorkoutStorageService.setWaterDailyGoal(goal);
      setDailyGoal(goal);
      setNewGoal('');
      setShowGoalInput(false);
    } catch (error) {
      console.error('[WaterTracker] Failed to set goal:', error);
    }
  };

  const removeLastEntry = async () => {
    if (entries.length === 0) return;

    try {
      const updatedEntries = entries.slice(0, -1);
      const key = getStorageKey();
      await AsyncStorage.setItem(key, JSON.stringify(updatedEntries));

      const lastEntry = entries[entries.length - 1];
      setEntries(updatedEntries);
      setTotalToday(totalToday - lastEntry.amount);

      console.log(`[WaterTracker] Removed last entry (${lastEntry.amount}ml)`);
    } catch (error) {
      console.error('[WaterTracker] Failed to remove entry:', error);
    }
  };

  const progressPercent = Math.min((totalToday / dailyGoal) * 100, 100);
  const isGoalReached = totalToday >= dailyGoal;

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header Icon */}
      <View style={styles.iconContainer}>
        <Ionicons
          name="water"
          size={64}
          color={isGoalReached ? theme.colors.orangeBright : theme.colors.text}
        />
      </View>

      <Text style={styles.title}>Water Intake</Text>
      <Text style={styles.subtitle}>Stay hydrated throughout the day</Text>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Today's Progress</Text>
          <TouchableOpacity onPress={() => setShowGoalInput(true)}>
            <Text style={styles.goalText}>Goal: {dailyGoal}ml</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isGoalReached
                  ? theme.colors.orangeBright
                  : theme.colors.text,
              },
            ]}
          />
        </View>

        {/* Total Display */}
        <View style={styles.totalContainer}>
          <Text
            style={[
              styles.totalAmount,
              isGoalReached && styles.totalAmountComplete,
            ]}
          >
            {totalToday}ml
          </Text>
          <Text style={styles.totalGoal}>/ {dailyGoal}ml</Text>
        </View>

        {isGoalReached && (
          <View style={styles.goalReachedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={theme.colors.orangeBright}
            />
            <Text style={styles.goalReachedText}>Daily Goal Reached!</Text>
          </View>
        )}
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick Add</Text>
        <View style={styles.quickAddGrid}>
          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={() => handleQuickAdd(250)}
          >
            <Ionicons name="water-outline" size={24} color={theme.colors.text} />
            <Text style={styles.quickAddText}>+250ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={() => handleQuickAdd(500)}
          >
            <Ionicons name="water" size={24} color={theme.colors.text} />
            <Text style={styles.quickAddText}>+500ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={() => handleQuickAdd(750)}
          >
            <Ionicons name="beaker-outline" size={24} color={theme.colors.text} />
            <Text style={styles.quickAddText}>+750ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAddButton, styles.customButton]}
            onPress={() => setShowCustomInput(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.text} />
            <Text style={styles.quickAddText}>Custom</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Undo Button */}
      {entries.length > 0 && (
        <TouchableOpacity style={styles.undoButton} onPress={removeLastEntry}>
          <Ionicons name="arrow-undo" size={18} color={theme.colors.textMuted} />
          <Text style={styles.undoText}>Undo last entry</Text>
        </TouchableOpacity>
      )}

      {/* Today's Log */}
      {entries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Today's Log</Text>
          <View style={styles.logContainer}>
            {entries
              .slice()
              .reverse()
              .map((entry) => (
                <View key={entry.id} style={styles.logEntry}>
                  <Ionicons
                    name="water-outline"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                  <Text style={styles.logAmount}>{entry.amount}ml</Text>
                  <Text style={styles.logTime}>{formatTime(entry.timestamp)}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Hint box */}
      <View style={styles.hintBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={theme.colors.textMuted}
        />
        <Text style={styles.hintText}>
          Recommended daily water intake is 2000-3000ml. Tap the quick add
          buttons or enter a custom amount to track your hydration.
        </Text>
      </View>

      {/* Custom Amount Modal */}
      <Modal visible={showCustomInput} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Custom Amount</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount in ml"
              placeholderTextColor={theme.colors.textMuted}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomAmount('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCustomAdd}
              >
                <Text style={styles.modalConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Goal Modal */}
      <Modal visible={showGoalInput} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Goal in ml (e.g., 2000)"
              placeholderTextColor={theme.colors.textMuted}
              value={newGoal}
              onChangeText={setNewGoal}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowGoalInput(false);
                  setNewGoal('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSetGoal}
              >
                <Text style={styles.modalConfirmText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  iconContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goalText: {
    fontSize: 14,
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.medium,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  totalAmountComplete: {
    color: theme.colors.orangeBright,
  },
  totalGoal: {
    fontSize: 20,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  goalReachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  goalReachedText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  customButton: {
    borderStyle: 'dashed',
  },
  quickAddText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  undoText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  logContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    maxHeight: 200,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logAmount: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  hintBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 'auto',
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    color: theme.colors.text,
    fontSize: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
});
