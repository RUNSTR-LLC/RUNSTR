/**
 * PrivacyPolicyScreen - Privacy policy and data handling information
 * What RUNSTR keeps on the phone, what it publishes, what it never collects
 */

import React from 'react';
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

interface PolicySectionProps {
  title: string;
  content: string;
}

const PolicySection: React.FC<PolicySectionProps> = ({ title, content }) => (
  <Card style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionContent}>{content}</Text>
  </Card>
);

export const PrivacyPolicyScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const lastUpdated = 'November 2026';
  const version = '2.0';

  const policySections = [
    {
      title: '1. What stays on your phone',
      content: `• Your runs: every run is saved on this phone first.

• Your nsec: your Nostr private key is kept in the phone's secure storage. RUNSTR never sends it anywhere.

• Settings: your preferences stay on this phone.`,
    },
    {
      title: '2. What is public',
      content: `• Published runs: when a run is published, it becomes a public Nostr workout note (kind 1301). Anyone can read it, and other Nostr apps can show it.

• Your profile: your Nostr name and picture are public, like on any Nostr app.

• Turning it off: Settings > Nostr > Publish runs to Nostr. Runs then stay on this phone until you publish them yourself.

• Deleting: a published note is copied by relays and cannot be reliably removed once it is out.`,
    },
    {
      title: '3. Encrypted backup',
      content: `RUNSTR keeps a backup of your runs on Nostr relays. It is encrypted to your own key, so only someone with your nsec can read it. It lets you restore your runs on a new phone.`,
    },
    {
      title: '4. No RUNSTR server',
      content: `RUNSTR has no server and no account database. There are no analytics, ads, or tracking.

The app connects only to public Nostr relays (relay.damus.io, nos.lol, relay.primal.net) to publish runs, read your profile, and store the backup.`,
    },
    {
      title: '5. Apple Health and Health Connect',
      content: `With your permission, RUNSTR reads workouts from Apple Health (iOS) or Health Connect (Android) and saves them on this phone. Nothing from them is published unless you publish the run.`,
    },
    {
      title: '6. Location',
      content: `RUNSTR uses GPS only while you are tracking a run, to measure distance and pace. The route stays on this phone. Published runs include distance, time, pace, splits, and elevation, but not the GPS route.`,
    },
    {
      title: '7. AI agents',
      content: `Sharing runs with an AI agent copies your npub, your public Nostr ID. The agent can read only the runs you have published. Your nsec is never part of this.`,
    },
    {
      title: '8. Deleting your account',
      content: `Settings > Delete Account removes your nsec and all RUNSTR data from this phone. Runs already published to Nostr stay public.`,
    },
    {
      title: '9. Children',
      content: `RUNSTR is meant for people 13 and older.`,
    },
    {
      title: '10. Changes and contact',
      content: `Changes to this policy are listed with a new version and date above.

RUNSTR is open source. Questions and issues: github.com/RUNSTR-LLC/RUNSTR`,
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
        {/* Header Info */}
        <Card style={styles.headerCard}>
          <Text style={styles.headerCardTitle}>RUNSTR Privacy Policy</Text>
          <Text style={styles.headerCardSubtitle}>
            Version {version} • Last Updated: {lastUpdated}
          </Text>
          <Text style={styles.headerCardText}>
            This explains what RUNSTR keeps on your phone, what it publishes to
            Nostr, and what it never collects.
          </Text>
        </Card>

        {/* Policy Sections */}
        {policySections.map((section, index) => (
          <PolicySection
            key={index}
            title={section.title}
            content={section.content}
          />
        ))}


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
  headerCard: {
    marginBottom: 20,
    padding: 20,
  },
  headerCardTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  headerCardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  headerCardText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
