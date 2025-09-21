/**
 * NutzapLightningButton Component
 * Lightning bolt button for quick zapping with tap (21 sats) or hold (custom amount)
 * Visual feedback: black bolt turns yellow after successful zap
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { useNutzap } from '../../hooks/useNutzap';
import { EnhancedZapModal } from './EnhancedZapModal';

const DEFAULT_ZAP_AMOUNT = 21;
const LONG_PRESS_DURATION = 500; // ms to trigger long press

interface NutzapLightningButtonProps {
  recipientNpub: string;
  recipientName?: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  onZapSuccess?: () => void;
  disabled?: boolean;
}

export const NutzapLightningButton: React.FC<NutzapLightningButtonProps> = ({
  recipientNpub,
  recipientName = 'User',
  size = 'medium',
  style,
  onZapSuccess,
  disabled = false,
}) => {
  const { balance, sendNutzap, isInitialized } = useNutzap();
  const [isZapped, setIsZapped] = useState(false);
  const [isZapping, setIsZapping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState(DEFAULT_ZAP_AMOUNT);

  // Animation for the zap effect
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const colorAnimation = useRef(new Animated.Value(0)).current;

  // Timer for long press detection
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Load zapped state and default amount on mount
  useEffect(() => {
    loadZapState();
    loadDefaultAmount();
  }, [recipientNpub]);

  const loadZapState = async () => {
    try {
      const zappedUsers = await AsyncStorage.getItem('@runstr:zapped_users');
      if (zappedUsers) {
        const parsed = JSON.parse(zappedUsers);
        const today = new Date().toDateString();

        // Reset if it's a new day
        if (parsed.date !== today) {
          await AsyncStorage.setItem(
            '@runstr:zapped_users',
            JSON.stringify({
              date: today,
              users: [],
            })
          );
        } else if (parsed.users.includes(recipientNpub)) {
          setIsZapped(true);
          Animated.timing(colorAnimation, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }).start();
        }
      }
    } catch (error) {
      console.error('Error loading zap state:', error);
    }
  };

  const loadDefaultAmount = async () => {
    try {
      const stored = await AsyncStorage.getItem('@runstr:default_zap_amount');
      if (stored) {
        setDefaultAmount(parseInt(stored));
      }
    } catch (error) {
      console.error('Error loading default amount:', error);
    }
  };

  const saveZapState = async () => {
    try {
      const zappedUsers = await AsyncStorage.getItem('@runstr:zapped_users');
      const today = new Date().toDateString();

      let data = { date: today, users: [] as string[] };
      if (zappedUsers) {
        const parsed = JSON.parse(zappedUsers);
        if (parsed.date === today) {
          data = parsed;
        }
      }

      if (!data.users.includes(recipientNpub)) {
        data.users.push(recipientNpub);
        await AsyncStorage.setItem(
          '@runstr:zapped_users',
          JSON.stringify(data)
        );
      }
    } catch (error) {
      console.error('Error saving zap state:', error);
    }
  };

  const handlePressIn = () => {
    if (disabled || !isInitialized) return;

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      // Trigger haptic feedback if available
      setShowModal(true);
      longPressTimer.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handlePressOut = async (event: GestureResponderEvent) => {
    if (disabled || !isInitialized) return;

    // If timer is still running, it's a tap
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;

      // Quick zap with default amount
      await performQuickZap();
    }
  };

  const performQuickZap = async () => {
    if (isZapping) return;

    // Check balance
    if (balance < defaultAmount) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${defaultAmount} sats but only have ${balance} sats`,
        [{ text: 'OK' }]
      );
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
      const success = await sendNutzap(
        recipientNpub,
        defaultAmount,
        `⚡ Quick zap from RUNSTR!`
      );

      if (success) {
        // Animate color change to yellow
        Animated.timing(colorAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();

        setIsZapped(true);
        await saveZapState();
        onZapSuccess?.();

        // Brief success feedback
        Alert.alert(
          '⚡ Zapped!',
          `Sent ${defaultAmount} sats to ${recipientName}`,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      } else {
        Alert.alert('Failed', 'Unable to send zap. Please try again.');
      }
    } catch (error) {
      console.error('Quick zap error:', error);
      Alert.alert('Error', 'An error occurred while sending the zap');
    } finally {
      setIsZapping(false);
    }
  };

  const handleModalSuccess = async () => {
    // Animate color change
    Animated.timing(colorAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setIsZapped(true);
    await saveZapState();
    setShowModal(false);
    onZapSuccess?.();
  };

  const handleDefaultAmountChange = async (newDefault: number) => {
    setDefaultAmount(newDefault);
    try {
      await AsyncStorage.setItem(
        '@runstr:default_zap_amount',
        newDefault.toString()
      );
    } catch (error) {
      console.error('Error saving default amount:', error);
    }
  };

  // Size configurations
  const sizeConfig = {
    small: { icon: 16, button: 28 },
    medium: { icon: 20, button: 36 },
    large: { icon: 24, button: 44 },
  };

  const config = sizeConfig[size];

  // Interpolate color from black to yellow
  const boltColor = colorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.text, '#FFD700'], // black to gold
  });

  if (!isInitialized) {
    return null; // Don't show button if wallet not initialized
  }

  return (
    <>
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
            {
              width: config.button,
              height: config.button,
              borderRadius: config.button / 2,
            },
            isZapped && styles.buttonZapped,
            disabled && styles.buttonDisabled,
            style,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isZapping}
          activeOpacity={0.7}
        >
          {isZapping ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Animated.View>
              <Ionicons
                name="flash"
                size={config.icon}
                color={boltColor as any}
              />
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <EnhancedZapModal
        visible={showModal}
        recipientNpub={recipientNpub}
        recipientName={recipientName}
        defaultAmount={defaultAmount}
        balance={balance}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        onDefaultAmountChange={handleDefaultAmountChange}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonZapped: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },

  buttonDisabled: {
    opacity: 0.5,
  },
});
