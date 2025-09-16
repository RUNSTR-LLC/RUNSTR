/**
 * PrivacyPolicyScreen - Privacy policy and data handling information
 * Explains how RUNSTR handles user data in a Nostr-native context
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
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

export const PrivacyPolicyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const lastUpdated = 'January 2025';
  const version = '1.0';

  const policySections = [
    {
      title: '1. Information We Collect',
      content: `RUNSTR operates on the Nostr protocol, which means most of your data is public by design. We collect:

• Nostr Public Data: Your profile (kind 0 events), workouts (kind 1301 events), team memberships, and competition entries are all public on the Nostr network.

• Local Storage Only: Your nsec (private key) and app preferences are stored locally on your device - we never have access to these.

• HealthKit Data (iOS): With your permission, we read workout data from Apple Health. This data is only used locally and shared to Nostr when you explicitly choose to post.

• No Server Collection: RUNSTR has no backend servers collecting your data. All data lives on the decentralized Nostr network or your device.`,
    },
    {
      title: '2. How We Use Information',
      content: `Your information powers the RUNSTR experience:

• Competition Scoring: Public workout events (kind 1301) are used to calculate leaderboards and determine winners.

• Team Membership: Your npub (public key) identifies you as a team member for competition eligibility.

• Social Features: Posted workouts (kind 1) with achievement cards are shared publicly for community engagement.

• Local Preferences: Settings stored on your device customize your app experience.

• No Analytics: We don't use tracking pixels, analytics services, or collect usage statistics.`,
    },
    {
      title: '3. Data Ownership & Control',
      content: `You own your data on RUNSTR:

• Nostr Sovereignty: Your Nostr identity (nsec/npub) is yours alone. You can use it across any Nostr app.

• Data Portability: All your workouts, team memberships, and achievements can be accessed from any Nostr client.

• Local Deletion: You can clear local app data anytime through device settings.

• Nostr Immutability: Published Nostr events cannot be deleted but can be superseded by newer events.

• Relay Choice: You control which Nostr relays store your data through your Nostr client settings.`,
    },
    {
      title: '4. Bitcoin & Financial Privacy',
      content: `RUNSTR integrates Bitcoin responsibly:

• Non-Custodial: We never hold your Bitcoin. All funds remain in your control via NutZap eCash.

• Lightning Privacy: Lightning Network transactions provide enhanced privacy over on-chain Bitcoin.

• Public Prizes: Competition winnings are announced publicly as Nostr events for transparency.

• No Financial Data: We don't store credit cards, bank accounts, or payment methods.

• eCash Privacy: NutZap provides additional privacy through eCash tokens.`,
    },
    {
      title: '5. Data Security',
      content: `We protect your information through:

• Local Encryption: Your nsec is encrypted in device storage using platform security features.

• No Cloud Storage: Without servers, there's no central database to breach.

• TLS Connections: All relay connections use encrypted protocols.

• Open Source: Our code is auditable for security verification.

• Key Management: We encourage best practices for nsec security and never ask for your private key outside the app.`,
    },
    {
      title: '6. Third-Party Services',
      content: `RUNSTR interacts with:

• Nostr Relays: Public relays (Damus, Primal, nos.lol) store and distribute Nostr events.

• Apple HealthKit: iOS fitness data access (read-only, with your permission).

• CoinOS API: Lightning Network payments (no personal data shared).

• No Ad Networks: We don't use advertising or marketing services.

• No Analytics: We don't use Google Analytics, Firebase, or similar services.`,
    },
    {
      title: '7. Children\'s Privacy',
      content: `RUNSTR is designed for users 13 and older:

• Age Requirement: Users must be 13+ to use RUNSTR per Nostr community standards.

• No Child-Specific Features: We don't knowingly collect data from children under 13.

• Parental Controls: Parents should monitor their children's Nostr usage.`,
    },
    {
      title: '8. Your Rights',
      content: `You have complete control over your data:

• Access: View all your public Nostr data through any compatible client.

• Correction: Update your profile and data by publishing new Nostr events.

• Portability: Export your nsec and use it with any Nostr application.

• Local Deletion: Remove app data from your device at any time.

• Relay Selection: Choose which relays store your events.`,
    },
    {
      title: '9. Changes to This Policy',
      content: `We may update this privacy policy:

• Notification: Significant changes will be announced via in-app notifications.

• Version History: Each update includes a version number and date.

• User Consent: Continued use after changes indicates acceptance.

• Transparency: All changes are documented in our open-source repository.`,
    },
    {
      title: '10. Contact Information',
      content: `For privacy concerns or questions:

• In-App Support: Use Help & Support > Contact Support

• Nostr DM: Message our team npub (coming soon)

• Community: Join RUNSTR discussions on Nostr

• Open Source: File privacy issues on our GitHub repository`,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
            RUNSTR is committed to protecting your privacy while delivering a decentralized
            fitness experience. This policy explains how we handle information in a
            Nostr-native, server-free environment.
          </Text>
        </Card>

        {/* Policy Sections */}
        {policySections.map((section, index) => (
          <PolicySection key={index} title={section.title} content={section.content} />
        ))}

        {/* Footer */}
        <Card style={styles.footerCard}>
          <Text style={styles.footerTitle}>Decentralized by Design</Text>
          <Text style={styles.footerText}>
            RUNSTR operates without traditional servers, placing you in complete control of
            your data. Your fitness journey lives on the open Nostr protocol, ensuring true
            data ownership and portability.
          </Text>
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
  footerCard: {
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});