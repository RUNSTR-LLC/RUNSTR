/**
 * DefaultZapAmountSetting — lets NWC users set their default one-tap zap amount.
 * Reads/writes the shared DEFAULT_ZAP_AMOUNT_KEY consumed by the feed zap button.
 * Rendered inside WalletSection's connected-NWC branch.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { settingsStyles } from '../../screens/settingsStyles';
import {
  DEFAULT_ZAP_AMOUNT_KEY,
  DEFAULT_ZAP_AMOUNT_FALLBACK,
  ZAP_AMOUNT_PRESETS,
  parseStoredZapAmount,
} from '../../constants/zap';

export const DefaultZapAmountSetting: React.FC = () => {
  const [amount, setAmount] = useState<number>(DEFAULT_ZAP_AMOUNT_FALLBACK);
  const [expanded, setExpanded] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY)
      .then((stored) => setAmount(parseStoredZapAmount(stored)))
      .catch(() => setAmount(DEFAULT_ZAP_AMOUNT_FALLBACK));
  }, []);

  const persist = useCallback((value: number) => {
    setAmount(value);
    AsyncStorage.setItem(DEFAULT_ZAP_AMOUNT_KEY, String(value)).catch((err) =>
      console.error('Failed to save default zap amount:', err)
    );
  }, []);

  const onPreset = useCallback((value: number) => {
    setCustomText('');
    persist(value);
  }, [persist]);

  const onCustomCommit = useCallback(() => {
    const parsed = parseInt(customText, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      persist(parsed);
    }
    setCustomText('');
  }, [customText, persist]);

  return (
    <View style={localStyles.container}>
      <TouchableOpacity
        style={settingsStyles.rewardSettingRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={settingsStyles.rewardSettingInfo}>
          <Text style={settingsStyles.rewardSettingTitle}>Default zap amount</Text>
          <Text style={settingsStyles.rewardSettingSubtitle}>
            Used when you tap to zap a post
          </Text>
        </View>
        <Text style={localStyles.value}>{amount} sats</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={localStyles.editor}>
          <View style={localStyles.chipRow}>
            {ZAP_AMOUNT_PRESETS.map((preset) => {
              const selected = preset === amount;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[localStyles.chip, selected && localStyles.chipSelected]}
                  onPress={() => onPreset(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[localStyles.chipText, selected && localStyles.chipTextSelected]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={localStyles.customRow}>
            <Text style={localStyles.customLabel}>Custom</Text>
            <TextInput
              style={localStyles.customInput}
              value={customText}
              onChangeText={setCustomText}
              onBlur={onCustomCommit}
              onSubmitEditing={onCustomCommit}
              keyboardType="number-pad"
              placeholder="amount"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
            />
            <Text style={localStyles.customLabel}>sats</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  editor: {
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  chipTextSelected: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  customLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  customInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 14,
  },
});
