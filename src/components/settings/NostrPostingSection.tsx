/**
 * NostrPostingSection - "Nostr" settings accordion.
 *
 * One control: auto-publish each finished run as a kind 1301 note (default
 * on). Runs are always saved on this device regardless.
 *
 * Self-contained: reads/writes NostrPostingPreferencesService directly.
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ThemedSwitch } from '../ui/ThemedSwitch';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { NostrPostingPreferencesService } from '../../services/activity/NostrPostingPreferencesService';

export const NostrPostingSection: React.FC = () => {
  // Initial value matches the service default (on) to avoid an off→on flicker
  // while the stored preference loads.
  const [autoPost, setAutoPost] = useState(true);

  useEffect(() => {
    NostrPostingPreferencesService.isAutoPostEnabled().then(setAutoPost);
  }, []);

  const onToggleAutoPost = async (value: boolean) => {
    setAutoPost(value);
    await NostrPostingPreferencesService.setAutoPostEnabled(value);
  };

  return (
    <View style={styles.section}>
      <SettingsAccordion title="NOSTR" defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <SettingItem
            title="Publish runs to Nostr"
            subtitle="Each finished run becomes a public workout note other Nostr apps can read. Off: runs stay on this device until you publish them from History."
            rightElement={
              <ThemedSwitch value={autoPost} onValueChange={onToggleAutoPost} />
            }
          />
        </Card>
      </SettingsAccordion>
    </View>
  );
};
