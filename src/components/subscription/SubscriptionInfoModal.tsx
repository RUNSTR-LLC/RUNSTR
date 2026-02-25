/**
 * SubscriptionInfoModal - Two-tier subscription comparison
 * Shows Supporter (15k sats/mo) and Pro (21k sats/mo) tiers
 * Contextual messaging based on which feature triggered the modal
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { REWARD_CONFIG } from '../../config/rewards';
import type { SubscriptionTier } from '../../services/backend/SubscriptionService';

interface SubscriptionInfoModalProps {
  visible: boolean;
  onClose: () => void;
  feature: 'event' | 'team' | 'season' | 'general';
  currentTier?: SubscriptionTier;
}

interface TierFeature {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const SUPPORTER_FEATURES: TierFeature[] = [
  { icon: 'flash-outline', label: `${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD.toLocaleString()} rewards per workout (10x boost)` },
  { icon: 'calendar-outline', label: `Up to ${REWARD_CONFIG.BOOSTED_MAX_PER_WEEK} boosted workouts per week` },
  { icon: 'trophy-outline', label: 'Season access' },
];

const PRO_FEATURES: TierFeature[] = [
  { icon: 'flash-outline', label: `${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD.toLocaleString()} rewards per workout (10x boost)` },
  { icon: 'calendar-outline', label: `Up to ${REWARD_CONFIG.BOOSTED_MAX_PER_WEEK} boosted workouts per week` },
  { icon: 'trophy-outline', label: 'Season access' },
  { icon: 'people-outline', label: 'Create clubs' },
  { icon: 'calendar-outline', label: 'Create events' },
];

function getIntroText(feature: string, currentTier?: SubscriptionTier): string {
  if (currentTier === 'supporter') {
    if (feature === 'event' || feature === 'team') {
      return 'Upgrade to Pro to unlock club and event creation. You already get 10x boosted rewards and season access!';
    }
    return 'You\'re a Supporter! Upgrade to Pro for club and event creation.';
  }

  switch (feature) {
    case 'event':
      return 'Creating events requires a Pro subscription. Choose a plan to get started with boosted rewards and more.';
    case 'team':
      return 'Creating clubs requires a Pro subscription. Choose a plan to unlock boosted rewards and more.';
    case 'season':
      return `Season access requires a Supporter subscription or above. Earn ${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD.toLocaleString()} rewards per qualifying workout!`;
    default:
      return 'Subscribe and earn 10x more rewards per workout. Perfect for anyone who works out 3-4 times a week.';
  }
}

export const SubscriptionInfoModal: React.FC<SubscriptionInfoModalProps> = ({
  visible,
  onClose,
  feature,
  currentTier = 'free',
}) => {
  const handleSubscribe = useCallback(async (tier: 'supporter' | 'pro') => {
    const npub = await AsyncStorage.getItem('@runstr:npub');
    const base = 'https://www.runstr.club/pro/';
    const params = npub
      ? `?npub=${encodeURIComponent(npub)}&tier=${tier}`
      : `?tier=${tier}`;
    Linking.openURL(base + params);
  }, []);

  // For supporters, only show the Pro upgrade card
  const showSupporterCard = currentTier === 'free';
  const showProCard = true; // Always show Pro

  // Highlight the recommended tier based on context
  const recommendedTier = (feature === 'season' && currentTier === 'free')
    ? 'supporter'
    : 'pro';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>RUNSTR Subscriptions</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Introduction */}
              <Text style={styles.intro}>
                {getIntroText(feature, currentTier)}
              </Text>

              {/* Supporter Tier Card */}
              {showSupporterCard && (
                <View style={[
                  styles.tierCard,
                  recommendedTier === 'supporter' && styles.tierCardHighlighted,
                ]}>
                  {recommendedTier === 'supporter' && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>RECOMMENDED</Text>
                    </View>
                  )}
                  <Text style={styles.tierName}>Supporter</Text>
                  <Text style={styles.tierPrice}>
                    {REWARD_CONFIG.SUPPORTER_PRICE_SATS.toLocaleString()} sats/month
                  </Text>

                  <View style={styles.featureList}>
                    {SUPPORTER_FEATURES.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name={f.icon} size={18} color={theme.colors.accent} />
                        <Text style={styles.featureLabel}>{f.label}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.ctaButton,
                      recommendedTier === 'supporter' && styles.ctaButtonHighlighted,
                    ]}
                    onPress={() => handleSubscribe('supporter')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.ctaButtonText,
                      recommendedTier === 'supporter' && styles.ctaButtonTextHighlighted,
                    ]}>
                      Subscribe
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Pro Tier Card */}
              {showProCard && (
                <View style={[
                  styles.tierCard,
                  recommendedTier === 'pro' && styles.tierCardHighlighted,
                ]}>
                  {recommendedTier === 'pro' && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>
                        {currentTier === 'supporter' ? 'UPGRADE' : 'RECOMMENDED'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.tierName}>Pro</Text>
                  <Text style={styles.tierPrice}>
                    {REWARD_CONFIG.PRO_PRICE_SATS.toLocaleString()} sats/month
                  </Text>

                  <View style={styles.featureList}>
                    {PRO_FEATURES.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name={f.icon} size={18} color={theme.colors.accent} />
                        <Text style={styles.featureLabel}>{f.label}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.ctaButton,
                      recommendedTier === 'pro' && styles.ctaButtonHighlighted,
                    ]}
                    onPress={() => handleSubscribe('pro')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.ctaButtonText,
                      recommendedTier === 'pro' && styles.ctaButtonTextHighlighted,
                    ]}>
                      {currentTier === 'supporter' ? 'Upgrade to Pro' : 'Subscribe'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  intro: {
    fontSize: 15,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 16,
  },
  tierCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierCardHighlighted: {
    borderColor: theme.colors.text,
    borderWidth: 2,
  },
  recommendedBadge: {
    backgroundColor: theme.colors.text,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
    letterSpacing: 0.5,
  },
  tierName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
    marginBottom: 16,
  },
  featureList: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  ctaButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ctaButtonHighlighted: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  ctaButtonTextHighlighted: {
    color: theme.colors.background,
  },
});

export default SubscriptionInfoModal;
