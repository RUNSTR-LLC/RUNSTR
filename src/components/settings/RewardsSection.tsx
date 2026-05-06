/**
 * RewardsSection — Settings entry that navigates to RewardsScreen.
 * Placed above SupportLegalSection in SettingsScreen.
 */

import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface RewardsSectionProps {
  onRewardsPress: () => void;
}

export const RewardsSection: React.FC<RewardsSectionProps> = ({
  onRewardsPress,
}) => (
  <View style={styles.section}>
    <SettingsAccordion title="Rewards" defaultExpanded={false}>
      <Card style={styles.accordionCard}>
        <SettingItem
          title="Rewards"
          subtitle="Choose where your rewards go"
          onPress={onRewardsPress}
          rightElement={
            <View style={styles.securityIcon}>
              <Ionicons
                name="flash-outline"
                size={20}
                color={theme.colors.text}
              />
            </View>
          }
        />
      </Card>
    </SettingsAccordion>
  </View>
);
