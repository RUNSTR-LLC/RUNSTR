/**
 * EarningsCard - Compact tappable card showing total rewards earned
 * Navigates to Rewards screen on tap.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { navigate } from '../../navigation/navigationRef';
import { SupabaseRewardService } from '../../services/rewards/SupabaseRewardService';

export const EarningsCard: React.FC = () => {
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadEarnings = useCallback(async () => {
    try {
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!pubkey) {
        setIsLoading(false);
        return;
      }
      const data = await SupabaseRewardService.getEarningsByDestination(pubkey);
      setTotalEarned(data.reduce((sum, d) => sum + d.totalSats, 0));
    } catch (error) {
      console.warn('[EarningsCard] Failed to load earnings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadEarnings();
  }, [loadEarnings]));

  const handlePress = () => {
    navigate('Rewards');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.label}>REWARDS EARNED</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {isLoading ? '...' : totalEarned.toLocaleString()}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },
});
