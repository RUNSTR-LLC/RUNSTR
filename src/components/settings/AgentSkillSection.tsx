/**
 * AgentSkillSection - AI Agent Skill accordion for SettingsScreen
 */

import React from 'react';
import { View } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface AgentSkillSectionProps {
  onShowAgentSkillModal: () => void;
}

export const AgentSkillSection: React.FC<AgentSkillSectionProps> = ({
  onShowAgentSkillModal,
}) => {
  return (
    <View style={styles.section}>
      <SettingsAccordion title="RUNSTR-FITNESS SKILL" defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <SettingItem
            title="RUNSTR Fitness Skill"
            subtitle="Connect your AI agent to your fitness data"
            onPress={onShowAgentSkillModal}
            rightElement={
              <View style={styles.securityIcon}>
                <Ionicons
                  name="hardware-chip-outline"
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
