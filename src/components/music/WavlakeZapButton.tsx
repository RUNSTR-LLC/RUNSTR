/**
 * WavlakeZapButton - Button to zap Wavlake artists
 * Shows zap modal with amount selection
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useMusicStore } from '../../store/musicStore';
import { WavlakeZapService } from '../../services/music/WavlakeZapService';
import type { WavlakeTrack } from '../../types/music';

interface WavlakeZapButtonProps {
  track: WavlakeTrack;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const PRESET_AMOUNTS = [21, 100, 500, 1000];

export const WavlakeZapButton: React.FC<WavlakeZapButtonProps> = React.memo(
  ({ track, size = 'medium', showLabel = false }) => {
    const { defaultZapAmount } = useMusicStore();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [amount, setAmount] = useState(defaultZapAmount.toString());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Icon size based on button size
    const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 22;

    /**
     * Open zap modal
     */
    const openModal = useCallback(() => {
      setAmount(defaultZapAmount.toString());
      setError(null);
      setSuccess(false);
      setIsModalVisible(true);
    }, [defaultZapAmount]);

    /**
     * Close zap modal
     */
    const closeModal = useCallback(() => {
      setIsModalVisible(false);
      setIsLoading(false);
      setError(null);
    }, []);

    /**
     * Handle zap submission
     */
    const handleZap = useCallback(async () => {
      const amountSats = parseInt(amount, 10);

      if (isNaN(amountSats) || amountSats <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (amountSats > 100000) {
        setError('Maximum zap is 100,000 sats');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await WavlakeZapService.zapTrack(track, amountSats);

        if (result.success) {
          setSuccess(true);
          // Close modal after showing success
          setTimeout(() => {
            closeModal();
            setSuccess(false);
          }, 1500);
        } else {
          setError(result.error || 'Zap failed');
        }
      } catch (err) {
        console.error('[WavlakeZapButton] Zap error:', err);
        setError('Failed to send zap');
      } finally {
        setIsLoading(false);
      }
    }, [amount, track, closeModal]);

    /**
     * Select preset amount
     */
    const selectPreset = useCallback((preset: number) => {
      setAmount(preset.toString());
      setError(null);
    }, []);

    return (
      <>
        {/* Zap button */}
        <TouchableOpacity
          style={[styles.button, styles[`button_${size}`]]}
          onPress={openModal}
          activeOpacity={0.7}
        >
          <Ionicons name="flash" size={iconSize} color={theme.colors.accent} />
          {showLabel && <Text style={styles.buttonLabel}>Zap</Text>}
        </TouchableOpacity>

        {/* Zap modal */}
        <Modal
          visible={isModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={closeModal}
        >
          <View style={styles.overlay}>
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modal}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Zap Artist</Text>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Artist info */}
                <View style={styles.artistInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.artistName}>{track.artist.name}</Text>
                </View>

                {success ? (
                  // Success state
                  <View style={styles.successContainer}>
                    <Ionicons
                      name="checkmark-circle"
                      size={64}
                      color={theme.colors.success}
                    />
                    <Text style={styles.successText}>Zap sent!</Text>
                    <Text style={styles.successAmount}>{amount} sats</Text>
                  </View>
                ) : (
                  // Input state
                  <>
                    {/* Amount input */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="number-pad"
                        placeholder="Amount in sats"
                        placeholderTextColor={theme.colors.textMuted}
                        editable={!isLoading}
                      />
                      <Text style={styles.satsLabel}>sats</Text>
                    </View>

                    {/* Preset amounts */}
                    <View style={styles.presets}>
                      {PRESET_AMOUNTS.map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.presetButton,
                            amount === preset.toString() && styles.presetActive,
                          ]}
                          onPress={() => selectPreset(preset)}
                          disabled={isLoading}
                        >
                          <Text
                            style={[
                              styles.presetText,
                              amount === preset.toString() && styles.presetTextActive,
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Error message */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color={theme.colors.error}
                        />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Zap button */}
                    <TouchableOpacity
                      style={[
                        styles.zapButton,
                        isLoading && styles.zapButtonDisabled,
                      ]}
                      onPress={handleZap}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <Ionicons name="flash" size={20} color="#000" />
                          <Text style={styles.zapButtonText}>Send Zap</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </>
    );
  }
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
  },
  button_small: {
    padding: 6,
  },
  button_medium: {
    padding: 10,
  },
  button_large: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 340,
  },
  modal: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  artistInfo: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  trackTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  satsLabel: {
    color: theme.colors.textMuted,
    fontSize: 16,
    paddingRight: 16,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: 'rgba(255, 123, 28, 0.2)',
    borderColor: theme.colors.text,
  },
  presetText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  presetTextActive: {
    color: theme.colors.accent,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  zapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    paddingVertical: 14,
  },
  zapButtonDisabled: {
    opacity: 0.7,
  },
  zapButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  successAmount: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
});

export default WavlakeZapButton;
