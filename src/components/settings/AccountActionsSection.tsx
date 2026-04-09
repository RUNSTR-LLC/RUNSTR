/**
 * AccountActionsSection - Sign out, delete account, version info for SettingsScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { theme } from '../../styles/theme';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

interface AccountActionsSectionProps {
  isDeletingAccount: boolean;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export const AccountActionsSection: React.FC<AccountActionsSectionProps> = ({
  isDeletingAccount,
  onSignOut,
  onDeleteAccount,
}) => {
  const { t } = useTranslation('settings');

  return (
    <>
      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={onSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutButtonText}>{t('signOut')}</Text>
        </TouchableOpacity>
      </View>

      {/* Delete Account */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.deleteAccountButton,
            isDeletingAccount && styles.buttonDisabled,
          ]}
          onPress={onDeleteAccount}
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
    </>
  );
};
