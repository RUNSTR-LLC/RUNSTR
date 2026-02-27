/**
 * Custom Toast Configuration
 * Dark-themed toast notifications for RUNSTR app
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface ToastProps {
  text1?: string;
  text2?: string;
}

/**
 * Custom toast types for the app
 * Usage: Toast.show({ type: 'reward', text1: 'Title', text2: 'Subtitle' })
 */
export const toastConfig = {
  // Reward notification - Bitcoin orange theme
  reward: ({ text1, text2 }: ToastProps) => (
    <View style={styles.rewardToast}>
      <Ionicons name="flash" size={24} color={theme.colors.orangeDeep} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),

  // Pledge reward notification - Shows progress
  pledge: ({ text1, text2 }: ToastProps) => (
    <View style={styles.pledgeToast}>
      <Ionicons name="trophy" size={24} color={theme.colors.orangeDeep} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),

  // Success notification - Orange theme matching app style
  success: ({ text1, text2 }: ToastProps) => (
    <View style={styles.successToast}>
      <Ionicons name="checkmark-circle" size={24} color="#FF9D42" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),

  // Error notification - Orange theme matching app style
  error: ({ text1, text2 }: ToastProps) => (
    <View style={styles.errorToast}>
      <Ionicons name="alert-circle" size={24} color={theme.colors.accent} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),

  // Reward confirmed notification - Orange checkmark for payments to user's wallet
  rewardConfirmed: ({ text1, text2 }: ToastProps) => (
    <View style={styles.rewardConfirmedToast}>
      <Ionicons name="checkmark-circle" size={24} color={theme.colors.orangeDeep} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),

  // Reward donated notification - Orange gift theme for payments to charity
  rewardDonated: ({ text1, text2 }: ToastProps) => (
    <View style={styles.rewardDonatedToast}>
      <Ionicons name="gift" size={24} color="#FF9D42" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),
};

const baseToastStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '#1a1a1a',
  borderRadius: 12,
  padding: 16,
  marginHorizontal: 16,
  marginTop: 50, // Below status bar
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
};

const styles = StyleSheet.create({
  rewardToast: {
    ...baseToastStyle,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
  },
  pledgeToast: {
    ...baseToastStyle,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
  },
  successToast: {
    ...baseToastStyle,
    borderWidth: 1,
    borderColor: '#FF9D42',
  },
  errorToast: {
    ...baseToastStyle,
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  rewardConfirmedToast: {
    ...baseToastStyle,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
  },
  rewardDonatedToast: {
    ...baseToastStyle,
    borderWidth: 1,
    borderColor: '#FF9D42',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    marginTop: 2,
  },
});
