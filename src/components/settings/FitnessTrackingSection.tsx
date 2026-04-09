/**
 * FitnessTrackingSection - Fitness tracking settings accordion for SettingsScreen
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { GPSPermissionsDiagnostics } from '../permissions/GPSPermissionsDiagnostics';
import { StepCountDiagnostics } from '../permissions/StepCountDiagnostics';
import { defaultActivityService, type DefaultActivity } from '../../services/activity/DefaultActivityService';
import type { TTSSettings } from '../../services/activity/TTSPreferencesService';
import { useTranslation } from 'react-i18next';

interface FitnessTrackingSectionProps {
  ttsSettings: TTSSettings;
  onTTSSettingChange: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
  isMetric: boolean;
  onSetUnitSystem: (system: 'metric' | 'imperial') => void;
  defaultActivity: DefaultActivity;
  showDefaultActivityPicker: boolean;
  onSetShowDefaultActivityPicker: (show: boolean) => void;
  onDefaultActivityChange: (activity: DefaultActivity) => void;
}

export const FitnessTrackingSection: React.FC<FitnessTrackingSectionProps> = ({
  ttsSettings,
  onTTSSettingChange,
  isMetric,
  onSetUnitSystem,
  defaultActivity,
  showDefaultActivityPicker,
  onSetShowDefaultActivityPicker,
  onDefaultActivityChange,
}) => {
  const { t } = useTranslation('settings');

  return (
    <>
      <View style={styles.section}>
        <SettingsAccordion title={t('fitnessTracking')} defaultExpanded={false}>
          <Card style={styles.accordionCard}>

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
                      onTTSSettingChange('enabled', value)
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
                      onTTSSettingChange('announceOnSummary', value)
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
                      onTTSSettingChange('includeSplits', value)
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
                      onTTSSettingChange('announceLiveSplits', value)
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
                      onValueChange={(v) => onSetUnitSystem(v ? 'imperial' : 'metric')}
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
                onPress={() => onSetShowDefaultActivityPicker(true)}
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

      {/* Default Activity Picker Modal */}
      <Modal
        visible={showDefaultActivityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => onSetShowDefaultActivityPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => onSetShowDefaultActivityPicker(false)}
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
                onPress={() => onDefaultActivityChange(activity)}
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
    </>
  );
};
