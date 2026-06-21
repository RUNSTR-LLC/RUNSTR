/**
 * useSettingsState - Custom hook encapsulating all SettingsScreen state and handlers
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  TTSPreferencesService,
  type TTSSettings,
} from '../services/activity/TTSPreferencesService';
import { DeleteAccountService } from '../services/auth/DeleteAccountService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import RNRestart from 'react-native-restart';
import { AuthService } from '../services/auth/authService';
import Toast from 'react-native-toast-message';
import { useUnitPreference } from '../hooks/useUnitPreference';
import { useTranslation } from 'react-i18next';
import { LanguagePreferenceService } from '../services/i18n/LanguagePreferenceService';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n';
import { MusicPlayerPreferencesService } from '../services/music/MusicPlayerPreferencesService';
import { WoTService } from '../services/wot/WoTService';
import { AutoBackupService } from '../services/backup/AutoBackupService';
import { BackupService } from '../services/backup/BackupService';
import { SecureNsecStorage } from '../services/auth/SecureNsecStorage';
import { defaultActivityService, type DefaultActivity } from '../services/activity/DefaultActivityService';
import { NWCStorageService } from '../services/wallet/NWCStorageService';
import { NWCWalletService } from '../services/wallet/NWCWalletService';
import type { QRData } from '../services/qr/QRCodeService';

export interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
}

export function useSettingsState(onSignOut?: () => void | Promise<void>) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('settings');
  const { isMetric, setUnitSystem } = useUnitPreference();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    LanguagePreferenceService.getCurrentLanguage()
  );
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
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);
  const [musicPlayerHeaderEnabled, setMusicPlayerHeaderEnabled] = useState(false);
  const [wotScore, setWotScore] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [defaultActivity, setDefaultActivity] = useState<DefaultActivity>('run');
  const [showDefaultActivityPicker, setShowDefaultActivityPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNWCWallet, setHasNWCWallet] = useState(false);
  const [showWalletConfigModal, setShowWalletConfigModal] = useState(false);
  const [showQRScannerModal, setShowQRScannerModal] = useState(false);
  const [showNWCQRConfirmModal, setShowNWCQRConfirmModal] = useState(false);
  const [scannedNWCString, setScannedNWCString] = useState('');
  const [showAgentSkillModal, setShowAgentSkillModal] = useState(false);
  const [privateModeEnabled, setPrivateModeEnabled] = useState(false);
  const [healthKitSyncEnabled, setHealthKitSyncEnabled] = useState(false);
  const [healthKitAuthorized, setHealthKitAuthorized] = useState(false);
  const [healthKitLastSync, setHealthKitLastSync] = useState<string | null>(null);
  const [healthConnectSyncEnabled, setHealthConnectSyncEnabled] = useState(false);
  const [healthConnectAvailable, setHealthConnectAvailable] = useState(false);
  const [healthConnectAuthorized, setHealthConnectAuthorized] = useState(false);
  const [healthConnectLastSync, setHealthConnectLastSync] = useState<string | null>(null);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (title: string, message: string, buttons: AlertState['buttons']) => {
    setAlert({ visible: true, title, message, buttons });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const ttsPrefs = await TTSPreferencesService.getTTSSettings();
      setTtsSettings(ttsPrefs);

      const npub = await AsyncStorage.getItem('@runstr:npub');
      const nsec = await SecureNsecStorage.getNsec();

      setUserNsec(nsec);
      setUserNpub(npub);

      const musicHeaderEnabled = await MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled();
      setMusicPlayerHeaderEnabled(musicHeaderEnabled);

      const savedDefaultActivity = await defaultActivityService.getDefault();
      setDefaultActivity(savedDefaultActivity);

      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (pubkey) {
        try {
          const wotService = WoTService.getInstance();
          const score = await wotService.getCachedScore(pubkey);
          setWotScore(score);
        } catch (wotError) {
          console.warn('[Settings] WoT score load failed:', wotError);
        }
      }

      const autoBackup = await AutoBackupService.getInstance().isAutoBackupEnabled();
      setAutoBackupEnabled(autoBackup);
      const backupTime = await BackupService.getInstance().getLastBackupTime();
      setLastBackupTime(backupTime);

      const nwcAvailable = await NWCStorageService.hasNWC();
      setHasNWCWallet(nwcAvailable);

      const privateMode = await AsyncStorage.getItem('@runstr:private_mode');
      setPrivateModeEnabled(privateMode === 'true');

      if (Platform.OS === 'ios') {
        try {
          const hkSyncPref = await AsyncStorage.getItem('@runstr:healthkit_sync_enabled');
          setHealthKitSyncEnabled(hkSyncPref !== 'false');
          const { HealthKitService } = await import('../services/fitness/healthKitService');
          const hkService = HealthKitService.getInstance();
          const status = hkService.getStatus();
          setHealthKitAuthorized(status.authorized);
          setHealthKitLastSync(status.lastSyncAt ?? null);
        } catch (hkError) {
          console.warn('[Settings] HealthKit status load failed:', hkError);
        }
      }

      if (Platform.OS === 'android') {
        try {
          const hcSyncPref = await AsyncStorage.getItem('@runstr:healthconnect_sync_enabled');
          setHealthConnectSyncEnabled(hcSyncPref !== 'false');
          const { default: hcService } = await import('../services/fitness/healthConnectService');
          const status = hcService.getStatus();
          setHealthConnectAvailable(status.available);
          setHealthConnectAuthorized(status.authorized);
          setHealthConnectLastSync(status.lastSyncAt ?? null);
        } catch (hcError) {
          console.warn('[Settings] Health Connect status load failed:', hcError);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleDisconnectWallet = () => {
    showAlert('Disconnect Wallet?', 'This will remove your NWC wallet connection. You can reconnect anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          NWCWalletService.disconnect();
          setHasNWCWallet(false);
          Toast.show({ type: 'success', text1: 'Wallet Disconnected', text2: 'NWC connection removed', position: 'top', visibilityTime: 3000 });
        },
      },
    ]);
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
    Toast.show({ type: 'success', text1: 'Wallet Connected', position: 'bottom', visibilityTime: 2000 });
  };

  const handleTTSSettingChange = async <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
    try {
      setTtsSettings((prev) => ({ ...prev, [key]: value }));
      const updatedSettings = await TTSPreferencesService.updateTTSSetting(key, value);
      setTtsSettings(updatedSettings);
    } catch (error) {
      console.error(`Error updating TTS setting ${key}:`, error);
      const currentSettings = await TTSPreferencesService.getTTSSettings();
      setTtsSettings(currentSettings);
    }
  };

  const handleAutoBackupToggle = async (enabled: boolean) => {
    try {
      await AutoBackupService.getInstance().setAutoBackupEnabled(enabled);
      setAutoBackupEnabled(enabled);
      Toast.show({ type: 'success', text1: enabled ? 'Auto-Backup On' : 'Auto-Backup Off', position: 'bottom', visibilityTime: 2000 });
    } catch (error) {
      console.error('Error saving auto-backup setting:', error);
      const current = await AutoBackupService.getInstance().isAutoBackupEnabled();
      setAutoBackupEnabled(current);
    }
  };

  const handleHealthKitSyncToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const { HealthKitService } = await import('../services/fitness/healthKitService');
        const hkService = HealthKitService.getInstance();
        const result = await hkService.requestPermissions();
        if (result.success) {
          await AsyncStorage.setItem('@runstr:healthkit_sync_enabled', 'true');
          setHealthKitSyncEnabled(true);
          setHealthKitAuthorized(true);
          const { HealthKitBackgroundService } = await import('../services/fitness/HealthKitBackgroundService');
          const bgService = HealthKitBackgroundService.getInstance();
          await bgService.setupBackgroundDelivery();
        } else {
          showAlert('Apple Health Access',
            'RUNSTR needs access to Apple Health to sync your workouts automatically.\n\n' +
            'You can enable this in Settings > Privacy & Security > Health > RUNSTR.',
            [{ text: 'OK' }]);
        }
      } else {
        await AsyncStorage.setItem('@runstr:healthkit_sync_enabled', 'false');
        setHealthKitSyncEnabled(false);
        const { HealthKitBackgroundService } = await import('../services/fitness/HealthKitBackgroundService');
        const bgService = HealthKitBackgroundService.getInstance();
        await bgService.cleanup();
      }
    } catch (error) {
      console.error('[Settings] HealthKit sync toggle error:', error);
    }
  };

  const handleHealthConnectSyncToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const { default: hcService } = await import('../services/fitness/healthConnectService');
        if (!hcService.getStatus().available) {
          showAlert(
            'Health Connect Unavailable',
            'Health Connect is not installed or not supported on this device. Install it from the Play Store, then try again.',
            [{ text: 'OK' }]
          );
          return;
        }
        const result = await hcService.requestPermissions();
        if (result.success) {
          await AsyncStorage.setItem('@runstr:healthconnect_sync_enabled', 'true');
          setHealthConnectSyncEnabled(true);
          setHealthConnectAuthorized(true);
          const { BackgroundSyncRegistration } = await import('../services/fitness/BackgroundSyncRegistration');
          await BackgroundSyncRegistration.register();
        } else {
          showAlert(
            'Health Connect Access',
            'RUNSTR needs access to Health Connect to sync your workouts automatically.\n\n' +
              'Open Health Connect from your device settings to grant permission, then try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        await AsyncStorage.setItem('@runstr:healthconnect_sync_enabled', 'false');
        setHealthConnectSyncEnabled(false);
        const { BackgroundSyncRegistration } = await import('../services/fitness/BackgroundSyncRegistration');
        await BackgroundSyncRegistration.unregister();
      }
    } catch (error) {
      console.error('[Settings] Health Connect sync toggle error:', error);
    }
  };

  const handleMusicPlayerHeaderToggle = async (enabled: boolean) => {
    try {
      await MusicPlayerPreferencesService.setMusicPlayerHeaderEnabled(enabled);
      setMusicPlayerHeaderEnabled(enabled);
    } catch (error) {
      console.error('Error saving music player header setting:', error);
      const current = await MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled();
      setMusicPlayerHeaderEnabled(current);
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
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save default activity', position: 'top' });
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleAllWorkoutsPress = useCallback(() => {
    navigation.navigate('WorkoutHistory', {
      userId: userNpub ?? '',
      pubkey: userNpub ?? '',
    });
  }, [navigation, userNpub]);

  const handleRewardsPress = useCallback(() => {
    navigation.navigate('Rewards');
  }, [navigation]);

  const handleSignOut = async () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          hideAlert();
          if (onSignOut) {
            await onSignOut();
            return;
          }
          await AuthService.signOut();
          await SecureStore.deleteItemAsync('user_nsec_secure');
          await SecureStore.deleteItemAsync('nwc_string');
          await AsyncStorage.multiRemove([
            '@runstr:user_nsec', '@runstr:npub', '@runstr:hex_pubkey',
            '@runstr:auth_method', '@runstr:amber_pubkey',
          ]);
          RNRestart.restart();
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    const deleteService = DeleteAccountService.getInstance();
    const dataSummary = await deleteService.getDataSummary();

    let warningDetails = 'This action will:\n\n';
    warningDetails += '• Permanently remove your password from this device\n';
    if (dataSummary.hasWallet) {
      warningDetails += '• Delete your wallet and any remaining balance\n';
    }
    if (dataSummary.teamCount > 0) {
      warningDetails += `• Remove you from ${dataSummary.teamCount} team${dataSummary.teamCount > 1 ? 's' : ''}\n`;
    }
    if (dataSummary.workoutCount > 0) {
      warningDetails += `• Delete ${dataSummary.workoutCount} cached workout${dataSummary.workoutCount > 1 ? 's' : ''}\n`;
    }
    warningDetails += '• Request deletion from servers (cannot be guaranteed)\n';
    warningDetails += '\nThis action CANNOT be undone!';

    showAlert('Delete Account', 'Are you sure you want to permanently delete your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          hideAlert();
          setTimeout(() => {
            showAlert('Final Warning', warningDetails, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete Account',
                style: 'destructive',
                onPress: async () => {
                  hideAlert();
                  await AsyncStorage.clear();
                  await SecureStore.deleteItemAsync('nwc_string');
                  RNRestart.restart();
                },
              },
            ]);
          }, 100);
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadSettings();
    } catch (error) {
      console.error('[SettingsScreen] Settings refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrivateModeToggle = async (value: boolean) => {
    try {
      setPrivateModeEnabled(value);
      await AsyncStorage.setItem('@runstr:private_mode', value ? 'true' : 'false');
      Toast.show({
        type: 'success',
        text1: value ? 'Private Mode On' : 'Private Mode Off',
        text2: value ? 'Workouts stay on your device' : 'Workouts can be shared',
        position: 'bottom',
        visibilityTime: 2000,
      });
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
      showAlert('Error', 'No account key found. Please sign in again.', [{ text: 'OK' }]);
      return;
    }

    showAlert('Backup Your Password',
      'Your password is the master key to your account.\n\n' +
        'IMPORTANT:\n' +
        '• We do not keep backups of passwords\n' +
        '• Your password is only stored locally on your phone\n' +
        '• If you lose your password, you lose access to your account\n' +
        '• Keep your password safe - write it down or use a password manager\n' +
        '• NEVER share it with anyone\n' +
        '• This is the ONLY way to recover your account\n\n' +
        'Would you like to copy your password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Copy Password',
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(userNsec);
              hideAlert();
              setTimeout(() => {
                showAlert('Password Copied',
                  'Your password has been copied to your clipboard.\n\n' +
                    'Security Tips:\n' +
                    '1. Paste it in a secure password manager NOW\n' +
                    '2. Clear your clipboard after saving it\n' +
                    '3. Never paste it in untrusted apps\n' +
                    '4. Remember: We do not keep backups - if you lose it, your account is gone forever',
                  [{ text: 'I Understand', style: 'default' }]);
              }, 100);
            } catch (error) {
              console.error('Failed to copy nsec:', error);
              hideAlert();
              setTimeout(() => {
                showAlert('Error', 'Failed to copy password. Please try again.', [{ text: 'OK' }]);
              }, 100);
            }
          },
        },
      ]);
  };

  const handleCopyNpub = async () => {
    if (userNpub) {
      await Clipboard.setStringAsync(userNpub);
      Toast.show({ type: 'success', text1: 'Copied!', text2: 'Your npub has been copied to clipboard', position: 'top', visibilityTime: 2000 });
    }
  };

  return {
    isMetric, setUnitSystem, currentLanguage, isDeletingAccount, userNsec,
    ttsSettings, musicPlayerHeaderEnabled, wotScore,
    showExportModal, setShowExportModal, showImportModal, setShowImportModal,
    autoBackupEnabled, lastBackupTime, defaultActivity,
    showDefaultActivityPicker, setShowDefaultActivityPicker, isRefreshing,
    hasNWCWallet, showWalletConfigModal, setShowWalletConfigModal,
    showQRScannerModal, setShowQRScannerModal,
    showNWCQRConfirmModal, setShowNWCQRConfirmModal, scannedNWCString,
    showAgentSkillModal, setShowAgentSkillModal, privateModeEnabled,
    healthKitSyncEnabled, healthKitAuthorized, healthKitLastSync,
    healthConnectSyncEnabled, healthConnectAvailable, healthConnectAuthorized, healthConnectLastSync,
    showAntiCheatModal, setShowAntiCheatModal, alert, hideAlert,
    handleDisconnectWallet, handleNWCQRScanned, handleNWCConnectSuccess,
    handleTTSSettingChange, handleAutoBackupToggle, handleHealthKitSyncToggle,
    handleHealthConnectSyncToggle,
    handleMusicPlayerHeaderToggle, handleDefaultActivityChange, handleBack,
    handleAllWorkoutsPress,
    handleRewardsPress,
    handleSignOut, handleDeleteAccount, handleRefresh, handlePrivateModeToggle,
    handleLanguageChange, handleBackupPassword, handleCopyNpub,
  };
}
