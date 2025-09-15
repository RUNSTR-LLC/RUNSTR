/**
 * PersonalWalletInfoStep - Information about personal wallet system
 * Replaces team wallet setup - explains captain's personal wallet usage
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { TeamCreationStepProps } from '../../../types';
import { Ionicons } from '@expo/vector-icons';

export const PersonalWalletInfoStep: React.FC<TeamCreationStepProps> = ({
  data,
  onDataChange,
}) => {
  // Mark wallet step as complete automatically
  React.useEffect(() => {
    if (!data.walletCreated) {
      onDataChange({
        walletCreated: true,
        walletTeamId: 'personal', // No team wallet needed
        walletAddress: 'personal', // Captain uses personal wallet
      });
    }
  }, [data.walletCreated, onDataChange]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoContainer}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="wallet" size={48} color={theme.colors.accent} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Personal Wallet System</Text>
        <Text style={styles.subtitle}>
          No team wallet needed - you'll use your personal NutZap wallet
        </Text>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.statusConnected} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Your Wallet, Your Control</Text>
              <Text style={styles.benefitText}>
                As team captain, you'll send rewards directly from your personal wallet
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.statusConnected} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Instant P2P Payments</Text>
              <Text style={styles.benefitText}>
                Send NutZaps directly to team members - no middleman or fees
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.statusConnected} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Automatic Wallet Creation</Text>
              <Text style={styles.benefitText}>
                Your NutZap wallet was created when you logged in - it's ready to use
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.statusConnected} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Lightning Compatible</Text>
              <Text style={styles.benefitText}>
                Deposit and withdraw using Lightning Network for instant transfers
              </Text>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.colors.textMuted} />
          <Text style={styles.infoText}>
            Team members will receive rewards directly to their personal wallets. No complex team wallet management required!
          </Text>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.sectionTitle}>After Creating Your Team</Text>
          <View style={styles.nextStep}>
            <Text style={styles.nextStepNumber}>1</Text>
            <Text style={styles.nextStepText}>
              Fund your personal wallet with sats for rewards
            </Text>
          </View>
          <View style={styles.nextStep}>
            <Text style={styles.nextStepNumber}>2</Text>
            <Text style={styles.nextStepText}>
              Create competitions and challenges for your team
            </Text>
          </View>
          <View style={styles.nextStep}>
            <Text style={styles.nextStepNumber}>3</Text>
            <Text style={styles.nextStepText}>
              Send rewards directly to winning members
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
  },

  infoContainer: {
    flex: 1,
    alignItems: 'center',
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },

  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },

  benefitsSection: {
    width: '100%',
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 16,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },

  benefitContent: {
    flex: 1,
  },

  benefitTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  benefitText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  nextStepsSection: {
    width: '100%',
  },

  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },

  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.cardBackground,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    textAlign: 'center',
    lineHeight: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});