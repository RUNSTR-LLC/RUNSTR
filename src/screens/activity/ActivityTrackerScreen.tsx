/**
 * ActivityTrackerScreen - Main activity tracking interface
 * Provides tabs for running, walking, cycling, and manual workout entry
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { RunningTrackerScreen } from './RunningTrackerScreen';
import { WalkingTrackerScreen } from './WalkingTrackerScreen';
import { CyclingTrackerScreen } from './CyclingTrackerScreen';
import { ManualWorkoutScreen } from './ManualWorkoutScreen';

type ActivityTab = 'run' | 'walk' | 'cycle' | 'manual';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onPress, icon }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTabButton]}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={24}
      color={isActive ? theme.colors.text : theme.colors.textMuted}
    />
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const ActivityTrackerScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActivityTab>('run');

  const renderContent = () => {
    switch (activeTab) {
      case 'run':
        return <RunningTrackerScreen />;
      case 'walk':
        return <WalkingTrackerScreen />;
      case 'cycle':
        return <CyclingTrackerScreen />;
      case 'manual':
        return <ManualWorkoutScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <View style={styles.tabContainer}>
        <TabButton
          label="Run"
          isActive={activeTab === 'run'}
          onPress={() => setActiveTab('run')}
          icon="body"
        />
        <TabButton
          label="Walk"
          isActive={activeTab === 'walk'}
          onPress={() => setActiveTab('walk')}
          icon="walk"
        />
        <TabButton
          label="Cycle"
          isActive={activeTab === 'cycle'}
          onPress={() => setActiveTab('cycle')}
          icon="bicycle"
        />
        <TabButton
          label="Manual"
          isActive={activeTab === 'manual'}
          onPress={() => setActiveTab('manual')}
          icon="create"
        />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  activeTabButton: {
    backgroundColor: theme.colors.border,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  activeTabLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});