/**
 * FitnessTrackingSection - Fitness tracking settings accordion for SettingsScreen
 */

import React from 'react';
import { View, Text, Platform } from 'react-native';
import { ThemedSwitch } from '../ui/ThemedSwitch';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { GPSPermissionsDiagnostics } from '../permissions/GPSPermissionsDiagnostics';
import type { TTSSettings } from '../../services/activity/TTSPreferencesService';
import { useTranslation } from 'react-i18next';

interface FitnessTrackingSectionProps {
  ttsSettings: TTSSettings;
  onTTSSettingChange: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
  isMetric: boolean;
  onSetUnitSystem: (system: 'metric' | 'imperial') => void;
  // Apple Health (iOS)
  healthKitSyncEnabled: boolean;
  healthKitAuthorized: boolean;
  healthKitLastSync: string | null;
  onHealthKitSyncToggle: (enabled: boolean) => void;
  // Health Connect (Android)
  healthConnectSyncEnabled: boolean;
  healthConnectAvailable: boolean;
  healthConnectAuthorized: boolean;
  healthConnectLastSync: string | null;
  onHealthConnectSyncToggle: (enabled: boolean) => void;
}

export const FitnessTrackingSection: React.FC<FitnessTrackingSectionProps> = ({
  ttsSettings,
  onTTSSettingChange,
  isMetric,
  onSetUnitSystem,
  healthKitSyncEnabled,
  healthKitAuthorized,
  healthKitLastSync,
  onHealthKitSyncToggle,
  healthConnectSyncEnabled,
  healthConnectAvailable,
  healthConnectAuthorized,
  healthConnectLastSync,
  onHealthConnectSyncToggle,
}) => {
  const formatLastSync = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const { t } = useTranslation('settings');

  return (
    <>
      <View style={styles.section}>
        <SettingsAccordion title={t('fitnessTracking')} defaultExpanded={false}>
          <Card style={styles.accordionCard}>

            {/* GPS Permissions Diagnostics (Android only) */}
            {Platform.OS === 'android' && <GPSPermissionsDiagnostics />}

            {/* Apple Health Subsection (iOS only) */}
            {Platform.OS === 'ios' && (
              <View style={styles.voiceSubsection}>
                <Text style={styles.subsectionTitle}>Apple Health</Text>
                <SettingItem
                  title="Sync Workouts"
                  subtitle="Import runs from Apple Health when you open RUNSTR"
                  rightElement={
                    <ThemedSwitch
                      value={healthKitSyncEnabled}
                      onValueChange={onHealthKitSyncToggle}
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
                    subtitle={formatLastSync(healthKitLastSync)}
                  />
                )}
              </View>
            )}

            {/* Health Connect Subsection (Android only) */}
            {Platform.OS === 'android' && (
              <View style={styles.voiceSubsection}>
                <Text style={styles.subsectionTitle}>Health Connect</Text>
                <SettingItem
                  title="Sync Workouts"
                  subtitle={
                    healthConnectAvailable
                      ? 'Import runs from Health Connect when you open RUNSTR'
                      : 'Health Connect not installed on this device'
                  }
                  rightElement={
                    <ThemedSwitch
                      value={healthConnectSyncEnabled && healthConnectAvailable}
                      onValueChange={onHealthConnectSyncToggle}
                      disabled={!healthConnectAvailable}
                    />
                  }
                />
                <SettingItem
                  title="Connection Status"
                  subtitle={
                    !healthConnectAvailable
                      ? 'Not available'
                      : healthConnectAuthorized
                      ? 'Connected'
                      : 'Not connected'
                  }
                />
                {healthConnectLastSync && (
                  <SettingItem
                    title="Last Sync"
                    subtitle={formatLastSync(healthConnectLastSync)}
                  />
                )}
              </View>
            )}

            {/* Voice Announcements Subsection */}
            <View style={styles.voiceSubsection}>
              <Text style={styles.subsectionTitle}>Voice Announcements</Text>

              {/* Enable TTS */}
              <SettingItem
                title="Enable Voice Announcements"
                subtitle="Hear run stats read aloud"
                rightElement={
                  <ThemedSwitch
                    value={ttsSettings.enabled}
                    onValueChange={(value) =>
                      onTTSSettingChange('enabled', value)
                    }
                  />
                }
              />

              {/* Announce on Summary */}
              <SettingItem
                title="Run Summary"
                subtitle="Announce stats when a run finishes"
                rightElement={
                  <ThemedSwitch
                    value={ttsSettings.announceOnSummary}
                    onValueChange={(value) =>
                      onTTSSettingChange('announceOnSummary', value)
                    }
                    disabled={!ttsSettings.enabled}
                  />
                }
              />

              {/* Live Split Announcements */}
              <SettingItem
                title="Live Split Announcements"
                subtitle={isMetric ? "Announce each kilometer as you run" : "Announce each mile as you run"}
                rightElement={
                  <ThemedSwitch
                    value={ttsSettings.announceLiveSplits}
                    onValueChange={(value) =>
                      onTTSSettingChange('announceLiveSplits', value)
                    }
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
                    <ThemedSwitch
                      value={!isMetric}
                      onValueChange={(v) => onSetUnitSystem(v ? 'imperial' : 'metric')}
                    />
                    <Text style={[styles.unitLabel, !isMetric && styles.unitLabelActive]}>mi</Text>
                  </View>
                }
              />
            </View>

          </Card>
        </SettingsAccordion>
      </View>

    </>
  );
};
