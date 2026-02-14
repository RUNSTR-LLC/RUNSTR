/**
 * WelcomePermissionModal Component
 * Educational modal shown on first app launch
 * Explains RUNSTR's local-first philosophy and permission requirements
 * Then sends user to Rewards screen to choose a charity
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface WelcomePermissionModalProps {
  visible: boolean;
  onComplete: () => void;
}

export const WelcomePermissionModal: React.FC<WelcomePermissionModalProps> = ({
  visible,
  onComplete,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onComplete}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>WELCOME TO RUNSTR</Text>
            <Text style={styles.subtitle}>Your Data, Your Device</Text>

            <Text style={styles.paragraph}>
              RUNSTR takes a different approach to fitness tracking. There's no
              central database storing your workouts, no account to create, and
              no cloud sync required. Your fitness data stays on your device
              unless you choose to share it.
            </Text>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color={theme.colors.orangeBright}
                />
                <Text style={styles.sectionTitle}>Local-First Design</Text>
              </View>
              <Text style={styles.sectionText}>
                All workouts are stored locally on your phone. You decide what
                to publish to Nostr and what stays private.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="location-outline"
                  size={22}
                  color={theme.colors.orangeBright}
                />
                <Text style={styles.sectionTitle}>Background Tracking</Text>
              </View>
              <Text style={styles.sectionText}>
                To accurately track runs, walks, and rides while using other
                apps like music or podcasts, RUNSTR needs continuous location
                access.
              </Text>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>
                When prompted for location permissions:
              </Text>
              {Platform.OS === 'ios' ? (
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionBullet}>•</Text>
                  <Text style={styles.instructionText}>
                    Select <Text style={styles.highlight}>"Always"</Text>
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionBullet}>•</Text>
                    <Text style={styles.instructionText}>
                      Select{' '}
                      <Text style={styles.highlight}>"Allow all the time"</Text>
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionBullet}>•</Text>
                    <Text style={styles.instructionText}>
                      Set battery to{' '}
                      <Text style={styles.highlight}>"Unrestricted"</Text>
                    </Text>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onComplete}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Choose a Charity</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.background}
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.orangeBright,
    textAlign: 'center',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    paddingLeft: 30,
  },
  instructionsBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  instructionBullet: {
    fontSize: 13,
    color: theme.colors.orangeBright,
    marginRight: 6,
    marginTop: 1,
  },
  instructionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  highlight: {
    color: theme.colors.orangeBright,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: theme.colors.orangeBright,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.background,
    letterSpacing: 0.5,
  },
});
