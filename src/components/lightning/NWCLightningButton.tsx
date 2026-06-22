/**
 * NWCLightningButton Component
 * Lightning bolt button for quick zapping via NWC to Lightning addresses
 * Visual feedback: black bolt turns yellow after successful zap
 * Accepts both npub and hex pubkey formats
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  View,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { useNWCZap } from '../../hooks/useNWCZap';
import { NWCWalletService } from '../../services/wallet/NWCWalletService';
import { npubToHex } from '../../utils/ndkConversion';
import { EnhancedZapModal } from '../nutzap/EnhancedZapModal';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import { DEFAULT_ZAP_AMOUNT_KEY } from '../../constants/zap';

const DEFAULT_ZAP_AMOUNT = 21;
const LONG_PRESS_DURATION = 400; // ms to trigger long press (reduced from 500ms)

interface NWCLightningButtonProps {
  recipientNpub: string;
  recipientName?: string;
  recipientLightningAddress?: string; // If provided, zaps to this Lightning address instead of user's lud16
  size?: 'small' | 'medium' | 'large' | 'rectangular';
  style?: any;
  onZapSuccess?: () => void;
  disabled?: boolean;
  customLabel?: string;
}

export const NWCLightningButton: React.FC<NWCLightningButtonProps> = ({
  recipientNpub,
  recipientName = 'User',
  recipientLightningAddress,
  size = 'medium',
  style,
  onZapSuccess,
  disabled = false,
  customLabel,
}) => {
  const { balance, sendZap, isInitialized, hasWallet, refreshBalance, error } =
    useNWCZap();
  const [isZapping, setIsZapping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalZapAmount, setExternalZapAmount] = useState(0);
  const [externalZapMemo, setExternalZapMemo] = useState('');
  const [defaultAmount, setDefaultAmount] = useState(DEFAULT_ZAP_AMOUNT);

  // Animation for the zap effect
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Manual timer for long press detection
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Normalize recipient pubkey to hex format for consistency
  const recipientHex = React.useMemo(() => {
    const normalized = npubToHex(recipientNpub);
    if (!normalized) {
      console.warn(
        '[NWCLightningButton] Invalid recipient pubkey:',
        recipientNpub.slice(0, 20)
      );
      return null;
    }
    return normalized;
  }, [recipientNpub]);

  // Load default amount on mount
  useEffect(() => {
    if (recipientHex) {
      loadDefaultAmount();
    }
  }, [recipientHex]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Don't render if recipient is invalid
  if (!recipientHex) {
    return null;
  }

  const loadDefaultAmount = async () => {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY);
      if (stored) {
        setDefaultAmount(parseInt(stored));
      }
    } catch (error) {
      console.error('Error loading default amount:', error);
    }
  };

  const handlePressIn = () => {
    console.log('[NWCLightningButton] Press detected, checking state...');

    if (disabled) {
      console.log('[NWCLightningButton] Button is disabled');
      return;
    }

    // Phase 1: Long press = NWC quick zap (power users)
    console.log('[NWCLightningButton] Starting long press timer...');
    longPressTimer.current = setTimeout(() => {
      console.log(
        '[NWCLightningButton] Long press detected, performing quick zap'
      );
      performQuickZap();
      longPressTimer.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handlePressOut = async () => {
    console.log(
      '[NWCLightningButton] Press out - Timer active:',
      longPressTimer.current !== null
    );

    if (longPressTimer.current) {
      // Timer still active = quick tap (not long press)
      // Phase 1: Tap = External wallet (default, most accessible)
      console.log(
        '[NWCLightningButton] Quick tap detected, opening external wallet modal'
      );
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;

      // Open external wallet modal with default amount
      setExternalZapAmount(defaultAmount);
      setExternalZapMemo('RUNSTR Community Rewards');
      setShowExternalModal(true);
    }
  };

  const performQuickZap = async () => {
    if (isZapping) return;

    // Check if wallet is connected
    if (!isInitialized || !hasWallet) {
      Toast.show({
        type: 'error',
        text1: 'No Wallet Connected',
        text2: 'Tap to use external wallet, or configure NWC in Settings.',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    // Get FRESH balance directly from service (useNWCZap hook balance can be stale)
    const freshBalance = await NWCWalletService.getBalance();
    if (freshBalance.error || freshBalance.balance < defaultAmount) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `Need ${defaultAmount} sats but only have ${freshBalance.balance}. Tap to use external wallet.`,
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setIsZapping(true);

    // Animate the button press
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const memo = 'RUNSTR Community Rewards';

      // Use lightning address directly if provided, otherwise use recipientHex
      const zapTarget = recipientLightningAddress || recipientHex;
      console.log('[NWCLightningButton] Sending zap via NWC to:', zapTarget);
      const success = await sendZap(zapTarget, defaultAmount, memo);

      if (success) {
        // Haptic feedback for success
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        // Refresh balance
        await refreshBalance();
        onZapSuccess?.();

        // Brief success feedback
        Toast.show({
          type: 'reward',
          text1: 'Zapped!',
          text2: `Sent ${defaultAmount} sats to ${recipientName}`,
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        // Haptic feedback for error
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const errorMessage = error || 'Unable to send zap. Please try again.';
        Toast.show({
          type: 'error',
          text1: 'Zap Failed',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (err) {
      console.error('Quick zap error:', err);

      // Haptic feedback for error
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Show specific error message
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while sending the zap';
      Toast.show({
        type: 'error',
        text1: 'Zap Error',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsZapping(false);
    }
  };

  const handleModalSuccess = async () => {
    setShowModal(false);
    onZapSuccess?.();
  };

  const handleShowExternalWallet = (amount: number, memo: string) => {
    console.log(
      '[NWCLightningButton] Showing external wallet modal for',
      amount,
      'sats'
    );
    setExternalZapAmount(amount);
    setExternalZapMemo(memo);
    setShowModal(false);
    setShowExternalModal(true);
  };

  const handleExternalZapSuccess = async () => {
    setShowExternalModal(false);
    onZapSuccess?.();
  };

  const handleDefaultAmountChange = async (newDefault: number) => {
    setDefaultAmount(newDefault);
    try {
      await AsyncStorage.setItem(DEFAULT_ZAP_AMOUNT_KEY, newDefault.toString());
    } catch (error) {
      console.error('Error saving default amount:', error);
    }
  };

  // Size configurations
  const sizeConfig = {
    small: { icon: 16, button: 28 },
    medium: { icon: 20, button: 36 },
    large: { icon: 24, button: 44 },
    rectangular: { icon: 16, button: 26, width: customLabel ? 120 : 70 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const isRectangular = size === 'rectangular';

  // Button is never truly disabled - always allow interaction
  // (wallet check happens during quick tap, long press always works)
  const isButtonDisabled = disabled || isZapping;

  return (
    <>
      <View onStartShouldSetResponder={() => true} onResponderGrant={() => {}}>
        <Animated.View
          style={[
            {
              transform: [{ scale: scaleAnimation }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.button,
              isRectangular
                ? {
                    width: 'width' in config ? config.width : 70,
                    height: config.button,
                    borderRadius: 4,
                    flexDirection: 'row',
                    paddingHorizontal: 8,
                  }
                : {
                    width: config.button,
                    height: config.button,
                    borderRadius: config.button / 2,
                  },
              isButtonDisabled && styles.buttonDisabled,
              style,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isButtonDisabled}
            activeOpacity={0.7}
          >
            {isZapping ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <View
                style={[
                  styles.buttonContent,
                  isRectangular && styles.rectangularContent,
                ]}
              >
                <Animated.View
                  style={!isInitialized && styles.uninitializedIcon}
                >
                  <Ionicons
                    name="flash-outline"
                    size={config.icon}
                    color={
                      !isInitialized || !hasWallet
                        ? theme.colors.textMuted
                        : theme.colors.orangeBright
                    }
                  />
                </Animated.View>
                {isRectangular && (
                  <Text
                    style={[
                      styles.zapText,
                      isButtonDisabled && styles.zapTextDisabled,
                    ]}
                  >
                    {customLabel || 'Zap'}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <EnhancedZapModal
        visible={showModal}
        recipientNpub={recipientHex}
        recipientName={recipientName}
        defaultAmount={defaultAmount}
        balance={balance}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        onDefaultAmountChange={handleDefaultAmountChange}
        onShowExternalWallet={handleShowExternalWallet}
      />

      <ExternalZapModal
        visible={showExternalModal}
        recipientNpub={recipientLightningAddress || recipientHex}
        recipientName={recipientName}
        amount={externalZapAmount}
        memo={externalZapMemo}
        onClose={() => setShowExternalModal(false)}
        onSuccess={handleExternalZapSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: '#0f0f0f',
  },

  uninitializedIcon: {
    opacity: 0.6,
  },

  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  rectangularContent: {
    flexDirection: 'row',
    gap: 4,
  },

  zapText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },

  zapTextDisabled: {
    color: theme.colors.textMuted,
  },
});
