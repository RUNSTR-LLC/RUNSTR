/**
 * ProfileScreen - Main profile screen with tab navigation
 * Matches HTML mockup profile screen exactly
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl } from 'react-native';
import { theme } from '../styles/theme';
import { ProfileTab, ProfileScreenData, NotificationSettings } from '../types';
import { NotificationPreferencesService } from '../services/notifications/NotificationPreferencesService';

// UI Components
// BottomNavigation removed - using BottomTabNavigator instead

// Profile Components
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PersonalWalletSection } from '../components/profile/PersonalWalletSection';
import { SendModal } from '../components/wallet/SendModal';
import { ReceiveModal } from '../components/wallet/ReceiveModal';
import { HistoryModal } from '../components/wallet/HistoryModal';
import { TabNavigation } from '../components/profile/TabNavigation';
import { WorkoutsTab } from '../components/profile/WorkoutsTab';
import { AccountTab } from '../components/profile/AccountTab';
import { NotificationsTab } from '../components/profile/NotificationsTab';
import { useNutzap } from '../hooks/useNutzap';
import { nip19 } from 'nostr-tools';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileScreenProps {
  data: ProfileScreenData;
  onNavigateToTeam: () => void;
  onNavigateToTeamDiscovery?: () => void;
  onViewCurrentTeam?: () => void;
  onCaptainDashboard?: () => void;
  onTeamCreation?: () => void;
  onEditProfile?: () => void;
  onSend?: () => void;
  onReceive?: () => void;
  onWalletHistory?: () => void;
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
  onSend,
  onReceive,
  onWalletHistory,
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
  const [isLoadingNotificationSettings, setIsLoadingNotificationSettings] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userNpub, setUserNpub] = useState<string>('');

  const { balance, refreshBalance } = useNutzap(true);

  // Load notification settings and user npub on mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      setIsLoadingNotificationSettings(true);
      try {
        const settings = await NotificationPreferencesService.getNotificationSettings();
        setNotificationSettings(settings);
        console.log('📱 Loaded notification settings:', settings);
      } catch (error) {
        console.error('Error loading notification settings:', error);
        // Keep existing settings from props as fallback
      } finally {
        setIsLoadingNotificationSettings(false);
      }
    };

    const loadUserNpub = async () => {
      try {
        // Get user's hex pubkey from storage and convert to npub
        const userPubkey = data.user.id; // This should be the hex pubkey
        if (userPubkey) {
          const npub = nip19.npubEncode(userPubkey);
          setUserNpub(npub);
        }
      } catch (error) {
        console.error('Error encoding npub:', error);
      }
    };

    loadNotificationSettings();
    loadUserNpub();
  }, [data.user.id]);

  // Event handlers
  const handleEditProfile = () => {
    onEditProfile?.();
  };

  const handleSend = async () => {
    // Refresh balance before opening send modal
    await refreshBalance();
    setShowSendModal(true);
  };

  const handleReceive = async () => {
    // Refresh balance before opening receive modal
    await refreshBalance();
    setShowReceiveModal(true);
  };

  const handleWalletHistory = () => {
    setShowHistoryModal(true);
  };

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

  const handleNotificationSettingChange = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    try {
      // Update local state immediately for responsive UI
      setNotificationSettings((prev) => ({
        ...prev,
        [key]: value,
      }));

      // Persist the change to storage
      const updatedSettings = await NotificationPreferencesService.updateNotificationSetting(key, value);
      console.log(`📱 Updated notification setting ${key}: ${value}`);
      
      // Ensure local state matches persisted state
      setNotificationSettings(updatedSettings);
    } catch (error) {
      console.error(`Error updating notification setting ${key}:`, error);
      
      // Revert local state on error
      setNotificationSettings((prev) => ({
        ...prev,
        [key]: !value, // Revert to previous value
      }));
      
      // TODO: Could show error toast to user here
    }
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

        {/* Profile Header */}
        <ProfileHeader user={data.user} />

        {/* Personal Wallet Section */}
        <PersonalWalletSection
          onSendPress={handleSend}
          onReceivePress={handleReceive}
          onHistoryPress={handleWalletHistory}
        />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Send Modal */}
      <SendModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        currentBalance={balance}
      />

      {/* Receive Modal */}
      <ReceiveModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        currentBalance={balance}
        userNpub={userNpub}
      />

      {/* History Modal */}
      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
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
