/**
 * RoleSelectionStep - Choose between Member or Captain role during onboarding
 * Users select their role which determines their permissions and available features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../../../styles/theme';

interface RoleSelectionStepProps {
  onNext: (role: 'member' | 'captain') => void;
  onSkip?: () => void;
  selectedRole?: 'member' | 'captain';
}

export const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  onNext,
  onSkip,
  selectedRole: initialRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<'member' | 'captain' | null>(
    initialRole || null
  );

  const handleRoleSelect = (role: 'member' | 'captain') => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      onNext(selectedRole);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>
          Select how you want to participate in RUNSTR teams
        </Text>
      </View>

      <View style={styles.roleOptions}>
        {/* Member Role Option */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'member' && styles.roleCardSelected,
          ]}
          onPress={() => handleRoleSelect('member')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIcon}>
            <Text style={styles.roleEmoji}>🏃‍♂️</Text>
          </View>

          <View style={styles.roleContent}>
            <Text
              style={[
                styles.roleTitle,
                selectedRole === 'member' && styles.roleTitleSelected,
              ]}
            >
              I&apos;m a Member
            </Text>
            <Text style={styles.roleDescription}>
              Join existing teams and compete for Bitcoin rewards
            </Text>

            <View style={styles.roleFeatures}>
              <Text style={styles.featureItem}>
                • Join teams created by captains
              </Text>
              <Text style={styles.featureItem}>
                • Compete in team events and challenges
              </Text>
              <Text style={styles.featureItem}>
                • Earn Bitcoin rewards for workouts
              </Text>
              <Text style={styles.featureItem}>
                • Switch teams (with exit fees)
              </Text>
            </View>
          </View>

          {selectedRole === 'member' && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedIcon}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Captain Role Option */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'captain' && styles.roleCardSelected,
          ]}
          onPress={() => handleRoleSelect('captain')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIcon}>
            <Text style={styles.roleEmoji}>👑</Text>
          </View>

          <View style={styles.roleContent}>
            <Text
              style={[
                styles.roleTitle,
                selectedRole === 'captain' && styles.roleTitleSelected,
              ]}
            >
              I&apos;m a Captain
            </Text>
            <Text style={styles.roleDescription}>
              Create and manage your own team
            </Text>

            <View style={styles.roleFeatures}>
              <Text style={styles.featureItem}>
                • Create and manage your team
              </Text>
              <Text style={styles.featureItem}>
                • Set up events and challenges
              </Text>
              <Text style={styles.featureItem}>
                • Distribute Bitcoin rewards
              </Text>
              <Text style={styles.featureItem}>
                • Build your fitness community
              </Text>
            </View>
          </View>

          {selectedRole === 'captain' && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedIcon}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>💡 Good to know</Text>
        <Text style={styles.infoText}>
          You can change your role later, but captains who create teams cannot
          switch to member role while managing their team.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedRole && styles.continueButtonTextDisabled,
            ]}
          >
            Continue as{' '}
            {selectedRole === 'member'
              ? 'Member'
              : selectedRole === 'captain'
              ? 'Captain'
              : '...'}
          </Text>
        </TouchableOpacity>

        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: 20,
    paddingTop: 40,
    minHeight: '100%',
    justifyContent: 'space-between',
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  roleOptions: {
    flex: 1,
    gap: 16,
  },

  roleCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    minHeight: 180,
  },

  roleCardSelected: {
    borderColor: theme.colors.text,
    backgroundColor: '#1a1a1a', // Slightly lighter than default card
  },

  roleIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },

  roleEmoji: {
    fontSize: 32,
  },

  roleContent: {
    flex: 1,
  },

  roleTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },

  roleTitleSelected: {
    color: theme.colors.text,
  },

  roleDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },

  roleFeatures: {
    gap: 6,
  },

  featureItem: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedIcon: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  infoSection: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },

  infoText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  actions: {
    gap: 12,
  },

  continueButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  continueButtonDisabled: {
    backgroundColor: theme.colors.border,
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  continueButtonTextDisabled: {
    color: theme.colors.textMuted,
  },

  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  skipButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
});
