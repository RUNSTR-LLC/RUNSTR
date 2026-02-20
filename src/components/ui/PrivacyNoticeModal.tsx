/**
 * PrivacyNoticeModal - Explains local-only analytics processing
 * Informs users that all calculations happen on-device with no data transmission
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface PrivacyNoticeModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({
  visible,
  onClose,
  onAccept,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={40} color="#FF9D42" />
            </View>
            <Text style={styles.title}>Your Privacy Matters</Text>
            <Text style={styles.subtitle}>100% Local Analytics</Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <View style={styles.featureRow}>
                <Ionicons name="phone-portrait" size={24} color="#FF9D42" />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>On-Device Processing</Text>
                  <Text style={styles.featureDescription}>
                    All analytics calculations happen locally on your phone.
                    Your workout data never leaves your device.
                  </Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <Ionicons name="cloud-offline" size={24} color="#FF9D42" />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>No Cloud Storage</Text>
                  <Text style={styles.featureDescription}>
                    Your health data is stored exclusively in your phone's local
                    storage. We don't have access to it.
                  </Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <Ionicons name="analytics" size={24} color="#FF9D42" />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Private Insights</Text>
                  <Text style={styles.featureDescription}>
                    View trends, correlations, and health scores calculated from
                    your local workout history.
                  </Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <Ionicons name="lock-closed" size={24} color="#FF9D42" />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>You're In Control</Text>
                  <Text style={styles.featureDescription}>
                    Only you can see your analytics. Delete anytime by clearing
                    app data.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                What We Analyze (Locally):
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Cardio performance (pace, distance, heart rate)
                </Text>
                <Text style={styles.bulletItem}>
                  • Strength training (volume, exercise balance, density)
                </Text>
                <Text style={styles.bulletItem}>
                  • Wellness patterns (meditation consistency, duration)
                </Text>
                <Text style={styles.bulletItem}>
                  • Nutrition trends (meal timing, fasting windows)
                </Text>
                <Text style={styles.bulletItem}>
                  • Cross-activity correlations (e.g., diet vs performance)
                </Text>
                <Text style={styles.bulletItem}>
                  • Body composition (BMI, weight trends)
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Optional Health Profile:</Text>
              <Text style={styles.infoText}>
                For more accurate metrics like VO₂ Max and BMI, you can
                optionally provide:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Age (for fitness percentiles)
                </Text>
                <Text style={styles.bulletItem}>
                  • Weight (for BMI calculation)
                </Text>
                <Text style={styles.bulletItem}>
                  • Height (for BMI calculation)
                </Text>
                <Text style={styles.bulletItem}>
                  • Biological sex (for VO₂ Max estimation)
                </Text>
              </View>
              <Text style={styles.infoText}>
                This information is stored locally and never transmitted.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onAccept}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#FF9D42',
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: theme.colors.text,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: '#000',
  },
});
