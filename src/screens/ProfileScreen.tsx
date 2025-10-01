/**
 * ProfileScreen - Main profile screen with tab navigation
 * Matches HTML mockup profile screen exactly
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { ProfileTab, ProfileScreenData, NotificationSettings } from '../types';
import { NotificationPreferencesService } from '../services/notifications/NotificationPreferencesService';

// UI Components
// BottomNavigation removed - using BottomTabNavigator instead

// Profile Components
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { CompactWallet } from '../components/profile/CompactWallet';
import { SendModal } from '../components/wallet/SendModal';
import { ReceiveModal } from '../components/wallet/ReceiveModal';
import { HistoryModal } from '../components/wallet/HistoryModal';
import { TeamManagementSection } from '../components/profile/TeamManagementSection';
import { YourCompetitionsBox } from '../components/profile/YourCompetitionsBox';
import { YourWorkoutsBox } from '../components/profile/YourWorkoutsBox';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNutzap } from '../hooks/useNutzap';
import { useWalletStore } from '../store/walletStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { npubEncode } from '../utils/nostrEncoding';

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
  const navigation = useNavigation<any>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userNpub, setUserNpub] = useState<string>('');

  const { balance, refreshBalance } = useNutzap(true);
  const { initialize: initializeWallet, isInitialized } = useWalletStore();

  // Initialize wallet and load notification settings on mount
  useEffect(() => {
    // Initialize wallet globally when profile screen loads
    if (!isInitialized) {
      console.log('[ProfileScreen] Initializing global wallet...');
      initializeWallet();
    }
  }, [isInitialized, initializeWallet]);

  // Load user npub on mount
  useEffect(() => {
    const loadUserNpub = async () => {
      try {
        // Get user's ID which could be npub or hex pubkey
        const userPubkey = data.user.id;
        if (userPubkey) {
          // Check if it's already an npub
          if (userPubkey.startsWith('npub')) {
            setUserNpub(userPubkey);
          } else if (userPubkey.length === 64) {
            // It's a hex pubkey, encode it
            const npub = npubEncode(userPubkey);
            setUserNpub(npub);
          } else {
            // Fallback: try to use it as-is or get from storage
            const storedNpub = await AsyncStorage.getItem('@runstr:npub');
            if (storedNpub) {
              setUserNpub(storedNpub);
            }
          }
        }
      } catch (error) {
        console.error('Error handling user npub:', error);
        // Try to get npub from storage as fallback
        try {
          const storedNpub = await AsyncStorage.getItem('@runstr:npub');
          if (storedNpub) {
            setUserNpub(storedNpub);
          }
        } catch (storageError) {
          console.error('Error retrieving npub from storage:', storageError);
        }
      }
    };

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

  const handleSettingsPress = () => {
    navigation.navigate('Settings', {
      currentTeam: data.currentTeam,
      onNavigateToTeamDiscovery,
      onViewCurrentTeam,
      onCaptainDashboard,
      onHelp,
      onContactSupport,
      onPrivacyPolicy,
      onSignOut,
    });
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Edit and Settings Buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            const parentNav = navigation.getParent();
            if (parentNav) {
              parentNav.navigate('ProfileEdit' as any);
            } else {
              navigation.navigate('ProfileEdit' as any);
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

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
        {/* Profile Header Box */}
        <View style={styles.boxContainer}>
          <ProfileHeader user={data.user} />
        </View>

        {/* Compact Wallet */}
        <View style={styles.boxContainer}>
          <CompactWallet
            onSendPress={handleSend}
            onReceivePress={handleReceive}
            onHistoryPress={handleWalletHistory}
          />
        </View>

        {/* User's Team */}
        <View style={styles.boxContainer}>
          <TeamManagementSection
            currentTeam={data.currentTeam}
            onChangeTeam={() => onNavigateToTeamDiscovery?.()}
            onJoinTeam={() => onNavigateToTeamDiscovery?.()}
            onViewTeam={onViewCurrentTeam}
            onRefresh={onRefresh}
          />
        </View>

        {/* User's Competitions */}
        <View style={styles.boxContainer}>
          <YourCompetitionsBox />
        </View>

        {/* User's Workouts */}
        <View style={styles.boxContainer}>
          <YourWorkoutsBox />
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

  // Header with settings
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  editButton: {
    padding: 4,
  },

  settingsButton: {
    padding: 4,
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Box styling with uniform spacing
  boxContainer: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
  },
});
