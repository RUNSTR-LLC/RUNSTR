/**
 * SettingsScreen - Consolidated settings for Account, Teams, and Notifications
 * Accessed from Profile screen settings button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { NotificationSettings, Team } from '../types';
import { NotificationPreferencesService } from '../services/notifications/NotificationPreferencesService';
import { DeleteAccountService } from '../services/auth/DeleteAccountService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NotificationsTab } from '../components/profile/NotificationsTab';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

interface SettingsScreenProps {
  currentTeam?: Team;
  onNavigateToTeamDiscovery?: () => void;
  onViewCurrentTeam?: () => void;
  onCaptainDashboard?: () => void;
  onHelp?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentTeam,
  onNavigateToTeamDiscovery,
  onViewCurrentTeam,
  onCaptainDashboard,
  onHelp,
  onContactSupport,
  onPrivacyPolicy,
  onSignOut,
}) => {
  const navigation = useNavigation();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    leaguesStarting: true,
    eventsStarting: true,
    challengesStarting: false,
    leagueResults: true,
    eventResults: true,
    challengeResults: false,
    teamAnnouncements: true,
  });
  const [isLoadingNotificationSettings, setIsLoadingNotificationSettings] = useState(true);
  const [userRole, setUserRole] = useState<'captain' | 'member' | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [userNsec, setUserNsec] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoadingNotificationSettings(true);
    try {
      // Load notification settings
      const settings = await NotificationPreferencesService.getNotificationSettings();
      setNotificationSettings(settings);

      // Check if user is captain
      const storedRole = await AsyncStorage.getItem('@runstr:user_role');
      setUserRole(storedRole as 'captain' | 'member' | null);

      // Load user's nsec for backup feature
      const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      setUserNsec(nsec);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoadingNotificationSettings(false);
    }
  };

  const handleNotificationSettingChange = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    try {
      setNotificationSettings((prev) => ({
        ...prev,
        [key]: value,
      }));

      const updatedSettings = await NotificationPreferencesService.updateNotificationSetting(
        key,
        value
      );
      setNotificationSettings(updatedSettings);
    } catch (error) {
      console.error(`Error updating notification setting ${key}:`, error);
      setNotificationSettings((prev) => ({
        ...prev,
        [key]: !value,
      }));
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.multiRemove([
                '@runstr:user_nsec',
                '@runstr:npub',
                '@runstr:hex_pubkey',
                '@runstr:user_role',
              ]);

              // Call the provided sign out handler
              onSignOut?.();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    // Get data summary first
    const deleteService = DeleteAccountService.getInstance();
    const dataSummary = await deleteService.getDataSummary();

    // Build warning message with actual data
    let warningDetails = 'This action will:\n\n';
    warningDetails += '• Permanently remove your nsec from this device\n';
    if (dataSummary.hasWallet) {
      warningDetails += '• Delete your Lightning wallet and any remaining balance\n';
    }
    if (dataSummary.teamCount > 0) {
      warningDetails += `• Remove you from ${dataSummary.teamCount} team${dataSummary.teamCount > 1 ? 's' : ''}\n`;
    }
    if (dataSummary.workoutCount > 0) {
      warningDetails += `• Delete ${dataSummary.workoutCount} cached workout${dataSummary.workoutCount > 1 ? 's' : ''}\n`;
    }
    warningDetails += '• Request deletion from Nostr relays (cannot be guaranteed)\n';
    warningDetails += '\nThis action CANNOT be undone!';

    // First warning dialog
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second warning with detailed information
            Alert.alert(
              '⚠️ Final Warning',
              warningDetails,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand, Delete My Account',
                  style: 'destructive',
                  onPress: () => performAccountDeletion(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);

    try {
      const deleteService = DeleteAccountService.getInstance();
      await deleteService.deleteAccount();

      // Navigate to login screen and reset navigation stack
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
      }, 100);
    } catch (error) {
      console.error('Account deletion failed:', error);
      Alert.alert(
        'Deletion Failed',
        'Failed to delete your account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleBackupPassword = () => {
    if (!userNsec) {
      Alert.alert('Error', 'No account key found. Please sign in again.');
      return;
    }

    // First warning dialog with education
    Alert.alert(
      '🔐 Backup Your Nostr Password',
      'Your Nostr password (nsec) is the master key to your account.\n\n' +
      '⚠️ IMPORTANT:\n' +
      '• This is the ONLY way to recover your account\n' +
      '• Anyone with this password can control your account\n' +
      '• Store it in a password manager or write it down\n' +
      '• NEVER share it with anyone\n' +
      '• NEVER enter it on untrusted websites\n\n' +
      'Would you like to copy your password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Copy Password',
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(userNsec);

              // Show success with security reminder
              Alert.alert(
                '✅ Password Copied',
                'Your Nostr password has been copied to your clipboard.\n\n' +
                '🔒 Security Tips:\n' +
                '1. Paste it in a secure password manager NOW\n' +
                '2. Clear your clipboard after saving it\n' +
                '3. Never paste it in untrusted apps\n' +
                '4. This is your only backup - losing it means losing your account forever',
                [{ text: 'I Understand', style: 'default' }]
              );
            } catch (error) {
              console.error('Failed to copy nsec:', error);
              Alert.alert('Error', 'Failed to copy password. Please try again.');
            }
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Captain Dashboard Access */}
        {userRole === 'captain' && onCaptainDashboard && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TEAM MANAGEMENT</Text>
            <Card style={styles.card}>
              <SettingItem
                title="Captain Dashboard"
                subtitle="Manage your team, events, and members"
                onPress={onCaptainDashboard}
              />
            </Card>
          </View>
        )}

        {/* Account Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT SECURITY</Text>
          <Card style={styles.card}>
            <SettingItem
              title="Backup Password"
              subtitle={userNsec ? 'Tap to backup your account key' : 'Not available'}
              onPress={handleBackupPassword}
              rightElement={
                <View style={styles.securityIcon}>
                  <Ionicons name="lock-closed" size={20} color={theme.colors.textMuted} />
                </View>
              }
            />
          </Card>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <Card style={styles.card}>
            <NotificationsTab
              settings={notificationSettings}
              onSettingChange={handleNotificationSettingChange}
            />
          </Card>
        </View>

        {/* Support & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>
          <Card style={styles.card}>
            <SettingItem
              title="Help & Support"
              subtitle="FAQ and troubleshooting"
              onPress={onHelp}
            />
            <SettingItem
              title="Contact Support"
              subtitle="Get direct help"
              onPress={onContactSupport}
            />
            <SettingItem
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={onPrivacyPolicy}
            />
          </Card>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Delete Account - Destructive Action */}
        <View style={styles.section}>
          <Card style={styles.card}>
            <TouchableOpacity
              style={[styles.deleteAccountButton, isDeletingAccount && styles.buttonDisabled]}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fca5a5" />
                  <Text style={[styles.deleteAccountButtonText, { marginLeft: 8 }]}>
                    Deleting Account...
                  </Text>
                </View>
              ) : (
                <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
              )}
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  headerSpacer: {
    width: 32, // Match back button width for centering
  },

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingVertical: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  card: {
    marginBottom: 0,
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  settingInfo: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  settingSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  chevron: {
    color: theme.colors.textMuted,
    fontSize: 20,
  },

  // Sign Out Button
  signOutButton: {
    backgroundColor: '#dc2626',
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  signOutButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Delete Account Button - More destructive styling
  deleteAccountButton: {
    backgroundColor: '#7f1d1d', // Darker red for more serious action
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },

  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#fca5a5', // Lighter text for contrast
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityIcon: {
    marginLeft: 8,
  },
});