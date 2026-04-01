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
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onShowAntiCheatModal: () => void;
}

export const SupportLegalSection: React.FC<SupportLegalSectionProps> = ({
  onHelp,
  onContactSupport,
  onPrivacyPolicy,
  onShowAntiCheatModal,
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
            title="Contact Support"
            subtitle="Get direct help"
            onPress={onContactSupport}
          />
          <SettingItem
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={onPrivacyPolicy}
          />
          <SettingItem
            title="Anti-Cheat Verification"
            subtitle="Request cheater investigation (5,000 rewards)"
            onPress={onShowAntiCheatModal}
          />
        </Card>
      </SettingsAccordion>
    </View>
  );
};
