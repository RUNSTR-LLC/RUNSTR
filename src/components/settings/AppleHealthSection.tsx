/**
 * AppleHealthSection - Apple Health settings accordion for SettingsScreen (iOS only)
 */

import React from 'react';
import { View, Switch, Platform } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface AppleHealthSectionProps {
  healthKitSyncEnabled: boolean;
  healthKitAuthorized: boolean;
  healthKitLastSync: string | null;
  onHealthKitSyncToggle: (enabled: boolean) => void;
}

export const AppleHealthSection: React.FC<AppleHealthSectionProps> = ({
  healthKitSyncEnabled,
  healthKitAuthorized,
  healthKitLastSync,
  onHealthKitSyncToggle,
}) => {
  if (Platform.OS !== 'ios') return null;

  return (
    <View style={styles.section}>
      <SettingsAccordion title="Apple Health" defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <SettingItem
            title="Sync Workouts"
            subtitle="Automatically sync workouts from Apple Health"
            rightElement={
              <Switch
                value={healthKitSyncEnabled}
                onValueChange={onHealthKitSyncToggle}
                trackColor={{
                  false: theme.colors.warning,
                  true: theme.colors.accent,
                }}
                thumbColor={theme.colors.orangeBright}
              />
            }
          />
          <SettingItem
            title="Connection Status"
            subtitle={healthKitAuthorized ? 'Connected' : 'Not connected'}
          />
          {healthKitLastSync && (
            <SettingItem
              title="Last Sync"
              subtitle={(() => {
                const diff = Date.now() - new Date(healthKitLastSync).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'Just now';
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                return `${Math.floor(hrs / 24)}d ago`;
              })()}
            />
          )}
        </Card>
      </SettingsAccordion>
    </View>
  );
};
