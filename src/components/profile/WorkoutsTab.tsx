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
      {/* Header with Tabs and Sync Button */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          {renderTabButton('public', 'Public')}
          {renderTabButton('all', 'All')}
        </View>
        <SyncDropdown
          userId={currentUserId}
          onSyncComplete={onWorkoutsSynced}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
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