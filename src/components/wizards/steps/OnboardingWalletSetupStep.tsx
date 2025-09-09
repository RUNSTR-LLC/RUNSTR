/**
 * OnboardingWalletSetupStep - Simple wallet setup for onboarding flow
 * Creates a personal Bitcoin wallet through CoinOS integration
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../../styles/theme';

interface OnboardingWalletSetupStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingWalletSetupStep: React.FC<
  OnboardingWalletSetupStepProps
> = ({ onNext, onSkip }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Your Bitcoin Wallet</Text>
        <Text style={styles.subtitle}>
          Set up your personal wallet to receive Bitcoin rewards from challenges
          and competitions.
        </Text>
      </View>

      <View style={styles.providerInfo}>
        <View style={styles.providerLogo}>
          <Text style={styles.providerLogoText}>₿</Text>
        </View>
        <Text style={styles.providerName}>CoinOS Wallet</Text>
        <Text style={styles.providerDescription}>
          Secure bitcoin wallet with Lightning Network support for instant,
          low-cost payments
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⚡</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Lightning Network</Text>
            <Text style={styles.featureDescription}>
              Instant Bitcoin payments with minimal fees
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🔒</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Secure Storage</Text>
            <Text style={styles.featureDescription}>
              Industry-standard security for your funds
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>💰</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Automatic Rewards</Text>
            <Text style={styles.featureDescription}>
              Receive Bitcoin directly from competitions
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.createButton} onPress={onNext}>
          <Text style={styles.createButtonText}>Create Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Set Up Later</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        Your wallet will be created securely and linked to your account. You can
        manage it from your profile anytime.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  providerInfo: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },

  providerLogo: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.syncBackground,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  providerLogoText: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  providerName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  providerDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  features: {
    marginBottom: 32,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 8,
  },

  featureIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },

  featureText: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  featureDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  actions: {
    marginBottom: 24,
    gap: 12,
  },

  createButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },

  createButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },

  skipButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
