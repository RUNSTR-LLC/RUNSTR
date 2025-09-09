/**
 * ReceiveBitcoinForm - Form for generating Lightning invoices to receive Bitcoin
 * Generates QR codes and invoice strings for payments
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

interface ReceiveBitcoinFormProps {
  onSubmit: (amount?: number, description?: string) => void;
  onCancel: () => void;
}

type CurrencyType = 'sats' | 'usd';

export const ReceiveBitcoinForm: React.FC<ReceiveBitcoinFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('sats');
  const [invoice, setInvoice] = useState('');
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

  useEffect(() => {
    // Generate mock invoice when form changes
    if (amount || description) {
      const mockInvoice = `lnbc${amount}1${Math.random()
        .toString(36)
        .substring(7)}`;
      setInvoice(mockInvoice);
    } else {
      const mockInvoice = `lnbc1${Math.random().toString(36).substring(7)}`;
      setInvoice(mockInvoice);
    }
  }, [amount, description]);

  const handleSubmit = () => {
    const satsAmount = amount
      ? currency === 'sats'
        ? parseInt(amount)
        : Math.floor((parseFloat(amount) / btcToUsdRate) * satsPerBtc)
      : undefined;

    if (amount && (isNaN(satsAmount!) || satsAmount! <= 0)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    onSubmit(satsAmount, description.trim() || undefined);
  };

  const getConversionHint = () => {
    if (!amount) return 'Leave empty to allow sender to choose';

    if (currency === 'sats' && usdValue) {
      return `≈ $${usdValue}`;
    } else if (currency === 'usd' && usdValue) {
      return `≈ ${usdValue} sats`;
    }
    return '≈ $0.00';
  };

  const handleCopyInvoice = () => {
    // In production, this would copy to clipboard
    Alert.alert('Copied', 'Invoice copied to clipboard');
  };

  const handleShareQR = () => {
    // In production, this would open share dialog
    Alert.alert('Share', 'QR code shared');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Receive Sats</Text>
      <Text style={styles.subtitle}>
        Generate an invoice to receive bitcoin payments
      </Text>

      {/* Amount Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount (Optional)</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount}
            onChangeText={setAmount}
            placeholder="Any amount"
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

      {/* Description Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this payment for?"
          placeholderTextColor="#666"
        />
      </View>

      {/* QR Code Display */}
      <View style={styles.qrContainer}>
        <View style={styles.qrCode}>
          <Text style={styles.qrCodeText}>QR CODE</Text>
        </View>
        <Text style={styles.qrDescription}>
          Scan this QR code to send payment
        </Text>
      </View>

      {/* Invoice Display */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Lightning Invoice</Text>
        <TextInput
          style={[styles.input, styles.invoiceInput]}
          value={invoice}
          editable={false}
          multiline
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyInvoice}>
          <Text style={styles.copyText}>Copy Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShareQR}>
          <Text style={styles.shareText}>Share QR</Text>
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
  input: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
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
  qrContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginVertical: 24,
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrCodeText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  qrDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  invoiceInput: {
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  copyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  shareButton: {
    flex: 1,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
