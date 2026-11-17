/**
 * useSettingsState - Custom hook encapsulating all SettingsScreen state and handlers
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  TTSPreferencesService,
  type TTSSettings,
} from '../services/activity/TTSPreferencesService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import RNRestart from 'react-native-restart';
import { AuthService } from '../services/auth/authService';
import Toast from 'react-native-toast-message';
import { useUnitPreference } from '../hooks/useUnitPreference';
import { useTranslation } from 'react-i18next';
import { AutoBackupService } from '../services/backup/AutoBackupService';
import { BackupService } from '../services/backup/BackupService';
import { SecureNsecStorage } from '../services/auth/SecureNsecStorage';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

      const autoBackup = await AutoBackupService.getInstance().isAutoBackupEnabled();
      setAutoBackupEnabled(autoBackup);
      const backupTime = await BackupService.getInstance().getLastBackupTime();
      setLastBackupTime(backupTime);

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
        } else {
          showAlert('Apple Health Access',
            'RUNSTR needs access to Apple Health to sync your workouts automatically.\n\n' +
            'You can enable this in Settings > Privacy & Security > Health > RUNSTR.',
            [{ text: 'OK' }]);
        }
      } else {
        await AsyncStorage.setItem('@runstr:healthkit_sync_enabled', 'false');
        setHealthKitSyncEnabled(false);
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
      }
    } catch (error) {
      console.error('[Settings] Health Connect sync toggle error:', error);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

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
    const warningDetails =
      'This action will:\n\n' +
      '• Permanently remove your nsec from this device\n' +
      '• Delete your run history from this device\n\n' +
      'Runs already published to Nostr stay on relays.\n\n' +
      'This action CANNOT be undone!';

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
                  try {
                    await SecureNsecStorage.clearNsec();
                    // Wipe this account; runs other accounts left on this
                    // phone at sign-out (local_workouts:<pubkey>) stay theirs
                    const keys = await AsyncStorage.getAllKeys();
                    await AsyncStorage.multiRemove(
                      keys.filter((k) => !k.startsWith('local_workouts:'))
                    );
                    await SecureStore.deleteItemAsync('nwc_string').catch(() => {});
                    RNRestart.restart();
                  } catch (error) {
                    console.error('[Settings] Delete account failed:', error);
                    setTimeout(() => {
                      showAlert(
                        'Couldn’t delete account',
                        'Something went wrong. Please try again.',
                        [{ text: 'OK' }]
                      );
                    }, 100);
                  }
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

  const handleBackupPassword = () => {
    if (!userNsec) {
      showAlert('No nsec on this device', 'You signed in with an external signer, so your key is not stored in RUNSTR.', [{ text: 'OK' }]);
      return;
    }

    showAlert('Back Up Your nsec',
      'Your nsec is the private key to your Nostr account.\n\n' +
        '• It is only stored on this phone - RUNSTR keeps no copy\n' +
        '• If you lose it, you lose access to this account\n' +
        '• Anyone who has it can post as you - never share it\n\n' +
        'Copy your nsec now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy nsec',
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(userNsec);
              hideAlert();
              setTimeout(() => {
                showAlert('nsec Copied',
                  'Paste it into a password manager now, then clear your clipboard.',
                  [{ text: 'OK', style: 'default' }]);
              }, 100);
            } catch (error) {
              console.error('Failed to copy nsec:', error);
              hideAlert();
              setTimeout(() => {
                showAlert('Error', 'Failed to copy your nsec. Please try again.', [{ text: 'OK' }]);
              }, 100);
            }
          },
        },
      ]);
  };

  const handleCopyNpub = async () => {
    if (userNpub) {
      await Clipboard.setStringAsync(userNpub);
      Toast.show({ type: 'success', text1: 'npub copied', text2: 'Your public Nostr ID is on the clipboard', position: 'top', visibilityTime: 2000 });
    }
  };

  // The agent only needs the public npub: published runs are public 1301 notes.
  const handleCopyAgentPrompt = async () => {
    if (!userNpub) return;
    await Clipboard.setStringAsync(
      `Use the runstr-fitness skill to read my runs from Nostr. My npub is ${userNpub}`
    );
    Toast.show({ type: 'success', text1: 'Copied', text2: 'Paste it to your AI agent', position: 'top', visibilityTime: 2500 });
  };

  return {
    isMetric, setUnitSystem, isDeletingAccount, userNsec, userNpub,
    ttsSettings,
    showExportModal, setShowExportModal, showImportModal, setShowImportModal,
    autoBackupEnabled, lastBackupTime, isRefreshing,
    healthKitSyncEnabled, healthKitAuthorized, healthKitLastSync,
    healthConnectSyncEnabled, healthConnectAvailable, healthConnectAuthorized, healthConnectLastSync,
    alert, hideAlert,
    handleTTSSettingChange, handleAutoBackupToggle, handleHealthKitSyncToggle,
    handleHealthConnectSyncToggle, handleBack,
    handleSignOut, handleDeleteAccount, handleRefresh,
    handleBackupPassword, handleCopyNpub, handleCopyAgentPrompt,
  };
}
