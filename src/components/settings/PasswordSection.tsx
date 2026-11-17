/**
 * PasswordSection - "Nostr Keys" accordion for SettingsScreen: back up the
 * nsec, copy the npub, and hand the npub to an AI agent.
 */

import React from 'react';
import { View } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface PasswordSectionProps {
  userNsec: string | null;
  hasNpub: boolean;
  onBackupPassword: () => void;
  onCopyNpub: () => void;
  onCopyAgentPrompt: () => void;
}

const icon = (name: keyof typeof Ionicons.glyphMap) => (
  <View style={styles.securityIcon}>
    <Ionicons name={name} size={20} color={theme.colors.textMuted} />
  </View>
);

export const PasswordSection: React.FC<PasswordSectionProps> = ({
  userNsec,
  hasNpub,
  onBackupPassword,
  onCopyNpub,
  onCopyAgentPrompt,
}) => (
  <View style={styles.section}>
    <SettingsAccordion title="NOSTR KEYS" defaultExpanded={false}>
      <Card style={styles.accordionCard}>
        <SettingItem
          title="Back up nsec"
          subtitle={
            userNsec
              ? 'Your private key. Keep it safe, never share it'
              : 'Held by your signer, not stored in RUNSTR'
          }
          onPress={onBackupPassword}
          rightElement={icon('lock-closed')}
        />
        <SettingItem
          title="Copy npub"
          subtitle="Your public Nostr ID"
          onPress={onCopyNpub}
          rightElement={icon('finger-print')}
        />
        {hasNpub && (
          <SettingItem
            title="Share runs with your AI agent"
            subtitle="Copies a prompt with your npub. Your agent reads your published runs from Nostr with the runstr-fitness skill"
            onPress={onCopyAgentPrompt}
            rightElement={icon('sparkles-outline')}
          />
        )}
      </Card>
    </SettingsAccordion>
  </View>
);
