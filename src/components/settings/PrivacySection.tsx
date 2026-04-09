/**
 * PrivacySection - Privacy settings accordion for SettingsScreen
 */

import React from 'react';
import { View, Switch } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface PrivacySectionProps {
  privateModeEnabled: boolean;
  onPrivateModeToggle: (value: boolean) => void;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({
  privateModeEnabled,
  onPrivateModeToggle,
}) => {
  return (
    <View style={styles.section}>
      <SettingsAccordion title="Privacy" defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <SettingItem
            title="Private Mode"
            subtitle="Workouts stay on your device. Competitions and rewards require this to be off."
            rightElement={
              <Switch
                value={privateModeEnabled}
                onValueChange={onPrivateModeToggle}
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
  );
};
