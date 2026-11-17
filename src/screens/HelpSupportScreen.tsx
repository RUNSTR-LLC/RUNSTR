/**
 * HelpSupportScreen - FAQ and help documentation
 * Short FAQ for the four basics: sign in, track, history, agent sharing
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
      title: 'Getting started',
      content: `Tap Start and RUNSTR creates a Nostr key for you on this phone. There is no email or password.

Your key is the account. Back it up in Settings > Nostr Keys > Back up nsec. Without it you cannot sign in on a new phone.

Already have a Nostr account? Choose Advanced on the login screen and sign in with your nsec, or with Amber on Android.`,
    },
    {
      id: 'tracking',
      title: 'Tracking a run',
      content: `Press and hold Start Run. RUNSTR tracks distance, pace, and splits with GPS.

Pause and resume at any time. Tap the stop button to finish and save the run.

Voice announcements and distance units are in Settings > Fitness Tracking.`,
    },
    {
      id: 'publishing',
      title: 'Where my runs go',
      content: `Every run is saved on this phone first.

When a run finishes, RUNSTR publishes it to Nostr as a workout note (kind 1301). Published runs are public, and other Nostr apps such as Amethyst, POWR, and Chachi can show them.

To keep new runs on this phone only, turn off Settings > Nostr > Publish runs to Nostr. You can still publish any run later from History.`,
    },
    {
      id: 'backup',
      title: 'Backup and a new phone',
      content: `RUNSTR keeps an encrypted backup of your runs on Nostr. Only your key can read it. It updates a few minutes after each run.

On a new phone, sign in with the same nsec and your runs restore automatically. Amber users can restore from Settings > Data & Backup > Import Data.`,
    },
    {
      id: 'health',
      title: 'Apple Health and Health Connect',
      content: `Turn on Settings > Fitness Tracking > Sync Workouts to import runs from Apple Health (iOS) or Health Connect (Android).

Runs import when you open RUNSTR.`,
    },
    {
      id: 'agent',
      title: 'Sharing runs with an AI agent',
      content: `Settings > Nostr Keys > Share runs with your AI agent copies a prompt with your npub, your public Nostr ID.

Paste it into your agent. It reads the runs you have published, using the runstr-fitness skill. Your nsec is never part of this.`,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: `A run did not publish: open History and tap Publish to Nostr on that run.

Cannot sign in: check that your key starts with "nsec1" and has no spaces.

Runs missing after reinstalling: sign in with the same nsec. The restore runs once, in the background, right after you sign in.`,
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
          How RUNSTR works
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

        <Text style={styles.footerText}>
          Found a bug? Report it at github.com/RUNSTR-LLC/RUNSTR
        </Text>

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
  footerText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 20,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
