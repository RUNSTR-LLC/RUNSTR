/**
 * CompetitionTabs - Tab navigation component for League and Events
 * Provides a clean 2-tab interface for team competitions with enhanced styling
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

export type CompetitionTab = 'league' | 'events' | 'chat';

interface CompetitionTabsProps {
  leagueContent: React.ReactNode;
  eventsContent: React.ReactNode;
  chatContent?: React.ReactNode; // Optional chat content
  defaultTab?: CompetitionTab;
  onTabChange?: (tab: CompetitionTab) => void;
}

export const CompetitionTabs: React.FC<CompetitionTabsProps> = ({
  leagueContent,
  eventsContent,
  chatContent,
  defaultTab = 'league',
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
            activeTab === 'league' && styles.activeTab,
          ]}
          onPress={() => handleTabPress('league')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'league' && styles.activeTabText,
            ]}
          >
            League
          </Text>
          {activeTab === 'league' && <View style={styles.activeIndicator} />}
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

        {chatContent && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'chat' && styles.activeTab,
            ]}
            onPress={() => handleTabPress('chat')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'chat' && styles.activeTabText,
              ]}
            >
              Chat
            </Text>
            {activeTab === 'chat' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'league' && leagueContent}
        {activeTab === 'events' && eventsContent}
        {activeTab === 'chat' && chatContent}
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
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: theme.colors.text,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 40,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  tabContent: {
    flex: 1,
  },
});

export default CompetitionTabs;