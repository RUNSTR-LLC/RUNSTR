/**
 * ProfileScreen - Main profile screen with tab navigation
 * Matches HTML mockup profile screen exactly
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl } from 'react-native';
import { theme } from '../styles/theme';
import { ProfileTab, ProfileScreenData, NotificationSettings } from '../types';

// UI Components
// BottomNavigation removed - using BottomTabNavigator instead

// Profile Components
import { ProfileHeader } from '../components/profile/ProfileHeader';
// WalletSection removed - using team wallets only
import { TabNavigation } from '../components/profile/TabNavigation';
import { WorkoutsTab } from '../components/profile/WorkoutsTab';
import { AccountTab } from '../components/profile/AccountTab';
import { NotificationsTab } from '../components/profile/NotificationsTab';

interface ProfileScreenProps {
  data: ProfileScreenData;
  onNavigateToTeam: () => void;
  onNavigateToTeamDiscovery?: () => void;
  onViewCurrentTeam?: () => void;
  onCaptainDashboard?: () => void;
  onTeamCreation?: () => void;
  onEditProfile?: () => void;
  // onSend/onReceive removed - user wallets not supported
  onSyncSourcePress?: (provider: string) => void;
  onManageSubscription?: () => void;
  onHelp?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onSignOut?: () => void;
  onRefresh?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  data,
  onNavigateToTeam,
  onNavigateToTeamDiscovery,
  onViewCurrentTeam,
  onCaptainDashboard,
  onTeamCreation,
  onEditProfile,
  // onSend, onReceive removed - user wallets not supported
  onSyncSourcePress,
  onManageSubscription,
  onHelp,
  onContactSupport,
  onPrivacyPolicy,
  onSignOut,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('workouts');
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(data.notificationSettings);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Event handlers
  const handleEditProfile = () => {
    onEditProfile?.();
  };

  // handleSend, handleReceive removed - user wallets not supported

  const handleSyncSourcePress = (provider: string) => {
    onSyncSourcePress?.(provider);
  };

  const handleManageSubscription = () => {
    onManageSubscription?.();
  };

  const handleHelp = () => {
    onHelp?.();
  };

  const handleContactSupport = () => {
    onContactSupport?.();
  };

  const handlePrivacyPolicy = () => {
    onPrivacyPolicy?.();
  };

  const handleSignOut = () => {
    onSignOut?.();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setIsRefreshing(false);
  };

  const handleNotificationSettingChange = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'workouts':
        return (
          <WorkoutsTab
            syncSources={data.syncSources}
            recentWorkouts={data.recentWorkouts}
            currentUserId={data.user.id}
            currentUserPubkey={data.user.npub}
            currentUserTeamId={data.currentTeam?.id}
            onSyncSourcePress={handleSyncSourcePress}
            onWorkoutsSynced={() => {
              // Could trigger a refresh of workout data here
              console.log('Workouts synced, profile could refresh data');
            }}
          />
        );
      case 'account':
        return (
          <AccountTab
            subscription={data.subscription}
            currentTeam={data.currentTeam}
            onManageSubscription={handleManageSubscription}
            onHelp={handleHelp}
            onContact={handleContactSupport}
            onPrivacy={handlePrivacyPolicy}
            onChangeTeam={() => onNavigateToTeamDiscovery?.()}
            onJoinTeam={() => onNavigateToTeamDiscovery?.()}
            onViewTeam={onViewCurrentTeam}
            onCaptainDashboard={onCaptainDashboard}
            onSignOut={handleSignOut}
          />
        );
      case 'notifications':
        return (
          <NotificationsTab
            settings={notificationSettings}
            onSettingChange={handleNotificationSettingChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Header */}
        <ProfileHeader user={data.user} />

        {/* Wallet Section removed - user wallets not supported, only team wallets */}

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // #000
  },

  // CSS: display: flex; align-items: center; justify-content: center; padding: 16px 20px; border-bottom: 1px solid #1a1a1a;
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl, // 16px
    paddingHorizontal: theme.spacing.xxxl, // 20px
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // #1a1a1a
  },

  // CSS: font-size: 20px; font-weight: 700; letter-spacing: -0.5px;
  headerTitle: {
    fontSize: theme.typography.teamName, // 20px
    fontWeight: theme.typography.weights.bold, // 700
    color: theme.colors.text,
    letterSpacing: -0.5,
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Add some bottom padding for better UX
  },

  // CSS: flex: 1; overflow-y: auto; padding: 0 20px; min-height: 0;
  tabContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.xxxl, // 20px
  },

  tabContentContainer: {
    paddingBottom: theme.spacing.xxxl, // 20px for bottom spacing
  },
});
