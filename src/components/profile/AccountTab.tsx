/**
 * AccountTab Component - Subscription and support settings
 * Matches account tab content from HTML mockup exactly
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../styles/theme';
import { ProfileScreenData, Team } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TeamManagementSection } from './TeamManagementSection';

interface AccountTabProps {
  subscription?: ProfileScreenData['subscription'];
  currentTeam?: Team;
  onManageSubscription: () => void;
  onHelp: () => void;
  onContact: () => void;
  onPrivacy: () => void;
  onChangeTeam?: () => void;
  onJoinTeam?: () => void;
  onViewTeam?: () => void;
  onCaptainDashboard?: () => void;
  onSignOut?: () => void;
}

interface SettingItemProps {
  title: string;
  subtitle: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  onPress,
  rightElement,
}) => {
  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightElement || (onPress && <Text style={styles.chevron}>›</Text>)}
    </Wrapper>
  );
};

export const AccountTab: React.FC<AccountTabProps> = ({
  subscription,
  currentTeam,
  onManageSubscription,
  onHelp,
  onContact,
  onPrivacy,
  onChangeTeam,
  onJoinTeam,
  onViewTeam,
  onCaptainDashboard,
  onSignOut,
}) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Team Management Section */}
      {onChangeTeam && onJoinTeam && (
        <TeamManagementSection
          currentTeam={currentTeam}
          onChangeTeam={onChangeTeam}
          onJoinTeam={onJoinTeam}
          onViewTeam={onViewTeam}
        />
      )}

      {/* Captain Dashboard Access */}
      {subscription?.type === 'captain' && onCaptainDashboard && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Team Management</Text>
          <SettingItem
            title="Captain Dashboard"
            subtitle="Manage your team, events, and members"
            onPress={onCaptainDashboard}
          />
        </Card>
      )}

      {/* Account Type section removed for pure Nostr users */}

      {/* Support & Legal Section */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Support & Legal</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Help & Support"
            subtitle="FAQ and troubleshooting"
            onPress={onHelp}
          />
          <SettingItem
            title="Contact Support"
            subtitle="Get direct help"
            onPress={onContact}
          />
          <SettingItem
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={onPrivacy}
          />
        </View>
      </Card>

      {/* Account Actions Section */}
      {onSignOut && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <SettingItem
            title="Sign Out"
            subtitle="Sign out of your account"
            rightElement={
              <Button
                title="Sign Out"
                onPress={onSignOut}
                style={styles.signOutButton}
                textStyle={styles.signOutButtonText}
              />
            }
          />
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  card: {
    marginBottom: theme.spacing.xl, // 12px
  },

  // CSS: font-size: 12px; font-weight: 600; margin-bottom: 12px; color: #ccc; text-transform: uppercase; letter-spacing: 0.5px;
  cardTitle: {
    fontSize: 12, // Exact from CSS
    fontWeight: theme.typography.weights.semiBold, // 600
    marginBottom: theme.spacing.xl, // 12px
    color: theme.colors.textSecondary, // #ccc
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  settingsGroup: {
    // Container for grouped settings items
  },

  // CSS: display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #1a1a1a;
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl, // 16px
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // #1a1a1a
  },

  settingInfo: {
    flex: 1,
  },

  // CSS: font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 2px;
  settingTitle: {
    fontSize: 15, // Exact from CSS
    fontWeight: theme.typography.weights.semiBold, // 600
    color: theme.colors.text, // #fff
    marginBottom: theme.spacing.xs, // 2px
  },

  // CSS: font-size: 12px; color: #666;
  settingSubtitle: {
    fontSize: 12, // Exact from CSS
    color: theme.colors.textMuted, // #666
  },

  chevron: {
    color: theme.colors.textMuted, // #666
    fontSize: 14, // Exact from CSS
  },

  // CSS: padding: 6px 12px; border-radius: 6px; font-size: 11px;
  manageButton: {
    paddingVertical: theme.spacing.md, // 6px
    paddingHorizontal: theme.spacing.xl, // 12px
    borderRadius: theme.borderRadius.small, // 6px
  },

  manageButtonText: {
    fontSize: 11, // Exact from CSS
    fontWeight: theme.typography.weights.medium, // 500
  },

  // CSS: padding: 6px 12px; border-radius: 6px; font-size: 11px; background: destructive color
  signOutButton: {
    paddingVertical: theme.spacing.md, // 6px
    paddingHorizontal: theme.spacing.xl, // 12px
    borderRadius: theme.borderRadius.small, // 6px
    backgroundColor: '#dc2626', // Red background for destructive action
  },

  signOutButtonText: {
    fontSize: 11, // Exact from CSS
    fontWeight: theme.typography.weights.medium, // 500
    color: theme.colors.text, // White text
  },
});
