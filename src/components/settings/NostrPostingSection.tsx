/**
 * NostrPostingSection - "Sharing to Nostr" settings accordion.
 *
 * Controls:
 *  - Auto-post workouts: automatically share each finished workout (default off).
 *  - Post format: what the Post action produces — a card post (every Nostr app)
 *    or a workout note (structured data, native in Amethyst). Currently HIDDEN
 *    (SHOW_FORMAT_TOGGLE = false); every Post defaults to a workout note (1301).
 *
 * Self-contained: reads/writes NostrPostingPreferencesService directly.
 * Workouts are always saved regardless of these settings.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { ThemedSwitch } from '../ui/ThemedSwitch';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import {
  NostrPostingPreferencesService,
  type PostFormat,
} from '../../services/activity/NostrPostingPreferencesService';

// Format toggle is hidden for now — every Post defaults to a workout note
// (kind 1301) for cross-app interop (Amethyst/POWR/Chachi). Flip this to true
// to bring the Card post / Workout note picker back.
const SHOW_FORMAT_TOGGLE = false;

const FORMAT_OPTIONS: { value: PostFormat; title: string; subtitle: string }[] = [
  {
    value: 'kind1',
    title: 'Card post',
    subtitle: 'A workout card — shows in every Nostr app',
  },
  {
    value: 'kind1301',
    title: 'Workout note',
    subtitle: 'Structured workout data — shows natively in Amethyst',
  },
];

export const NostrPostingSection: React.FC = () => {
  const [autoPost, setAutoPost] = useState(false);
  const [format, setFormat] = useState<PostFormat>('kind1');

  useEffect(() => {
    (async () => {
      setAutoPost(await NostrPostingPreferencesService.isAutoPostEnabled());
      setFormat(await NostrPostingPreferencesService.getPostFormat());
    })();
  }, []);

  const onToggleAutoPost = async (value: boolean) => {
    setAutoPost(value);
    await NostrPostingPreferencesService.setAutoPostEnabled(value);
  };

  const onSelectFormat = async (value: PostFormat) => {
    setFormat(value);
    await NostrPostingPreferencesService.setPostFormat(value);
  };

  return (
    <View style={styles.section}>
      <SettingsAccordion title="Sharing" defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <SettingItem
            title="Auto-post workouts"
            subtitle="Automatically share each finished workout. Your workout is always saved either way."
            rightElement={
              <ThemedSwitch
                value={autoPost}
                onValueChange={onToggleAutoPost}
              />
            }
          />

          {SHOW_FORMAT_TOGGLE && (
          <View style={styles.voiceSubsection}>
            <Text style={styles.subsectionTitle}>Post format</Text>
            {FORMAT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.defaultActivityOption,
                  format === opt.value && styles.defaultActivityOptionSelected,
                ]}
                onPress={() => onSelectFormat(opt.value)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.defaultActivityOptionText,
                      format === opt.value &&
                        styles.defaultActivityOptionTextSelected,
                    ]}
                  >
                    {opt.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {opt.subtitle}
                  </Text>
                </View>
                {format === opt.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={theme.colors.success}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
          )}
        </Card>
      </SettingsAccordion>
    </View>
  );
};
