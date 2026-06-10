/**
 * HelpSupportScreen - FAQ and help documentation
 * Provides in-app help without external redirects
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Card } from '../components/ui/Card';

interface HelpSectionProps {
  title: string;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const HelpSection: React.FC<HelpSectionProps> = ({
  title,
  content,
  isExpanded,
  onToggle,
}) => (
  <Card style={styles.sectionCard}>
    <TouchableOpacity onPress={onToggle} style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
    {isExpanded && (
      <View style={styles.sectionContent}>
        <Text style={styles.contentText}>{content}</Text>
      </View>
    )}
  </Card>
);

export const HelpSupportScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: `Welcome to RUNSTR! Here's how to get started:

• Nostr Login: Use your nsec (private key) to sign in. Your nsec starts with "nsec1" and should be kept private.
• Profile Import: Your profile and workout history automatically import from Nostr events.
• Understanding Keys: Your npub (public key) is like your username - safe to share. Your nsec is your password - never share it!
• First Steps: Join a team from the Teams tab to start competing and earning Bitcoin.`,
    },
    {
      id: 'teams',
      title: 'Teams & Membership',
      content: `Teams are the heart of RUNSTR competitions:

• Joining Teams: Browse available teams in the Teams tab. Tap a team to view details, then "Join Team" to request membership.
• Two-Tier System: You'll get instant local access while your join request is sent to the captain for approval.
• Captain Access: Team captains see a "👑 Dashboard" button for managing their team.
• Creating Teams: Tap the "+" button in Teams tab to create your own team and become a captain.
• Membership: View your current team in Profile > Account tab.`,
    },
    {
      id: 'workouts',
      title: 'Workouts & Competitions',
      content: `Track and share your fitness journey:

• HealthKit Import: iOS users can automatically sync Apple Health workouts.
• Posting Workouts: Two options:
  - "Compete" enters your workout into active competitions and leaderboards
  - "Post" creates beautiful social cards for sharing on various platforms
• Entering Competitions: Join a team event or league, then post qualifying workouts during the competition period.
• Leaderboards: View real-time rankings based on the competition's scoring method (distance, duration, consistency, etc.)
• Workout History: Profile > Workouts tab shows your unified timeline.`,
    },
    {
      id: 'rewards',
      title: 'Sats & Rewards',
      content: `Earn sats through fitness:

• NutZap Wallet: Your built-in wallet for instant transactions.
• Prize Pools: Competition winners receive automatic sats distributions.
• Entry Fees: Some competitions require small satoshi entry fees.
• Sending/Receiving: Use the wallet buttons in your Profile to send or receive sats.
• Balance: Your current balance shows in the Profile wallet section.
• Withdrawals: Transfer to external wallets anytime.`,
    },
    {
      id: 'captain',
      title: 'Captain Features',
      content: `Lead your team to victory:

• Dashboard Access: Captain Dashboard button appears for team creators.
• Competition Wizards: Create Events (single day) or Leagues (multi-day) with:
  - 7 activity types (Running, Walking, Cycling, Strength, Meditation, Yoga, Diet)
  - Dynamic scoring options based on activity
  - Entry fees and prize pool configuration
• Member Management: Approve join requests, remove members, view team stats.
• Prize Distribution: Automatic Bitcoin rewards to competition winners.
• Team Wallet: Manage team funds for prizes and incentives.`,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      content: `Stay updated with your team:

• Team Notifications: Get alerts for new competitions, results, and team updates.
• Competition Alerts: "Starting Soon" reminders and result announcements.
• Preferences: Profile > Notifications tab to customize what you receive.
• Push Notifications: Enable in device settings for real-time updates.
• Nostr Events: Notifications are powered by Nostr events (kinds 1101-1103).`,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: `Common issues and solutions:

• Login Issues: Ensure your nsec starts with "nsec1" and has no spaces.
• Team Not Loading: Pull down to refresh in the Teams tab.
• Workout Not Syncing: Check Profile > Workouts and tap sync button.
• Can't Join Team: Ensure you're not already in another team.
• Missing Captain Button: Sign out and back in to refresh captain status.
• Payment Issues: Check your NutZap balance and network connection.
• App Crashes: Force quit and reopen. If persistent, reinstall the app.`,
    },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Find answers to common questions and learn how to use RUNSTR
        </Text>

        {helpSections.map((section) => (
          <HelpSection
            key={section.id}
            title={section.title}
            content={section.content}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}

        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            Our support team is here to assist you
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate('ContactSupport')}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  introText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contentText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  contactCard: {
    marginTop: 20,
    padding: 20,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semiBold,
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
});
