/**
 * PasswordSection - Password/key management accordion for SettingsScreen
 */

import React from 'react';
import { View } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { useTranslation } from 'react-i18next';

interface PasswordSectionProps {
  userNsec: string | null;
  onBackupPassword: () => void;
  onCopyNpub: () => void;
}

export const PasswordSection: React.FC<PasswordSectionProps> = ({
  userNsec,
  onBackupPassword,
  onCopyNpub,
}) => {
  const { t } = useTranslation('settings');

  return (
    <View style={styles.section}>
      <SettingsAccordion title={t('password')} defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          {/* Account Security */}
          <SettingItem
            title="Backup Password"
            subtitle={
              userNsec ? 'Tap to backup your account key' : 'Not available'
            }
            onPress={onBackupPassword}
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
            onPress={onCopyNpub}
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
  );
};
