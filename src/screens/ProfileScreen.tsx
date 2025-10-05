/**
 * ProfileScreen - Main profile screen with tab navigation
 * Matches HTML mockup profile screen exactly
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { MyTeamsBox } from '../components/profile/MyTeamsBox';
import { ChallengeNotificationsBox } from '../components/profile/ChallengeNotificationsBox';
import { YourCompetitionsBox } from '../components/profile/YourCompetitionsBox';
import { YourWorkoutsBox } from '../components/profile/YourWorkoutsBox';
import { NotificationBadge } from '../components/profile/NotificationBadge';
import { NotificationModal } from '../components/profile/NotificationModal';
import { QRScannerModal } from '../components/qr/QRScannerModal';
import { JoinPreviewModal } from '../components/qr/JoinPreviewModal';
import { OpenChallengeWizard } from '../components/wizards/OpenChallengeWizard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNutzap } from '../hooks/useNutzap';
import { useWalletStore } from '../store/walletStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { npubEncode } from '../utils/nostrEncoding';
import { unifiedNotificationStore } from '../services/notifications/UnifiedNotificationStore';
import { challengeNotificationHandler } from '../services/notifications/ChallengeNotificationHandler';
// TEMPORARILY REMOVED TO DEBUG THEME ERROR
// import { NotificationService } from '../services/notifications/NotificationService';
import { getUserNostrIdentifiers } from '../utils/nostr';
import type { QRData } from '../services/qr/QRCodeService';
import JoinRequestService from '../services/competition/JoinRequestService';
import { EventJoinRequestService } from '../services/events/EventJoinRequestService';
import { getAuthenticationData } from '../utils/nostrAuth';
import { nsecToPrivateKey } from '../utils/nostr';
import { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';
import { Alert } from 'react-native';
import { WorkoutCacheService } from '../services/cache/WorkoutCacheService';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys } from '../constants/cacheTTL';

interface ProfileScreenProps {
  data: ProfileScreenData;
  isLoadingTeam?: boolean;
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
  isLoadingTeam = false,
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showOpenChallengeWizard, setShowOpenChallengeWizard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showJoinPreview, setShowJoinPreview] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<QRData | null>(null);
  const [userNpub, setUserNpub] = useState<string>('');
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);

  const { balance, refreshBalance } = useNutzap(true);
  const { initialize: initializeWallet, isInitialized } = useWalletStore();

  // Initialize wallet and load notification settings on mount
  useEffect(() => {
    // Initialize wallet globally when profile screen loads
    // Use quick resume mode for instant loading on Android
    if (!isInitialized) {
      console.log('[ProfileScreen] Initializing global wallet with quick resume...');
      initializeWallet(undefined, true); // Pass quickResume: true
    }
  }, [isInitialized, initializeWallet]);

  // Initialize unified notification system
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const userIdentifiers = await getUserNostrIdentifiers();
        if (userIdentifiers?.hexPubkey) {
          console.log('[ProfileScreen] Initializing unified notification system...');

          // Initialize the unified notification store
          await unifiedNotificationStore.initialize(userIdentifiers.hexPubkey);

          // Start challenge notification listener
          await challengeNotificationHandler.startListening();

          // Initialize NotificationService to start competition event monitoring
          // TEMPORARILY COMMENTED OUT TO DEBUG THEME ERROR
          // await NotificationService.getInstance().initialize(userIdentifiers.hexPubkey);

          console.log('[ProfileScreen] Unified notification system initialized');
        }
      } catch (error) {
        console.error('[ProfileScreen] Failed to initialize notification system:', error);
      }
    };

    initializeNotifications();

    // Cleanup on unmount
    return () => {
      challengeNotificationHandler.stopListening();
    };
  }, []);

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

  // Proactively fetch workout data when ProfileScreen mounts
  useEffect(() => {
    const fetchWorkoutData = async () => {
      try {
        const userPubkey = data.user.id;
        if (!userPubkey) {
          console.log('[ProfileScreen] No pubkey available for workout fetch');
          return;
        }

        // ✅ Check UnifiedNostrCache first
        const cachedWorkouts = unifiedCache.getCached(CacheKeys.USER_WORKOUTS(userPubkey));
        if (cachedWorkouts) {
          console.log('[ProfileScreen] ✅ Using cached workouts (instant)');
          return;
        }

        console.log('[ProfileScreen] 🏃 Triggering background workout fetch...');
        const cacheService = WorkoutCacheService.getInstance();

        // Non-blocking background fetch (cache-first strategy)
        await cacheService.getMergedWorkouts(userPubkey, 500);

        console.log('[ProfileScreen] ✅ Background workout fetch complete');
      } catch (error) {
        console.error('[ProfileScreen] ⚠️ Background workout fetch error:', error);
        // Non-critical - workouts will load on demand
      }
    };

    fetchWorkoutData();
  }, [data.user.id]);

  // Event handlers
  const handleEditProfile = () => {
    onEditProfile?.();
  };

  const handleSend = () => {
    setShowSendModal(true);
  };

  const handleReceive = () => {
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

  const handleQRScanned = (qrData: QRData) => {
    setScannedQRData(qrData);
    setShowJoinPreview(true);
  };

  const handleJoinCompetition = async (qrData: QRData) => {
    try {
      if (qrData.type === 'challenge') {
        await JoinRequestService.publishChallengeAcceptance(
          qrData.id,
          qrData.creator_npub
        );
        Alert.alert('Success', 'Challenge acceptance request sent!');
      } else {
        // Handle event join using EventJoinRequestService (kind 1105)
        const authData = await getAuthenticationData();
        if (!authData?.nsec) {
          Alert.alert('Error', 'Authentication required to join events');
          return;
        }

        const eventJoinService = EventJoinRequestService.getInstance();

        // Prepare event join request
        const requestData = {
          eventId: qrData.id,
          eventName: qrData.name,
          teamId: qrData.team_id,
          captainPubkey: qrData.captain_npub,
          message: `Requesting to join ${qrData.name} via QR code`,
        };

        const eventTemplate = eventJoinService.prepareEventJoinRequest(
          requestData,
          authData.hexPubkey
        );

        // Sign and publish the event join request
        const g = globalThis as any;
        const ndk = g.__RUNSTR_NDK_INSTANCE__;
        const privateKeyHex = nsecToPrivateKey(authData.nsec);
        const signer = new NDKPrivateKeySigner(privateKeyHex);
        const ndkEvent = new NDKEvent(ndk, eventTemplate);
        await ndkEvent.sign(signer);
        await ndkEvent.publish();

        Alert.alert(
          'Request Sent',
          'Your join request has been sent to the captain for approval!'
        );
      }
    } catch (error) {
      console.error('Failed to join competition:', error);
      Alert.alert('Error', 'Failed to send join request. Please try again.');
    }
  };


  const formatBalance = (sats: number): string => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K`;
    }
    return sats.toString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with QR Scanner, Balance, and Settings Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQRScanner(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="qr-code-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />

        {/* Balance Display - Tappable */}
        <TouchableOpacity
          style={styles.balanceButton}
          onPress={() => setShowBalanceMenu(!showBalanceMenu)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.balanceText}>{formatBalance(balance)}</Text>
          <Ionicons name="flash" size={16} color={theme.colors.accent} style={styles.balanceIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Balance Menu Dropdown */}
      {showBalanceMenu && (
        <View style={styles.balanceMenu}>
          <TouchableOpacity
            style={styles.balanceMenuItem}
            onPress={() => {
              setShowBalanceMenu(false);
              handleSend();
            }}
          >
            <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
            <Text style={styles.balanceMenuText}>Send</Text>
          </TouchableOpacity>
          <View style={styles.balanceMenuDivider} />
          <TouchableOpacity
            style={styles.balanceMenuItem}
            onPress={() => {
              setShowBalanceMenu(false);
              handleReceive();
            }}
          >
            <Ionicons name="arrow-down-outline" size={20} color={theme.colors.text} />
            <Text style={styles.balanceMenuText}>Receive</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {/* Profile Header Box - Tappable to Edit Profile */}
        <View style={styles.profileHeaderContainer}>
          <TouchableOpacity
            onPress={() => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate('ProfileEdit' as any);
              } else {
                navigation.navigate('ProfileEdit' as any);
              }
            }}
            activeOpacity={0.7}
          >
            <ProfileHeader user={data.user} />
          </TouchableOpacity>

          {/* Notification Badge - positioned in bottom-right of profile header */}
          <NotificationBadge onPress={() => setShowNotificationModal(true)} />
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {/* My Teams */}
          <View style={styles.boxContainer}>
            <MyTeamsBox />
          </View>

          {/* My Competitions */}
          <View style={styles.boxContainer}>
            <YourCompetitionsBox />
          </View>

          {/* My Workouts */}
          <View style={styles.boxContainer}>
            <YourWorkoutsBox />
          </View>

          {/* Challenge Button */}
          <TouchableOpacity
            style={styles.challengeButton}
            onPress={() => setShowOpenChallengeWizard(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={24} color={theme.colors.text} />
            <Text style={styles.challengeButtonText}>CHALLENGE</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanned={handleQRScanned}
      />

      {/* Join Preview Modal */}
      <JoinPreviewModal
        visible={showJoinPreview}
        onClose={() => setShowJoinPreview(false)}
        data={scannedQRData}
        onJoin={handleJoinCompetition}
      />

      {/* Open Challenge Wizard - QR code challenge creation */}
      {showOpenChallengeWizard && (
        <Modal
          visible={showOpenChallengeWizard}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <OpenChallengeWizard
            onComplete={() => setShowOpenChallengeWizard(false)}
            onCancel={() => setShowOpenChallengeWizard(false)}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // #000
  },

  // Header with QR, Balance, Settings
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 10,
  },

  headerSpacer: {
    flex: 1,
  },

  qrButton: {
    padding: 4,
  },

  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginRight: 8,
  },

  balanceText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  balanceIcon: {
    marginLeft: 4,
  },

  settingsButton: {
    padding: 4,
  },

  // Balance Menu Dropdown
  balanceMenu: {
    position: 'absolute',
    top: 56,
    right: 60,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 140,
  },

  balanceMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  balanceMenuText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  balanceMenuDivider: {
    height: 1,
    backgroundColor: '#1a1a1a',
  },

  // Content container (no scrolling)
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Profile header container for badge positioning
  profileHeaderContainer: {
    position: 'relative',
    marginTop: 8,
    marginBottom: 12,
  },

  // Navigation buttons container
  navigationButtons: {
    flex: 1,
    justifyContent: 'space-evenly',
  },

  // Box styling with uniform spacing
  boxContainer: {
    marginBottom: 8,
  },

  // Challenge Button - Same style as other buttons
  challengeButton: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    height: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  challengeButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});
