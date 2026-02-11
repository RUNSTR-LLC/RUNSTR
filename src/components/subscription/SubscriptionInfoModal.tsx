/**
 * SubscriptionInfoModal - Info modal for non-subscribers
 * Explains RUNSTR PRO subscription benefits with a "Coming Soon" CTA
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

interface SubscriptionInfoModalProps {
  visible: boolean;
  onClose: () => void;
  feature: 'event' | 'team';
}

const EVENT_FEATURES = [
  {
    icon: 'trophy-outline' as const,
    title: 'Create Custom Events',
    description: 'Set up competitions for your community with custom rules',
  },
  {
    icon: 'options-outline' as const,
    title: 'Set Activity Types & Scoring',
    description: 'Choose running, walking, cycling and how winners are determined',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Add Prize Pools',
    description: 'Set Bitcoin prize pools to motivate participants',
  },
  {
    icon: 'podium-outline' as const,
    title: 'Automatic Leaderboards',
    description: 'Real-time leaderboards powered by workout submissions',
  },
];

const TEAM_FEATURES = [
  {
    icon: 'people-outline' as const,
    title: 'Create Your Own Team',
    description: 'Build a team around your community, charity, or organization',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Set a Lightning Address',
    description: 'Receive donations directly via Lightning Network',
  },
  {
    icon: 'globe-outline' as const,
    title: 'Appear in the Teams Directory',
    description: 'Your team is visible to all RUNSTR users',
  },
];

export const SubscriptionInfoModal: React.FC<SubscriptionInfoModalProps> = ({
  visible,
  onClose,
  feature,
}) => {
  const features = feature === 'event' ? EVENT_FEATURES : TEAM_FEATURES;

  const handleSubscribe = useCallback(async () => {
    const npub = await AsyncStorage.getItem('@runstr:npub');
    const url = npub
      ? `https://www.runstr.club/pro/?npub=${encodeURIComponent(npub)}`
      : 'https://www.runstr.club/pro/';
    Linking.openURL(url);
  }, []);

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
              <Text style={styles.title}>RUNSTR PRO</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Introduction */}
              <Text style={styles.intro}>
                {feature === 'event'
                  ? 'Create and manage your own fitness competitions on RUNSTR. Set custom rules, scoring methods, and prize pools for your community.'
                  : 'Launch your own team on RUNSTR. Set a Lightning address to receive donations and rally your community around fitness.'}
              </Text>

              {/* Feature List */}
              <Text style={styles.sectionTitle}>
                {feature === 'event' ? 'Event Features' : 'Team Features'}
              </Text>
              <View style={styles.featureList}>
                {features.map((item, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>{item.title}</Text>
                      <Text style={styles.featureDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Pricing & CTA */}
              <View style={styles.ctaSection}>
                <Text style={styles.ctaTitle}>RUNSTR PRO</Text>
                <Text style={styles.ctaPrice}>7,000 sats/month</Text>
                <Text style={styles.ctaDescription}>
                  Unlock team and event creation. Cancel anytime.
                </Text>

                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={handleSubscribe}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ctaButtonText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  ctaSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  ctaPrice: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
    marginBottom: 8,
  },
  ctaDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});

export default SubscriptionInfoModal;
