/**
 * WelcomePermissionModal Component
 * Educational modal shown on first app launch
 * Step 1: Explains RUNSTR's local-first philosophy and permission requirements
 * Step 2: Choose where workout rewards go (charity, AI credits, or Bitcoin wallet)
 */

import React, { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';

const SELECTED_TEAM_KEY = '@runstr:selected_team_id';
const DEFAULT_TEAM_ID = 'als-foundation';

interface WelcomePermissionModalProps {
  visible: boolean;
  onComplete: () => void;
}

type RewardOption = 'als-foundation' | 'ppq-ai' | 'coinos';

export const WelcomePermissionModal: React.FC<WelcomePermissionModalProps> = ({
  visible,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedOption, setSelectedOption] = useState<RewardOption | null>(null);

  const handleGetStarted = () => {
    setStep(2);
  };

  const handleContinue = async () => {
    const teamId = selectedOption || DEFAULT_TEAM_ID;
    await AsyncStorage.setItem(SELECTED_TEAM_KEY, teamId);
    setStep(1);
    setSelectedOption(null);
    onComplete();
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(SELECTED_TEAM_KEY, DEFAULT_TEAM_ID);
    setStep(1);
    setSelectedOption(null);
    onComplete();
  };

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
            {step === 1 ? (
              <>
                {/* Step 1: Welcome + Permissions */}
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
                  onPress={handleGetStarted}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={theme.colors.background}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Step 2: Reward Destination */}
                <Text style={styles.title}>WORKOUT REWARDS</Text>
                <Text style={styles.subtitle}>
                  Where should your rewards go?
                </Text>

                <Text style={styles.paragraph}>
                  Every workout earns 50 sats. Choose how you want to receive them.
                </Text>

                {/* Option Cards */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedOption === 'als-foundation' && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedOption('als-foundation')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="heart" size={24} color="#FF9D42" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Support a Charity</Text>
                    <Text style={styles.optionDescription}>
                      Donate rewards to ALS Network (honoring Hal Finney)
                    </Text>
                  </View>
                  {selectedOption === 'als-foundation' && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedOption === 'ppq-ai' && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedOption('ppq-ai')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="sparkles" size={24} color="#FF9D42" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Earn AI Credits</Text>
                    <Text style={styles.optionDescription}>
                      Convert rewards to AI credits for Coach RUNSTR
                    </Text>
                  </View>
                  {selectedOption === 'ppq-ai' && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedOption === 'coinos' && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedOption('coinos')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="wallet-outline" size={24} color="#FF9D42" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Earn to CoinOS</Text>
                    <Text style={styles.optionDescription}>
                      Send and receive sats with a Lightning wallet
                    </Text>
                  </View>
                  {selectedOption === 'coinos' && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  )}
                </TouchableOpacity>

                {/* Continue Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    !selectedOption && styles.buttonDisabled,
                  ]}
                  onPress={handleContinue}
                  activeOpacity={0.7}
                  disabled={!selectedOption}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={theme.colors.background}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>

                {/* Skip Link */}
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipText}>Skip (default: ALS Network)</Text>
                </TouchableOpacity>
              </>
            )}
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
  buttonDisabled: {
    opacity: 0.5,
  },
  // Step 2: Option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  optionCardSelected: {
    borderColor: '#FF9D42',
    backgroundColor: '#1a1208',
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  skipText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
