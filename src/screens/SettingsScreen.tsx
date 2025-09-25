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
} from 'react-native';
import { theme } from '../styles/theme';
import { NotificationSettings, Team } from '../types';
import { NotificationPreferencesService } from '../services/notifications/NotificationPreferencesService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NotificationsTab } from '../components/profile/NotificationsTab';
import { TeamManagementSection } from '../components/profile/TeamManagementSection';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

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
        {/* Team Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEAM</Text>
          <TeamManagementSection
            currentTeam={currentTeam}
            onChangeTeam={onNavigateToTeamDiscovery || (() => {})}
            onJoinTeam={onNavigateToTeamDiscovery || (() => {})}
            onViewTeam={onViewCurrentTeam}
          />
        </View>

        {/* Captain Dashboard Access */}
        {userRole === 'captain' && onCaptainDashboard && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Team Management</Text>
            <SettingItem
              title="Captain Dashboard"
              subtitle="Manage your team, events, and members"
              onPress={onCaptainDashboard}
            />
          </Card>
        )}

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
});