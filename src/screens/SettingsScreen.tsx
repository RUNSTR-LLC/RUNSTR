/**
 * SettingsScreen - Consolidated settings for Account, Teams, and Notifications
 * Accessed from Profile screen settings button
 *
 * Rewards are handled server-side via trigger_auto_reward() + push notifications.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
// HIDDEN: Speech Speed slider disabled - using default 1.0x speed
// import Slider from '@react-native-community/slider';
import { theme } from '../styles/theme';
import {
  TTSPreferencesService,
  type TTSSettings,
} from '../services/activity/TTSPreferencesService';
import { AutoCompetePreferencesService } from '../services/activity/AutoCompetePreferencesService';
// RewardLightningAddressService removed - Lightning address now managed in Teams tab
import TTSAnnouncementService from '../services/activity/TTSAnnouncementService';
import { DeleteAccountService } from '../services/auth/DeleteAccountService';
import { Card } from '../components/ui/Card';
import { CustomAlert } from '../components/ui/CustomAlert';
import { SettingsAccordion } from '../components/ui/SettingsAccordion';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
// useAuth no longer needed - using RNRestart for sign out
import * as Clipboard from 'expo-clipboard';
import RNRestart from 'react-native-restart';
import { AuthService } from '../services/auth/authService';
import { dailyStepCounterService } from '../services/activity/DailyStepCounterService';
import { GPSPermissionsDiagnostics } from '../components/permissions/GPSPermissionsDiagnostics';
import { StepCountDiagnostics } from '../components/permissions/StepCountDiagnostics';
import { AntiCheatRequestModal } from '../components/settings/AntiCheatRequestModal';
import Nostr1301ImportService from '../services/fitness/Nostr1301ImportService';
import { CustomAlertManager } from '../components/ui/CustomAlert';
import Toast from 'react-native-toast-message';
import { useSeason2Registration } from '../hooks/useSeason2';
import { useUnitPreference } from '../hooks/useUnitPreference';
import { useTranslation } from 'react-i18next';
import { LanguagePreferenceService } from '../services/i18n/LanguagePreferenceService';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n';
import { MusicPlayerPreferencesService } from '../services/music/MusicPlayerPreferencesService';
import { WoTService } from '../services/wot/WoTService';
import { ExportDataModal } from '../components/backup/ExportDataModal';
import { ImportDataModal } from '../components/backup/ImportDataModal';
import { AutoBackupService } from '../services/backup/AutoBackupService';
import { BackupService } from '../services/backup/BackupService';
import { SecureNsecStorage } from '../services/auth/SecureNsecStorage';
import { defaultActivityService, type DefaultActivity } from '../services/activity/DefaultActivityService';
import { SubscriptionService, type SubscriptionTier } from '../services/backend/SubscriptionService';
import { REWARD_CONFIG } from '../config/rewards';
import { NWCStorageService } from '../services/wallet/NWCStorageService';
import { NWCWalletService } from '../services/wallet/NWCWalletService';
import { WalletConfigModal } from '../components/wallet/WalletConfigModal';
import { NWCQRConfirmationModal } from '../components/wallet/NWCQRConfirmationModal';
import { QRScannerModal } from '../components/qr/QRScannerModal';
import type { QRData } from '../services/qr/QRCodeService';
import { AgentSkillSetupModal } from '../components/settings/AgentSkillSetupModal';
import Constants from 'expo-constants';

interface SettingsScreenProps {
  onHelp?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onSignOut?: () => void | Promise<void>;
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
  onHelp,
  onContactSupport,
  onPrivacyPolicy,
  onSignOut,
}) => {
  const navigation = useNavigation();
  const { t } = useTranslation('settings');
  const { isRegistered: isSeason2Participant } = useSeason2Registration();
  const { isMetric, setUnitSystem } = useUnitPreference();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    LanguagePreferenceService.getCurrentLanguage()
  );
  const [userRole, setUserRole] = useState<'captain' | 'member' | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [userNsec, setUserNsec] = useState<string | null>(null);
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    enabled: true,
    speechRate: 1.0,
    announceOnSummary: true,
    includeSplits: false,
    announceLiveSplits: false,
  });
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] =
    useState(false);
  const [autoCompeteEnabled, setAutoCompeteEnabled] = useState(false);

  // Anti-cheat state
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [musicPlayerHeaderEnabled, setMusicPlayerHeaderEnabled] = useState(false);
  const [wotScore, setWotScore] = useState<number | null>(null);

  // Backup/Restore state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Default activity state
  const [defaultActivity, setDefaultActivity] = useState<DefaultActivity>('run');
  const [showDefaultActivityPicker, setShowDefaultActivityPicker] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscription tier state
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');

  // NWC Wallet state
  const [hasNWCWallet, setHasNWCWallet] = useState(false);
  const [showWalletConfigModal, setShowWalletConfigModal] = useState(false);
  const [showQRScannerModal, setShowQRScannerModal] = useState(false);
  const [showNWCQRConfirmModal, setShowNWCQRConfirmModal] = useState(false);
  const [scannedNWCString, setScannedNWCString] = useState('');
  const [showAgentSkillModal, setShowAgentSkillModal] = useState(false);
  const [privateModeEnabled, setPrivateModeEnabled] = useState(false);

  // Rewards settings state (Lightning address removed - now in Teams tab)

  // Alert state for CustomAlert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<
    Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  >([]);

  useEffect(() => {
    loadSettings();
  }, []);

  // ✅ Load teams from NavigationDataContext - REMOVED: Users now auto-assigned to Team RUNSTR
  // useEffect(() => {
  //   if (profileData?.teams && Array.isArray(profileData.teams)) {
  //     const navigationTeams = profileData.teams;
  //     const localMemberships: LocalMembership[] = navigationTeams.map(
  //       (team: any) => ({
  //         teamId: team.id,
  //         teamName: team.name,
  //         captainPubkey: team.captainPubkey || team.captain || '',
  //         joinedAt: team.joinedAt || Date.now(),
  //         status: team.role === 'captain' ? 'official' : team.status || 'local',
  //       })
  //     );

  //     console.log(
  //       `[SettingsScreen] Loaded ${localMemberships.length} teams from NavigationDataContext (including captain teams)`
  //     );
  //     setFollowedTeams(localMemberships);
  //   } else {
  //     console.log('[SettingsScreen] No teams found in NavigationDataContext');
  //     setFollowedTeams([]);
  //   }
  // }, [profileData?.teams]);

  const loadSettings = async () => {
    try {
      // Load TTS settings
      const ttsPrefs = await TTSPreferencesService.getTTSSettings();
      setTtsSettings(ttsPrefs);

      // ✅ PERFORMANCE FIX: Batch AsyncStorage reads using multiGet
      // This is 3x faster than sequential getItem calls
      const keys = ['@runstr:user_role', '@runstr:npub'];
      const values = await AsyncStorage.multiGet(keys);

      const storedRole = values[0][1]; // [key, value] pairs
      const npub = values[1][1];

      // Get nsec from SecureStore (hardware-backed encryption)
      const nsec = await SecureNsecStorage.getNsec();

      setUserRole(storedRole as 'captain' | 'member' | null);
      setUserNsec(nsec);
      setUserNpub(npub);

      // Check if background step tracking is enabled (reads from AsyncStorage)
      const trackingEnabled = await dailyStepCounterService.isBackgroundTrackingEnabled();
      setBackgroundTrackingEnabled(trackingEnabled);

      // Load auto-compete setting
      const autoCompete = await AutoCompetePreferencesService.isAutoCompeteEnabled();
      setAutoCompeteEnabled(autoCompete);

      // Load music player header setting
      const musicHeaderEnabled = await MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled();
      setMusicPlayerHeaderEnabled(musicHeaderEnabled);

      // Load default activity preference
      const savedDefaultActivity = await defaultActivityService.getDefault();
      setDefaultActivity(savedDefaultActivity);

      // Load sats earned data
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (pubkey) {
        // Load WoT score for feature gating (music, etc.)
        try {
          const wotService = WoTService.getInstance();
          const score = await wotService.getCachedScore(pubkey);
          setWotScore(score);
        } catch (wotError) {
          console.warn('[Settings] WoT score load failed:', wotError);
        }
      }

      // Load auto-backup settings
      const autoBackup = await AutoBackupService.getInstance().isAutoBackupEnabled();
      setAutoBackupEnabled(autoBackup);
      const backupTime = await BackupService.getInstance().getLastBackupTime();
      setLastBackupTime(backupTime);

      // Load NWC wallet state
      const nwcAvailable = await NWCStorageService.hasNWC();
      setHasNWCWallet(nwcAvailable);

      // Load private mode setting
      const privateMode = await AsyncStorage.getItem('@runstr:private_mode');
      setPrivateModeEnabled(privateMode === 'true');

      // Load subscription tier
      if (npub) {
        try {
          const tier = await SubscriptionService.getSubscriptionTier(npub);
          setSubscriptionTier(tier);
        } catch (subError) {
          console.warn('[Settings] Subscription tier load failed:', subError);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // NWC Wallet handlers
  const handleDisconnectWallet = () => {
    setAlertTitle('Disconnect Wallet?');
    setAlertMessage('This will remove your NWC wallet connection. You can reconnect anytime.');
    setAlertButtons([
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          NWCWalletService.disconnect();
          setHasNWCWallet(false);
          Toast.show({
            type: 'success',
            text1: 'Wallet Disconnected',
            text2: 'NWC connection removed',
            position: 'top',
            visibilityTime: 3000,
          });
        },
      },
    ]);
    setAlertVisible(true);
  };

  const handleNWCQRScanned = (data: QRData) => {
    if (data.type === 'nwc') {
      setScannedNWCString(data.connectionString);
      setTimeout(() => setShowNWCQRConfirmModal(true), 50);
    }
  };

  const handleNWCConnectSuccess = () => {
    setHasNWCWallet(true);
    setShowWalletConfigModal(false);
    setShowNWCQRConfirmModal(false);
  };

  const handleTTSSettingChange = async <K extends keyof TTSSettings>(
    key: K,
    value: TTSSettings[K]
  ) => {
    try {
      setTtsSettings((prev) => ({
        ...prev,
        [key]: value,
      }));

      const updatedSettings = await TTSPreferencesService.updateTTSSetting(
        key,
        value
      );
      setTtsSettings(updatedSettings);
    } catch (error) {
      console.error(`Error updating TTS setting ${key}:`, error);
      // Revert on error
      const currentSettings = await TTSPreferencesService.getTTSSettings();
      setTtsSettings(currentSettings);
    }
  };

  const handleTestTTS = async () => {
    try {
      await TTSAnnouncementService.testSpeech();
    } catch (error) {
      console.error('Test TTS failed:', error);
      setAlertTitle('Error');
      setAlertMessage('Failed to play test announcement');
      setAlertButtons([{ text: 'OK' }]);
      setAlertVisible(true);
    }
  };

  const handleBackgroundTrackingToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request permission when user toggles on
      const granted = await dailyStepCounterService.requestPermissions();

      if (granted) {
        // Save the enabled setting to AsyncStorage
        await dailyStepCounterService.setBackgroundTrackingEnabled(true);
        setBackgroundTrackingEnabled(true);
      } else {
        // Show alert if permission denied
        setAlertTitle('Permission Required');
        setAlertMessage(
          'Background step tracking requires motion permission to automatically count steps throughout the day.\n\n' +
            'You can enable this permission in your device settings.'
        );
        setAlertButtons([
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => dailyStepCounterService.openSettings(),
          },
        ]);
        setAlertVisible(true);
      }
    } else {
      // Save the disabled setting to AsyncStorage and update UI
      await dailyStepCounterService.setBackgroundTrackingEnabled(false);
      setBackgroundTrackingEnabled(false);
    }
  };

  const handleAutoCompeteToggle = async (enabled: boolean) => {
    try {
      await AutoCompetePreferencesService.setAutoCompeteEnabled(enabled);
      setAutoCompeteEnabled(enabled);
    } catch (error) {
      console.error('Error saving auto-compete setting:', error);
      // Revert on error
      const current = await AutoCompetePreferencesService.isAutoCompeteEnabled();
      setAutoCompeteEnabled(current);
    }
  };

  const handleMusicPlayerHeaderToggle = async (enabled: boolean) => {
    try {
      await MusicPlayerPreferencesService.setMusicPlayerHeaderEnabled(enabled);
      setMusicPlayerHeaderEnabled(enabled);
    } catch (error) {
      console.error('Error saving music player header setting:', error);
      // Revert on error
      const current = await MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled();
      setMusicPlayerHeaderEnabled(current);
    }
  };

  const handleAutoBackupToggle = async (enabled: boolean) => {
    try {
      await AutoBackupService.getInstance().setAutoBackupEnabled(enabled);
      setAutoBackupEnabled(enabled);
    } catch (error) {
      console.error('Error saving auto-backup setting:', error);
      const current = await AutoBackupService.getInstance().isAutoBackupEnabled();
      setAutoBackupEnabled(current);
    }
  };

  const handleDefaultActivityChange = async (activity: DefaultActivity) => {
    try {
      await defaultActivityService.setDefault(activity);
      setDefaultActivity(activity);
      setShowDefaultActivityPicker(false);
      Toast.show({
        type: 'success',
        text1: 'Default Activity Set',
        text2: `${defaultActivityService.getActivityDisplayName(activity)} is now your default`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('[SettingsScreen] Error changing default activity:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save default activity',
        position: 'top',
      });
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSignOut = async () => {
    setAlertTitle('Sign Out');
    setAlertMessage('Are you sure you want to sign out?');
    setAlertButtons([
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setAlertVisible(false);

          // Prefer centralized sign-out path when provided by AuthContext/App
          if (onSignOut) {
            await onSignOut();
            return;
          }

          // Fallback: Use AuthService for comprehensive cleanup (caches, wallet, teams, Lightning address, etc.)
          await AuthService.signOut();

          // Also clear SecureStore nsec and NWC
          await SecureStore.deleteItemAsync('user_nsec_secure');
          await SecureStore.deleteItemAsync('nwc_string');

          // Clear core auth keys that AuthService may not cover
          await AsyncStorage.multiRemove([
            '@runstr:user_nsec',
            '@runstr:npub',
            '@runstr:hex_pubkey',
            '@runstr:auth_method',
            '@runstr:amber_pubkey',
          ]);

          // Restart the app - it will boot fresh and find no auth → show Login
          RNRestart.restart();
        },
      },
    ]);
    setAlertVisible(true);
  };

  const handleDeleteAccount = async () => {
    // Get data summary first
    const deleteService = DeleteAccountService.getInstance();
    const dataSummary = await deleteService.getDataSummary();

    // Build warning message with actual data
    let warningDetails = 'This action will:\n\n';
    warningDetails += '• Permanently remove your nsec from this device\n';
    if (dataSummary.hasWallet) {
      warningDetails +=
        '• Delete your Lightning wallet and any remaining balance\n';
    }
    if (dataSummary.teamCount > 0) {
      warningDetails += `• Remove you from ${dataSummary.teamCount} team${
        dataSummary.teamCount > 1 ? 's' : ''
      }\n`;
    }
    if (dataSummary.workoutCount > 0) {
      warningDetails += `• Delete ${dataSummary.workoutCount} cached workout${
        dataSummary.workoutCount > 1 ? 's' : ''
      }\n`;
    }
    warningDetails +=
      '• Request deletion from servers (cannot be guaranteed)\n';
    warningDetails += '\nThis action CANNOT be undone!';

    // First warning dialog
    setAlertTitle('Delete Account');
    setAlertMessage(
      'Are you sure you want to permanently delete your account?'
    );
    setAlertButtons([
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          // Close first alert and show second warning
          setAlertVisible(false);
          setTimeout(() => {
            setAlertTitle('Final Warning');
            setAlertMessage(warningDetails);
            setAlertButtons([
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete Account',
                style: 'destructive',
                onPress: () => performAccountDeletion(),
              },
            ]);
            setAlertVisible(true);
          }, 100);
        },
      },
    ]);
    setAlertVisible(true);
  };

  const performAccountDeletion = async () => {
    setAlertVisible(false);

    // Clear ALL local data for account deletion
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync('nwc_string');

    // Restart the app - it will boot fresh and find no auth → show Login
    RNRestart.restart();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('[SettingsScreen] Pull-to-refresh: Reloading settings...');
      await loadSettings();
      console.log('[SettingsScreen] Settings reloaded successfully');
    } catch (error) {
      console.error('[SettingsScreen] Settings refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImportNostrHistory = async () => {
    try {
      setImporting(true);

      // Get user pubkey
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!pubkey) {
        console.error('[Settings] No pubkey found - cannot import workouts');
        CustomAlertManager.alert('Error', 'No user key found. Please sign in again.');
        setImporting(false);
        return;
      }

      console.log('[Settings] Starting Nostr workout import...');

      const result = await Nostr1301ImportService.importUserHistory(pubkey);

      if (result.success) {
        console.log(`[Settings] ✅ Imported ${result.totalImported} workouts`);
        CustomAlertManager.alert(
          'Import Complete',
          `Successfully imported ${result.totalImported} workout${result.totalImported !== 1 ? 's' : ''}.`
        );
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('[Settings] ❌ Nostr import failed:', error);
      CustomAlertManager.alert('Import Failed', 'Could not import workouts. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // REMOVED: handleChangeCompetitionTeam - Users now auto-assigned to Team RUNSTR
  // const handleChangeCompetitionTeam = (teamId: string | null) => {
  //   // If selecting the same team, just close modal
  //   if (teamId === competitionTeam) {
  //     setShowTeamSelectionModal(false);
  //     return;
  //   }

  //   // Close the modal first
  //   setShowTeamSelectionModal(false);

  //   // Show confirmation for actual change
  //   setAlertTitle('Change Competition Team?');
  //   setAlertMessage(
  //     teamId
  //       ? `Your workouts will appear on ${
  //           followedTeams.find((t) => t.teamId === teamId)?.teamName ||
  //           'this team'
  //         }'s leaderboards`
  //       : 'Your workouts will not appear on any team leaderboards'
  //   );
  //   setAlertButtons([
  //     { text: 'Cancel', style: 'cancel' },
  //     {
  //       text: 'Confirm',
  //       onPress: async () => {
  //         try {
  //           if (teamId) {
  //             await LocalTeamMembershipService.setCompetitionTeam(teamId);
  //           } else {
  //             await LocalTeamMembershipService.clearCompetitionTeam();
  //           }
  //           setCompetitionTeam(teamId);
  //         } catch (error) {
  //           console.error('Error changing competition team:', error);
  //           setTimeout(() => {
  //             setAlertTitle('Error');
  //             setAlertMessage(
  //               'Failed to change competition team. Please try again.'
  //             );
  //             setAlertButtons([{ text: 'OK' }]);
  //             setAlertVisible(true);
  //           }, 100);
  //         }
  //       },
  //     },
  //   ]);
  //   setAlertVisible(true);
  // };

  const handlePrivateModeToggle = async (value: boolean) => {
    try {
      setPrivateModeEnabled(value);
      await AsyncStorage.setItem('@runstr:private_mode', value ? 'true' : 'false');
    } catch (error) {
      console.error('[Settings] Error saving private mode setting:', error);
      const current = await AsyncStorage.getItem('@runstr:private_mode');
      setPrivateModeEnabled(current === 'true');
    }
  };

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    try {
      await LanguagePreferenceService.setLanguage(languageCode);
      setCurrentLanguage(languageCode);
      Toast.show({
        type: 'success',
        text1: t('saved'),
        text2: SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.nativeName || languageCode,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('[SettingsScreen] Error changing language:', error);
    }
  };

  const handleBackupPassword = () => {
    if (!userNsec) {
      setAlertTitle('Error');
      setAlertMessage('No account key found. Please sign in again.');
      setAlertButtons([{ text: 'OK' }]);
      setAlertVisible(true);
      return;
    }

    // First warning dialog with education
    setAlertTitle('Backup Your Password');
    setAlertMessage(
      'Your password is the master key to your account.\n\n' +
        'IMPORTANT:\n' +
        '• We do not keep backups of passwords\n' +
        '• Your password is only stored locally on your phone\n' +
        '• If you lose your password, you lose access to your account\n' +
        '• Keep your password safe - write it down or use a password manager\n' +
        '• NEVER share it with anyone\n' +
        '• This is the ONLY way to recover your account\n\n' +
        'Would you like to copy your password?'
    );
    setAlertButtons([
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Copy Password',
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(userNsec);

            // Close first alert and show success
            setAlertVisible(false);
            setTimeout(() => {
              setAlertTitle('Password Copied');
              setAlertMessage(
                'Your password has been copied to your clipboard.\n\n' +
                  'Security Tips:\n' +
                  '1. Paste it in a secure password manager NOW\n' +
                  '2. Clear your clipboard after saving it\n' +
                  '3. Never paste it in untrusted apps\n' +
                  '4. Remember: We do not keep backups - if you lose it, your account is gone forever'
              );
              setAlertButtons([{ text: 'I Understand', style: 'default' }]);
              setAlertVisible(true);
            }, 100);
          } catch (error) {
            console.error('Failed to copy nsec:', error);
            setAlertVisible(false);
            setTimeout(() => {
              setAlertTitle('Error');
              setAlertMessage('Failed to copy password. Please try again.');
              setAlertButtons([{ text: 'OK' }]);
              setAlertVisible(true);
            }, 100);
          }
        },
      },
    ]);
    setAlertVisible(true);
  };

  const handleCopyNpub = async () => {
    if (userNpub) {
      await Clipboard.setStringAsync(userNpub);
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: 'Your npub has been copied to clipboard',
        position: 'top',
        visibilityTime: 2000,
      });
    }
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
        <View style={styles.headerSpacer} />
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Privacy Settings */}
        <View style={styles.section}>
          <SettingsAccordion title="Privacy" defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              <SettingItem
                title="Private Mode"
                subtitle="Workouts stay on your device. Competitions and rewards require this to be off."
                rightElement={
                  <Switch
                    value={privateModeEnabled}
                    onValueChange={handlePrivateModeToggle}
                    trackColor={{
                      false: theme.colors.warning,
                      true: theme.colors.accent,
                    }}
                    thumbColor={theme.colors.orangeBright}
                  />
                }
              />
            </Card>
          </SettingsAccordion>
        </View>

        {/* Language Selection Accordion */}
        <View style={styles.section}>
          <SettingsAccordion title={t('language')} defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              <View style={styles.languageSection}>
                <Text style={styles.languageSectionTitle}>{t('languageSelect')}</Text>
                <Text style={styles.languageSectionSubtitle}>{t('languageSelectSubtitle')}</Text>
                <View style={styles.languageOptions}>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageOption,
                        currentLanguage === lang.code && styles.languageOptionSelected,
                      ]}
                      onPress={() => handleLanguageChange(lang.code)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.languageOptionText,
                          currentLanguage === lang.code && styles.languageOptionTextSelected,
                        ]}
                      >
                        {lang.nativeName}
                      </Text>
                      {currentLanguage === lang.code && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.colors.success}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>
          </SettingsAccordion>
        </View>

        {/* Fitness Tracking Accordion */}
        <View style={styles.section}>
          <SettingsAccordion title={t('fitnessTracking')} defaultExpanded={false}>
            <Card style={styles.accordionCard}>

              {/* Auto-Compete - HIDDEN: Feature temporarily disabled
              <SettingItem
                title="Auto-Compete"
                subtitle="Automatically enter workouts into competitions"
                rightElement={
                  <Switch
                    value={autoCompeteEnabled}
                    onValueChange={handleAutoCompeteToggle}
                    trackColor={{
                      false: theme.colors.warning,
                      true: theme.colors.accent,
                    }}
                    thumbColor={theme.colors.orangeBright}
                  />
                }
              />
              */}

              {/* Health Profile - HIDDEN: Feature temporarily disabled
              <SettingItem
                title="Health Profile"
                subtitle="Set weight, height, age for better analytics (optional)"
                onPress={() => (navigation as any).navigate('HealthProfile')}
              />
              */}


              {/* GPS Permissions Diagnostics (Android only) */}
              {Platform.OS === 'android' && <GPSPermissionsDiagnostics />}

              {/* Step Count Diagnostics (Android only) */}
              {Platform.OS === 'android' && <StepCountDiagnostics />}

              {/* Voice Announcements Subsection */}
              <View style={styles.voiceSubsection}>
                <Text style={styles.subsectionTitle}>Voice Announcements</Text>

                {/* Enable TTS */}
                <SettingItem
                  title="Enable Voice Announcements"
                  subtitle="Hear workout summaries read aloud"
                  rightElement={
                    <Switch
                      value={ttsSettings.enabled}
                      onValueChange={(value) =>
                        handleTTSSettingChange('enabled', value)
                      }
                      trackColor={{
                        false: theme.colors.warning,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.orangeBright}
                    />
                  }
                />

                {/* Announce on Summary */}
                <SettingItem
                  title="Workout Summary"
                  subtitle="Announce stats when workout completes"
                  rightElement={
                    <Switch
                      value={ttsSettings.announceOnSummary}
                      onValueChange={(value) =>
                        handleTTSSettingChange('announceOnSummary', value)
                      }
                      trackColor={{
                        false: theme.colors.warning,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.orangeBright}
                      disabled={!ttsSettings.enabled}
                    />
                  }
                />

                {/* Include Splits */}
                <SettingItem
                  title="Include Split Details"
                  subtitle={isMetric ? "Announce kilometer splits in summary" : "Announce mile splits in summary"}
                  rightElement={
                    <Switch
                      value={ttsSettings.includeSplits}
                      onValueChange={(value) =>
                        handleTTSSettingChange('includeSplits', value)
                      }
                      trackColor={{
                        false: theme.colors.warning,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.orangeBright}
                      disabled={!ttsSettings.enabled}
                    />
                  }
                />

                {/* Live Split Announcements */}
                <SettingItem
                  title="Live Split Announcements"
                  subtitle={isMetric ? "Announce each kilometer as you run" : "Announce each mile as you run"}
                  rightElement={
                    <Switch
                      value={ttsSettings.announceLiveSplits}
                      onValueChange={(value) =>
                        handleTTSSettingChange('announceLiveSplits', value)
                      }
                      trackColor={{
                        false: theme.colors.warning,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.orangeBright}
                      disabled={!ttsSettings.enabled}
                    />
                  }
                />

              </View>

              {/* Distance Units Subsection */}
              <View style={styles.voiceSubsection}>
                <Text style={styles.subsectionTitle}>Distance Units</Text>

                <SettingItem
                  title="Distance Units"
                  subtitle={isMetric ? "Kilometers (km)" : "Miles (mi)"}
                  rightElement={
                    <View style={styles.unitToggleRow}>
                      <Text style={[styles.unitLabel, isMetric && styles.unitLabelActive]}>km</Text>
                      <Switch
                        value={!isMetric}
                        onValueChange={(v) => setUnitSystem(v ? 'imperial' : 'metric')}
                        trackColor={{ false: theme.colors.accent, true: theme.colors.accent }}
                        thumbColor={theme.colors.orangeBright}
                      />
                      <Text style={[styles.unitLabel, !isMetric && styles.unitLabelActive]}>mi</Text>
                    </View>
                  }
                />
              </View>

              {/* Default Activity Subsection */}
              <View style={styles.voiceSubsection}>
                <Text style={styles.subsectionTitle}>Default Activity</Text>

                <SettingItem
                  title="Default Workout"
                  subtitle={`Opens ${defaultActivityService.getActivityDisplayName(defaultActivity)} when you start a workout`}
                  onPress={() => setShowDefaultActivityPicker(true)}
                  rightElement={
                    <View style={styles.defaultActivityValue}>
                      <Text style={styles.defaultActivityText}>
                        {defaultActivityService.getActivityDisplayName(defaultActivity)}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </View>
                  }
                />
              </View>
            </Card>
          </SettingsAccordion>
        </View>

        {/* Data & Backup Accordion */}
        <View style={styles.section}>
          <SettingsAccordion title="Data & Backup" defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              {/* Auto-Backup */}
              <SettingItem
                title="Auto-Backup"
                subtitle={
                  autoBackupEnabled
                    ? lastBackupTime
                      ? `Last: ${(() => {
                          const diff = Date.now() - new Date(lastBackupTime).getTime();
                          const mins = Math.floor(diff / 60000);
                          if (mins < 1) return 'just now';
                          if (mins < 60) return `${mins}m ago`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${Math.floor(hrs / 24)}d ago`;
                        })()}`
                      : 'Backs up after each workout'
                    : 'Disabled'
                }
                rightElement={
                  <Switch
                    value={autoBackupEnabled}
                    onValueChange={handleAutoBackupToggle}
                    trackColor={{
                      false: theme.colors.warning,
                      true: theme.colors.accent,
                    }}
                    thumbColor={theme.colors.orangeBright}
                  />
                }
              />
              {/* Export Data */}
              <SettingItem
                title="Export Data"
                subtitle="Backup workouts, habits & journal"
                onPress={() => setShowExportModal(true)}
                rightElement={
                  <View style={styles.securityIcon}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </View>
                }
              />
              {/* Import Data */}
              <SettingItem
                title="Import Data"
                subtitle="Restore from backup"
                onPress={() => setShowImportModal(true)}
                rightElement={
                  <View style={styles.securityIcon}>
                    <Ionicons
                      name="cloud-download-outline"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </View>
                }
              />
              {/* Security Notice */}
              <View style={styles.backupSecurityNotice}>
                <Ionicons name="lock-closed" size={14} color={theme.colors.orangeBright} />
                <Text style={styles.backupSecurityText}>
                  Encrypted with your key - only you can read your backups
                </Text>
              </View>
            </Card>
          </SettingsAccordion>
        </View>

        {/* Advanced Features Accordion */}
        <View style={styles.section}>
          <SettingsAccordion title={t('advancedFeatures')} defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              {/* Wavlake Music - Only visible to WoT users */}
              {wotScore !== null && wotScore > 0 && (
                <SettingItem
                  title="Wavlake"
                  subtitle="Show music player in Profile header"
                  rightElement={
                    <Switch
                      value={musicPlayerHeaderEnabled}
                      onValueChange={handleMusicPlayerHeaderToggle}
                      trackColor={{
                        false: theme.colors.warning,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.orangeBright}
                    />
                  }
                />
              )}

              {/* Rewards Subsection */}
              <View style={styles.rewardsSubsection}>
                <Text style={styles.subsectionTitle}>Rewards</Text>


                {/* Subscription Plan */}
                <View style={styles.rewardSettingRow}>
                  <View style={styles.rewardSettingInfo}>
                    <Text style={styles.rewardSettingTitle}>Subscription Plan</Text>
                    {subscriptionTier === 'free' ? (
                      <Text style={styles.rewardSettingSubtitle}>
                        Free — {REWARD_CONFIG.DAILY_WORKOUT_REWARD} rewards/workout
                      </Text>
                    ) : (
                      <Text style={[styles.rewardSettingSubtitle, { color: theme.colors.accent }]}>
                        {subscriptionTier === 'pro' ? 'Pro' : 'Supporter'} — {REWARD_CONFIG.BOOSTED_WORKOUT_REWARD} rewards/workout (boosted)
                      </Text>
                    )}
                  </View>
                </View>

                {/* Lightning Address - Managed in Teams tab */}
                <View style={styles.rewardSettingRow}>
                  <View style={styles.rewardSettingInfo}>
                    <Text style={styles.rewardSettingTitle}>Lightning Address</Text>
                    <Text style={styles.rewardSettingSubtitle}>Manage your Lightning address in the Teams tab</Text>
                  </View>
                </View>
              </View>

              {/* Connected Wallet Subsection */}
              <View style={styles.voiceSubsection}>
                <Text style={styles.subsectionTitle}>Connected Wallet</Text>
                {hasNWCWallet ? (
                  <>
                    <View style={styles.rewardSettingRow}>
                      <View style={styles.rewardSettingInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.statusConnected }} />
                          <Text style={styles.rewardSettingTitle}>NWC Wallet Connected</Text>
                        </View>
                        <Text style={styles.rewardSettingSubtitle}>
                          Your wallet is connected for in-app payments
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.error,
                        alignItems: 'center',
                        marginTop: 8,
                      }}
                      onPress={handleDisconnectWallet}
                    >
                      <Text style={{ fontSize: 14, color: theme.colors.error, fontWeight: '600' }}>
                        Disconnect Wallet
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.rewardSettingRow}>
                      <View style={styles.rewardSettingInfo}>
                        <Text style={styles.rewardSettingTitle}>No wallet connected</Text>
                        <Text style={styles.rewardSettingSubtitle}>
                          Connect a wallet to enable in-app payments
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: theme.colors.text,
                          alignItems: 'center',
                        }}
                        onPress={() => setShowWalletConfigModal(true)}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.background }}>
                          Paste NWC
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.colors.text,
                          alignItems: 'center',
                        }}
                        onPress={() => setShowQRScannerModal(true)}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.accent }}>
                          Scan QR
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

            </Card>
          </SettingsAccordion>
        </View>

        {/* Password Accordion (collapsed by default) */}
        <View style={styles.section}>
          <SettingsAccordion title={t('password')} defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              {/* Account Security */}
              <SettingItem
                title="Backup Password"
                subtitle={
                  userNsec ? 'Tap to backup your account key' : 'Not available'
                }
                onPress={handleBackupPassword}
                rightElement={
                  <View style={styles.securityIcon}>
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </View>
                }
              />
              {/* Copy Nostr ID */}
              <SettingItem
                title="Copy ID"
                subtitle="Copy your public identifier"
                onPress={handleCopyNpub}
                rightElement={
                  <View style={styles.securityIcon}>
                    <Ionicons
                      name="finger-print"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </View>
                }
              />
            </Card>
          </SettingsAccordion>
        </View>

        {/* AI Agent Skill */}
        <View style={styles.section}>
          <SettingsAccordion title="RUNSTR-FITNESS SKILL" defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              <SettingItem
                title="RUNSTR Fitness Skill"
                subtitle="Connect your AI agent to your fitness data"
                onPress={() => setShowAgentSkillModal(true)}
                rightElement={
                  <View style={styles.securityIcon}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </View>
                }
              />
            </Card>
          </SettingsAccordion>
        </View>

        {/* Support & Legal Accordion */}
        <View style={styles.section}>
          <SettingsAccordion title={t('supportAndLegal')} defaultExpanded={false}>
            <Card style={styles.accordionCard}>
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
              <SettingItem
                title="Anti-Cheat Verification"
                subtitle="Request cheater investigation (5,000 rewards)"
                onPress={() => setShowAntiCheatModal(true)}
              />
            </Card>
          </SettingsAccordion>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutButtonText}>{t('signOut')}</Text>
          </TouchableOpacity>
        </View>

        {/* Delete Account - Destructive Action */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.deleteAccountButton,
              isDeletingAccount && styles.buttonDisabled,
            ]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.error} />
                <Text
                  style={[styles.deleteAccountButtonText, { marginLeft: 8 }]}
                >
                  {t('deletingAccount')}
                </Text>
              </View>
            ) : (
              <Text style={styles.deleteAccountButtonText}>{t('deleteAccount')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            {(() => {
              const ver = Constants.nativeAppVersion || Constants.expoConfig?.version || 'Unknown';
              const build = Constants.nativeBuildVersion ||
                String(Platform.OS === 'android'
                  ? Constants.expoConfig?.android?.versionCode || ''
                  : Constants.expoConfig?.ios?.buildNumber || '');
              return build ? `Version ${ver} (Build ${build})` : `Version ${ver}`;
            })()}
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={() => setAlertVisible(false)}
      />


      {/* Anti-Cheat Request Modal */}
      <AntiCheatRequestModal
        visible={showAntiCheatModal}
        onClose={() => setShowAntiCheatModal(false)}
      />

      {/* Export Data Modal */}
      <ExportDataModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Import Data Modal */}
      <ImportDataModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* Agent Skill Setup Modal */}
      <AgentSkillSetupModal
        visible={showAgentSkillModal}
        onClose={() => setShowAgentSkillModal(false)}
      />

      {/* Default Activity Picker Modal */}
      <Modal
        visible={showDefaultActivityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDefaultActivityPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDefaultActivityPicker(false)}
        >
          <View style={styles.defaultActivityPickerContainer}>
            <View style={styles.menuHandle} />
            <Text style={styles.defaultActivityPickerTitle}>Select Default Activity</Text>
            <Text style={styles.defaultActivityPickerSubtitle}>
              This activity will open when you tap "Start Workout"
            </Text>
            {(['run', 'walk', 'cycle', 'hiking'] as DefaultActivity[]).map((activity) => (
              <TouchableOpacity
                key={activity}
                style={[
                  styles.defaultActivityOption,
                  defaultActivity === activity && styles.defaultActivityOptionSelected,
                ]}
                onPress={() => handleDefaultActivityChange(activity)}
              >
                <Ionicons
                  name={defaultActivityService.getActivityIcon(activity) as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={defaultActivity === activity ? theme.colors.orangeBright : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.defaultActivityOptionText,
                    defaultActivity === activity && styles.defaultActivityOptionTextSelected,
                  ]}
                >
                  {defaultActivityService.getActivityDisplayName(activity)}
                </Text>
                {defaultActivity === activity && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* NWC Wallet Config Modal (paste) */}
      <WalletConfigModal
        visible={showWalletConfigModal}
        onClose={() => setShowWalletConfigModal(false)}
        onSuccess={handleNWCConnectSuccess}
        allowSkip={false}
      />

      {/* NWC QR Scanner Modal */}
      <QRScannerModal
        visible={showQRScannerModal}
        onClose={() => setShowQRScannerModal(false)}
        onScanned={handleNWCQRScanned}
      />

      {/* NWC QR Confirmation Modal */}
      <NWCQRConfirmationModal
        visible={showNWCQRConfirmModal}
        onClose={() => setShowNWCQRConfirmModal(false)}
        connectionString={scannedNWCString}
        onSuccess={handleNWCConnectSuccess}
      />

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

  accordionCard: {
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 12,
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  voiceSubsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  voiceControlsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  subsectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366', // Light orange to match Profile screen
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Unit Toggle Styles
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  unitLabelActive: {
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.bold,
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

  // Sign Out Button - matches LoginScreen button styling
  signOutButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.large,
    paddingVertical: 16,
    alignItems: 'center',
  },

  signOutButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background, // Black text on orange
  },

  // Delete Account Button - matches LoginScreen button styling
  deleteAccountButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.large,
    paddingVertical: 16,
    alignItems: 'center',
  },

  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background, // Black text on orange
  },

  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },

  versionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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

  // Wallet Creation Styles
  statusCheck: {
    fontSize: 18,
    color: theme.colors.primary,
  },

  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },

  createButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },

  disconnectButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  disconnectButtonText: {
    color: theme.colors.accentText,
    fontSize: 13,
    fontWeight: '600',
  },

  // TTS Settings Styles
  sliderContainer: {
    flex: 1,
  },

  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  sliderValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  slider: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },

  sliderLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    minWidth: 35,
  },

  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  testButtonDisabled: {
    opacity: 0.5,
  },

  testButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  testButtonTextDisabled: {
    color: theme.colors.textMuted,
  },

  // Wallet Section Styles
  walletBalance: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent, // Orange color for balance
    marginTop: 4,
  },

  refreshButton: {
    padding: 8,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.cardBackground,
  },

  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  walletActionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  walletActionText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 4,
  },

  disconnectWalletButton: {
    backgroundColor: theme.colors.orangeBurnt,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },

  disconnectWalletText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  // Connect Wallet Styles
  connectWalletContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  connectWalletTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },

  connectWalletDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  connectWalletButton: {
    backgroundColor: theme.colors.text, // Orange button
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectWalletButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
  },

  connectWalletButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#000', // Black text on orange button
  },

  connectWalletButtonTextSecondary: {
    color: theme.colors.text,
  },

  // Charity Selection Styles
  charityIcon: {
    marginLeft: 8,
  },

  // Competition Team Styles
  competitionTeamSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },

  competitionTeamName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    marginTop: 4,
    marginBottom: 4,
  },

  // Lightning Address Styles
  lightningAddressSection: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  lightningAddressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },

  lightningAddressInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },

  lightningAddressInputError: {
    borderColor: theme.colors.error || '#FF6B00',
  },

  lightningAddressSaveButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },

  lightningAddressSaveButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },

  lightningAddressError: {
    color: theme.colors.error || '#FF6B00',
    fontSize: 12,
    marginTop: 6,
  },

  unlockRewardsLink: {
    marginTop: 12,
  },

  unlockRewardsText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold,
  },

  // Model Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  modelPickerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34, // Account for home indicator on iOS
  },

  modelPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  modelPickerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  modalCloseButton: {
    padding: 4,
  },

  modelList: {
    maxHeight: 400,
  },

  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  modelItemSelected: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
  },

  modelName: {
    fontSize: 16,
    color: theme.colors.text,
  },

  modelNameSelected: {
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
  },

  // Rewards Subsection Styles
  rewardsSubsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  rewardSettingRow: {
    marginBottom: 8,
  },

  rewardSettingInfo: {
    flex: 1,
  },

  rewardSettingTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  rewardSettingSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  lightningAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  lightningInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lightningIcon: {
    marginRight: 8,
  },

  lightningInputWrapper: {
    flex: 1,
  },

  lightningAddressText: {
    fontSize: 14,
    color: theme.colors.text,
  },

  lightningAddressPlaceholder: {
    color: theme.colors.textMuted,
  },

  editButton: {
    padding: 8,
  },

  clearAddressButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Language Section Styles
  languageSection: {
    paddingVertical: 8,
  },
  languageSectionTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  languageSectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  languageOptionSelected: {
    borderColor: theme.colors.orangeBright,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
  },
  languageOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  languageOptionTextSelected: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },

  // Backup Security Notice
  backupSecurityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 157, 66, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  backupSecurityText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.orangeBright,
    lineHeight: 16,
  },

  // Default Activity Styles
  defaultActivityValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultActivityText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  defaultActivityPickerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  defaultActivityPickerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  defaultActivityPickerSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  defaultActivityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 8,
    gap: 16,
  },
  defaultActivityOptionSelected: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
  },
  defaultActivityOptionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  defaultActivityOptionTextSelected: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
});
