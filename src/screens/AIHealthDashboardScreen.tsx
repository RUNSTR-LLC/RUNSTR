/**
 * AIHealthDashboardScreen
 *
 * Unified AI Health & Fitness Tracker dashboard.
 * Synthesizes Journal, Habits, Goals with conversational AI coaching.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { Card } from '../components/ui/Card';

// Journal components
import { JournalEntryCard } from '../components/journal/JournalEntryCard';
import { JournalEditorModal } from '../components/journal/JournalEditorModal';
import { JournalService } from '../services/journal/JournalService';
import type { JournalEntry } from '../types/journal';

// Habit components
import {
  getAllHabits,
  isCheckedInToday,
  checkInHabit,
  createHabit,
  deleteHabit,
  type Habit,
} from '../services/habits/HabitTrackerService';
import { HabitModal } from '../components/analytics/HabitModal';

// Chat components
import { ChatInterface } from '../components/coach/ChatInterface';
import { PPQAccountService } from '../services/ai/PPQAccountService';
import { PPQAPIKeyModal } from '../components/ai/PPQAPIKeyModal';
import { ModelManager } from '../services/ai/ModelManager';

const PPQ_API_KEY_STORAGE = '@runstr:ppq_api_key';

// Helper to get short model name for header display
const getShortModelName = (modelId: string): string => {
  const shortNames: Record<string, string> = {
    'claude-haiku-4.5': 'Haiku 4.5',
    'claude-sonnet-4': 'Sonnet 4',
    'claude-3-5-sonnet-20241022': 'Sonnet 3.5',
    'claude-3-haiku-20240307': 'Haiku 3',
  };
  return shortNames[modelId] || ModelManager.getModelName(modelId);
};

export const AIHealthDashboardScreen: React.FC = () => {
  const navigation = useNavigation();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Journal state
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [journalEditorVisible, setJournalEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Habits state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabitsToday, setCompletedHabitsToday] = useState(0);
  const [habitModalVisible, setHabitModalVisible] = useState(false);

  // View mode: 'snapshot' or 'chat'
  const [viewMode, setViewMode] = useState<'snapshot' | 'chat'>('snapshot');

  // Settings state
  const [showPPQModal, setShowPPQModal] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState<string>('claude-haiku-4.5');

  // Load data on initial mount
  useEffect(() => {
    loadData();
  }, []);

  // Refresh journal entry when screen gains focus (handles day change)
  useFocusEffect(
    useCallback(() => {
      const refreshJournalEntry = async () => {
        JournalService.clearCache(); // Ensure fresh data
        const entry = await JournalService.getTodayEntry();
        setTodayEntry(entry);
      };
      refreshJournalEntry();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load API key
      const storedKey = await AsyncStorage.getItem(PPQ_API_KEY_STORAGE);
      setApiKey(storedKey);

      // Load credit balance if key exists
      if (storedKey) {
        try {
          const result = await PPQAccountService.getBalance();
          if (result.success && result.balance !== undefined) {
            setCreditBalance(result.balance);
          }
        } catch (err) {
          console.log('[AIHealthDashboard] Balance check failed:', err);
        }
      }

      // Load today's journal entry
      const entry = await JournalService.getTodayEntry();
      setTodayEntry(entry);

      // Load habits
      const allHabits = await getAllHabits();
      setHabits(allHabits);
      const completed = allHabits.filter((h) => isCheckedInToday(h)).length;
      setCompletedHabitsToday(completed);

      // Load selected AI model
      const model = await ModelManager.getSelectedModel();
      setSelectedAIModel(model);
    } catch (error) {
      console.error('[AIHealthDashboard] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJournalSave = useCallback((entry: JournalEntry) => {
    setTodayEntry(entry);
    setEditingEntry(null);
  }, []);

  const openJournalEditor = useCallback((entry: JournalEntry | null) => {
    setEditingEntry(entry);
    setJournalEditorVisible(true);
  }, []);

  const handleHabitCheckIn = useCallback(async (habitId: string) => {
    try {
      await checkInHabit(habitId);
      // Reload habits
      const allHabits = await getAllHabits();
      setHabits(allHabits);
      const completed = allHabits.filter((h) => isCheckedInToday(h)).length;
      setCompletedHabitsToday(completed);
    } catch (error) {
      Alert.alert('Error', 'Failed to check in habit');
    }
  }, []);

  const handleCreateHabit = useCallback(async (
    name: string,
    type: 'abstinence' | 'positive',
    icon: string,
    color: string
  ) => {
    try {
      await createHabit(name, type, icon, color);
      // Reload habits
      const allHabits = await getAllHabits();
      setHabits(allHabits);
      const completed = allHabits.filter((h) => isCheckedInToday(h)).length;
      setCompletedHabitsToday(completed);
    } catch (error) {
      Alert.alert('Error', 'Failed to create habit');
    }
  }, []);

  const handleDeleteHabit = useCallback((habit: Habit) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This will remove all streak data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habit.id);
              // Reload habits
              const allHabits = await getAllHabits();
              setHabits(allHabits);
              const completed = allHabits.filter((h) => isCheckedInToday(h)).length;
              setCompletedHabitsToday(completed);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  }, []);

  const handleCreditWarning = useCallback(() => {
    Alert.alert(
      'Low Credits',
      'Your PPQ.AI credits are running low. Add more Bitcoin to continue using AI features.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Add Credits',
          onPress: () => setShowPPQModal(true),
        },
      ]
    );
  }, []);

  const handleModelSelect = useCallback(async (modelId: string) => {
    try {
      await ModelManager.setSelectedModel(modelId);
      setSelectedAIModel(modelId);
      setShowModelPicker(false);
    } catch (error) {
      console.error('Error setting AI model:', error);
      Alert.alert('Error', 'Failed to update AI model. Please try again.');
    }
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orangeBright} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        navigation={navigation}
        balance={apiKey ? creditBalance : undefined}
        modelName={apiKey ? getShortModelName(selectedAIModel) : undefined}
        onModelPress={apiKey ? () => setShowModelPicker(true) : undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBalancePress={apiKey ? () => setShowPPQModal(true) : undefined}
      />

      {viewMode === 'snapshot' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Today's Snapshot Section */}
          <Text style={styles.sectionTitle}>Today's Snapshot</Text>

          {/* Journal Card */}
          <Card style={styles.snapshotCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="book-outline" size={20} color={theme.colors.orangeBright} />
              <Text style={styles.cardTitle}>Journal</Text>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('JournalHistory')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.historyButton}
              >
                <Text style={styles.cardActionMuted}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openJournalEditor(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.cardAction}>+ New</Text>
              </TouchableOpacity>
            </View>
            {todayEntry ? (
              <JournalEntryCard
                entry={todayEntry}
                onPress={() => openJournalEditor(todayEntry)}
                compact
              />
            ) : (
              <TouchableOpacity
                style={styles.emptyJournal}
                onPress={() => openJournalEditor(null)}
              >
                <Text style={styles.emptyJournalText}>
                  Tap to write about your day...
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Habits Card */}
          <Card style={styles.snapshotCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkbox-outline" size={20} color={theme.colors.orangeBright} />
              <Text style={styles.cardTitle}>Habits</Text>
              <Text style={styles.habitProgress}>
                {completedHabitsToday}/{habits.length}
              </Text>
              <TouchableOpacity
                onPress={() => setHabitModalVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.cardAction}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {habits.length > 0 ? (
              <View style={styles.habitsGrid}>
                {habits.slice(0, 6).map((habit) => {
                  const isComplete = isCheckedInToday(habit);
                  return (
                    <TouchableOpacity
                      key={habit.id}
                      style={[
                        styles.habitChip,
                        isComplete && styles.habitChipComplete,
                      ]}
                      onPress={() => !isComplete && handleHabitCheckIn(habit.id)}
                      onLongPress={() => handleDeleteHabit(habit)}
                      delayLongPress={500}
                      activeOpacity={isComplete ? 1 : 0.7}
                    >
                      <Ionicons
                        name={(habit.icon as any) || 'checkmark'}
                        size={16}
                        color={isComplete ? '#000' : habit.color}
                      />
                      <Text
                        style={[
                          styles.habitChipText,
                          isComplete && styles.habitChipTextComplete,
                        ]}
                        numberOfLines={1}
                      >
                        {habit.name}
                      </Text>
                      {isComplete && (
                        <Ionicons name="checkmark" size={14} color="#000" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noDataText}>
                No habits tracked. Add habits in Experimental settings.
              </Text>
            )}
          </Card>

        </ScrollView>
      ) : !apiKey ? (
        // Chat View - No API key, show inline setup prompt
        <View style={styles.chatSetupContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.orangeBright} />
          <Text style={styles.chatSetupTitle}>AI Chat Requires Credits</Text>
          <Text style={styles.chatSetupText}>
            Set up a PPQ.AI account to chat with your AI coach. Journal and Habits are available without an account.
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => setShowPPQModal(true)}
          >
            <Text style={styles.setupButtonText}>Set Up AI Credits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Chat View - API key exists
        <View style={styles.chatContainer}>
          <ChatInterface
            apiKey={apiKey}
            focus="general"
            onCreditWarning={handleCreditWarning}
          />
        </View>
      )}

      {/* Journal Editor Modal */}
      <JournalEditorModal
        visible={journalEditorVisible}
        onClose={() => {
          setJournalEditorVisible(false);
          setEditingEntry(null);
        }}
        onSave={handleJournalSave}
        entry={editingEntry}
      />

      {/* Habit Modal */}
      <HabitModal
        visible={habitModalVisible}
        onClose={() => setHabitModalVisible(false)}
        onSave={handleCreateHabit}
      />

      {/* PPQ Account Modal */}
      <PPQAPIKeyModal
        visible={showPPQModal}
        onClose={() => setShowPPQModal(false)}
        onSuccess={() => {
          setShowPPQModal(false);
          loadData();
        }}
      />

      {/* AI Model Selection Modal */}
      <Modal
        visible={showModelPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View style={styles.modelPickerOverlay}>
          <View style={styles.modelPickerContainer}>
            <View style={styles.modelPickerHeader}>
              <Text style={styles.modelPickerTitle}>Select AI Model</Text>
              <TouchableOpacity
                onPress={() => setShowModelPicker(false)}
                style={styles.modelPickerCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modelList}>
              {ModelManager.getAvailableModels().map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelItem,
                    selectedAIModel === model.id && styles.modelItemSelected,
                  ]}
                  onPress={() => handleModelSelect(model.id)}
                >
                  <Text
                    style={[
                      styles.modelName,
                      selectedAIModel === model.id && styles.modelNameSelected,
                    ]}
                  >
                    {model.name}
                  </Text>
                  {selectedAIModel === model.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.orangeBright}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Header Component
interface HeaderProps {
  navigation: any;
  balance?: number | null;
  modelName?: string;
  onModelPress?: () => void;
  viewMode?: 'snapshot' | 'chat';
  onViewModeChange?: (mode: 'snapshot' | 'chat') => void;
  onBalancePress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  navigation,
  balance,
  modelName,
  onModelPress,
  viewMode,
  onViewModeChange,
  onBalancePress,
}) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={styles.backButton}
    >
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </TouchableOpacity>

    <View style={styles.headerCenter}>
      {viewMode && onViewModeChange ? (
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'snapshot' && styles.viewToggleButtonActive,
            ]}
            onPress={() => onViewModeChange('snapshot')}
          >
            <Text
              style={[
                styles.viewToggleText,
                viewMode === 'snapshot' && styles.viewToggleTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'chat' && styles.viewToggleButtonActive,
            ]}
            onPress={() => onViewModeChange('chat')}
          >
            <Text
              style={[
                styles.viewToggleText,
                viewMode === 'chat' && styles.viewToggleTextActive,
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.headerTitle}>RUNSTR AI</Text>
      )}
    </View>

    <View style={styles.headerRight}>
      {typeof balance === 'number' && onBalancePress && (
        <TouchableOpacity
          onPress={onBalancePress}
          style={styles.balanceBadge}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="flash" size={14} color={theme.colors.orangeBright} />
          <Text style={styles.balanceText}>${balance.toFixed(2)}</Text>
        </TouchableOpacity>
      )}
      {modelName && onModelPress && (
        <TouchableOpacity
          onPress={onModelPress}
          style={styles.modelBadge}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.modelText}>{modelName}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.semiBold,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.small,
  },
  viewToggleButtonActive: {
    backgroundColor: '#333',
  },
  viewToggleText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  viewToggleTextActive: {
    color: theme.colors.text,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  balanceText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  modelBadge: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  modelText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  headerSpacer: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    marginTop: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.semiBold,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xxxl,
  },
  setupButton: {
    backgroundColor: theme.colors.orangeDeep,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.xl,
  },
  setupButtonText: {
    color: '#000',
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xxl,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  snapshotCard: {
    marginBottom: theme.spacing.xxl,
    padding: theme.spacing.xxxl,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  cardTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
  },
  cardAction: {
    color: theme.colors.orangeBright,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  cardActionMuted: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  historyButton: {
    marginRight: theme.spacing.xl,
  },
  emptyJournal: {
    backgroundColor: '#1a1a1a',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.xxxl,
    minHeight: 120,
  },
  emptyJournalText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    fontStyle: 'italic',
  },
  habitProgress: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    backgroundColor: '#1a1a1a',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.xxl,
  },
  habitChipComplete: {
    backgroundColor: theme.colors.orangeBright,
  },
  habitChipText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    maxWidth: 120,
  },
  habitChipTextComplete: {
    color: '#000',
  },
  noDataText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  chatContainer: {
    flex: 1,
  },
  chatSetupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  chatSetupTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.semiBold,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  chatSetupText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xxxl,
  },
  // Model Picker Styles
  modelPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modelPickerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modelPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modelPickerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modelPickerCloseButton: {
    padding: 4,
  },
  modelList: {
    maxHeight: 400,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modelItemSelected: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
  },
  modelName: {
    fontSize: 16,
    color: theme.colors.text,
  },
  modelNameSelected: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
});

export default AIHealthDashboardScreen;
