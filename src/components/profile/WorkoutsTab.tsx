/**
 * WorkoutsTab Component - Public/All Tab Workout Display
 * Shows Public (Nostr) and All (merged sources) tabs with sync dropdown
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';
import { SyncSource, Workout } from '../../types';
import { PublicWorkoutsTab } from './tabs/PublicWorkoutsTab';
import { AllWorkoutsTab } from './tabs/AllWorkoutsTab';
import { SyncDropdown } from './shared/SyncDropdown';

interface WorkoutsTabProps {
  syncSources: SyncSource[];
  recentWorkouts: Workout[]; // Legacy prop - ignored in new architecture
  currentUserId: string;
  currentUserPubkey?: string;
  currentUserTeamId?: string;
  onSyncSourcePress: (provider: string) => void;
  onWorkoutsSynced?: () => void;
}

type TabType = 'public' | 'all';

export const WorkoutsTab: React.FC<WorkoutsTabProps> = ({
  syncSources,
  recentWorkouts, // Ignored in new architecture
  currentUserId,
  currentUserPubkey,
  currentUserTeamId,
  onSyncSourcePress,
  onWorkoutsSynced,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && styles.tabButtonActive,
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[
          styles.tabButtonText,
          activeTab === tab && styles.tabButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'public':
        return (
          <PublicWorkoutsTab
            userId={currentUserId}
            pubkey={currentUserPubkey}
            onRefresh={onWorkoutsSynced}
          />
        );
      case 'all':
        return (
          <AllWorkoutsTab
            userId={currentUserId}
            pubkey={currentUserPubkey}
            onRefresh={onWorkoutsSynced}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Import Workouts Button */}
      <View style={styles.importSection}>
        <SyncDropdown
          userId={currentUserId}
          onSyncComplete={onWorkoutsSynced}
        />
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabToggleContainer}>
        <View style={styles.tabToggle}>
          {renderTabButton('public', 'Public')}
          {renderTabButton('all', 'All')}
        </View>
      </View>

      {/* Active Tab Content */}
      <View style={styles.tabContent}>
        {renderActiveTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  importSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: theme.colors.accentText,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
});