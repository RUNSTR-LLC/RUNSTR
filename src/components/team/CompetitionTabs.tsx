/**
 * CompetitionTabs - Tab navigation component for Tournament and Events
 * Provides a clean 2-tab interface for team competitions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { theme } from '../../styles/theme';

export type CompetitionTab = 'tournament' | 'events';

interface CompetitionTabsProps {
  tournamentContent: React.ReactNode;
  eventsContent: React.ReactNode;
  defaultTab?: CompetitionTab;
  onTabChange?: (tab: CompetitionTab) => void;
}

export const CompetitionTabs: React.FC<CompetitionTabsProps> = ({
  tournamentContent,
  eventsContent,
  defaultTab = 'tournament',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<CompetitionTab>(defaultTab);

  const handleTabPress = (tab: CompetitionTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <View style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'tournament' && styles.activeTab,
          ]}
          onPress={() => handleTabPress('tournament')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'tournament' && styles.activeTabText,
            ]}
          >
            Tournament
          </Text>
          {activeTab === 'tournament' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'events' && styles.activeTab,
          ]}
          onPress={() => handleTabPress('events')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'events' && styles.activeTabText,
            ]}
          >
            Events
          </Text>
          {activeTab === 'events' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'tournament' ? tournamentContent : eventsContent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: theme.colors.background,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.text,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 30,
    height: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: 1,
  },
  tabContent: {
    flex: 1,
  },
});

export default CompetitionTabs;