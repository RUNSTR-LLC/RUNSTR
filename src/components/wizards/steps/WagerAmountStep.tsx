/**
 * WagerAmountStep - Third step of challenge creation wizard
 * Allows users to set the Bitcoin wager amount for the challenge
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { theme } from '../../../styles/theme';

interface WagerAmountStepProps {
  wagerAmount: number;
  onWagerAmountChange: (amount: number) => void;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];

export const WagerAmountStep: React.FC<WagerAmountStepProps> = ({
  wagerAmount,
  onWagerAmountChange,
}) => {
  const [inputValue, setInputValue] = useState(wagerAmount.toString());

  const handleInputChange = (text: string) => {
    setInputValue(text);
    const numericValue = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numericValue) && numericValue >= 0) {
      onWagerAmountChange(numericValue);
    }
  };

  const handlePresetSelect = (amount: number) => {
    setInputValue(amount.toString());
    onWagerAmountChange(amount);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.wagerSection}>
        {/* Amount Input */}
        <View style={styles.wagerInputContainer}>
          <Text style={styles.wagerInputLabel}>Prize Amount</Text>
          <View style={styles.wagerInputWrapper}>
            <TextInput
              style={styles.wagerInput}
              value={inputValue}
              onChangeText={handleInputChange}
              keyboardType="numeric"
              placeholder="1000"
              placeholderTextColor={theme.colors.textMuted}
              textAlign="center"
              maxLength={8}
            />
            <Text style={styles.wagerCurrency}>sats</Text>
          </View>
        </View>

        {/* Preset Buttons */}
        <View style={styles.wagerPresets}>
          {PRESET_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.presetButton}
              onPress={() => handlePresetSelect(amount)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetButtonText}>
                {formatAmount(amount)} sats
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.wagerInfo}>
          <Text style={styles.wagerInfoText}>
            Your wager will be sent to your team&apos;s wallet for arbitration.
            The winner receives the full prize amount. If there&apos;s a
            dispute, your team captain will resolve it.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wagerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wagerInputContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  wagerInputLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  wagerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wagerInput: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 200,
    padding: 0,
    margin: 0,
  },
  wagerCurrency: {
    fontSize: 24,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  wagerPresets: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'center',
  },
  presetButton: {
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  wagerInfo: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  wagerInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    textAlign: 'left',
  },
});
