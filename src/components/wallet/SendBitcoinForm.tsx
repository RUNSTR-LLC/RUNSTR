/**
 * SendBitcoinForm - Form for sending Bitcoin via Lightning Network
 * Handles recipient input, amount selection, and transaction execution
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';

interface SendBitcoinFormProps {
  maxBalance: number;
  onSubmit: (amount: number, destination: string, message?: string) => void;
  onCancel: () => void;
}

type CurrencyType = 'sats' | 'usd';

export const SendBitcoinForm: React.FC<SendBitcoinFormProps> = ({
  maxBalance,
  onSubmit,
  onCancel,
}) => {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('sats');
  const [usdValue, setUsdValue] = useState('');

  // Mock BTC/USD rate (in production this would come from an API)
  const btcToUsdRate = 40000;
  const satsPerBtc = 100000000;

  useEffect(() => {
    if (amount && currency === 'sats') {
      const sats = parseInt(amount);
      if (!isNaN(sats)) {
        const usd = (sats / satsPerBtc) * btcToUsdRate;
        setUsdValue(usd.toFixed(2));
      } else {
        setUsdValue('');
      }
    } else if (amount && currency === 'usd') {
      const usd = parseFloat(amount);
      if (!isNaN(usd)) {
        const sats = Math.floor((usd / btcToUsdRate) * satsPerBtc);
        setUsdValue(sats.toString());
      } else {
        setUsdValue('');
      }
    }
  }, [amount, currency]);

  const handleSubmit = () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const satsAmount =
      currency === 'sats'
        ? parseInt(amount)
        : Math.floor((parseFloat(amount) / btcToUsdRate) * satsPerBtc);

    if (isNaN(satsAmount) || satsAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (satsAmount > maxBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    onSubmit(satsAmount, destination, message.trim() || undefined);
  };

  const isValidAmount = () => {
    if (!amount) return false;

    const satsAmount =
      currency === 'sats'
        ? parseInt(amount)
        : Math.floor((parseFloat(amount) / btcToUsdRate) * satsPerBtc);

    return !isNaN(satsAmount) && satsAmount > 0 && satsAmount <= maxBalance;
  };

  const getConversionHint = () => {
    if (currency === 'sats' && usdValue) {
      return `≈ $${usdValue}`;
    } else if (currency === 'usd' && usdValue) {
      return `≈ ${usdValue} sats`;
    }
    return '≈ $0.00';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Sats</Text>
      <Text style={styles.subtitle}>
        Send bitcoin to any Lightning address or invoice
      </Text>

      {/* Destination Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>To</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.destinationInput]}
            value={destination}
            onChangeText={setDestination}
            placeholder="Lightning address or invoice"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.scanButton}>
            <Text style={styles.scanText}>📷</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />

          <View style={styles.currencyToggle}>
            <TouchableOpacity
              style={[
                styles.currencyButton,
                currency === 'sats' && styles.currencyButtonActive,
              ]}
              onPress={() => setCurrency('sats')}
            >
              <Text
                style={[
                  styles.currencyText,
                  currency === 'sats' && styles.currencyTextActive,
                ]}
              >
                sats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.currencyButton,
                currency === 'usd' && styles.currencyButtonActive,
              ]}
              onPress={() => setCurrency('usd')}
            >
              <Text
                style={[
                  styles.currencyText,
                  currency === 'usd' && styles.currencyTextActive,
                ]}
              >
                USD
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.conversionHint}>{getConversionHint()}</Text>
      </View>

      {/* Message Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Message (Optional)</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="What's this for?"
          placeholderTextColor="#666"
        />
      </View>

      {/* Fee Estimate */}
      <View style={styles.feeEstimate}>
        <Text style={styles.feeTitle}>Network Fee</Text>
        <Text style={styles.feeAmount}>~1 sat</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            !isValidAmount() && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValidAmount()}
        >
          <Text
            style={[
              styles.submitText,
              !isValidAmount() && styles.submitTextDisabled,
            ]}
          >
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  destinationInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  scanButton: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 0,
  },
  scanText: {
    fontSize: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
  },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencyButtonActive: {
    backgroundColor: theme.colors.border,
  },
  currencyText: {
    fontSize: 12,
    color: '#666',
  },
  currencyTextActive: {
    color: theme.colors.text,
  },
  conversionHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  feeEstimate: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  feeTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  submitButton: {
    flex: 1,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.3,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  submitTextDisabled: {
    color: '#666',
  },
});
