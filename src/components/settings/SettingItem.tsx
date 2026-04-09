/**
 * SettingItem - Reusable setting row component for SettingsScreen sections
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { settingsStyles as styles } from '../../screens/settingsStyles';

export interface SettingItemProps {
  title: string;
  subtitle: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  onPress,
  rightElement,
}) => {
  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightElement || (onPress && <Text style={styles.chevron}>›</Text>)}
    </Wrapper>
  );
};
