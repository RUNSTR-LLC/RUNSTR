/**
 * DataBackupSection - Data & Backup settings accordion for SettingsScreen
 */

import React from 'react';
import { View, Text, Switch } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface DataBackupSectionProps {
  autoBackupEnabled: boolean;
  lastBackupTime: string | null;
  onAutoBackupToggle: (enabled: boolean) => void;
  onShowExportModal: () => void;
  onShowImportModal: () => void;
}

export const DataBackupSection: React.FC<DataBackupSectionProps> = ({
  autoBackupEnabled,
  lastBackupTime,
  onAutoBackupToggle,
  onShowExportModal,
  onShowImportModal,
}) => {
  return (
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
                onValueChange={onAutoBackupToggle}
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
            onPress={onShowExportModal}
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
            onPress={onShowImportModal}
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
  );
};
