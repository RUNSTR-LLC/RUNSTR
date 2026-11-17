/**
 * SupportLegalSection - Support & Legal accordion for SettingsScreen
 */

import React from 'react';
import { View } from 'react-native';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { useTranslation } from 'react-i18next';

interface SupportLegalSectionProps {
  onHelp?: () => void;
  onPrivacyPolicy?: () => void;
}

export const SupportLegalSection: React.FC<SupportLegalSectionProps> = ({
  onHelp,
  onPrivacyPolicy,
}) => {
  const { t } = useTranslation('settings');

  return (
    <View style={styles.section}>
      <SettingsAccordion title={t('supportAndLegal')} defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <SettingItem
            title="Help & Support"
            subtitle="FAQ and troubleshooting"
            onPress={onHelp}
          />
          <SettingItem
            title="Privacy Policy"
            subtitle="What RUNSTR stores and publishes"
            onPress={onPrivacyPolicy}
          />
        </Card>
      </SettingsAccordion>
    </View>
  );
};
