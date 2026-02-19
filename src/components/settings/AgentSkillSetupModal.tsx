/**
 * AgentSkillSetupModal - Setup instructions for the RUNSTR Fitness Skill
 *
 * Shows users how to connect the runstr-fitness Claude Code skill
 * to their account by providing their nsec and PPQ.ai API key.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { SecureNsecStorage } from '../../services/auth/SecureNsecStorage';
import { PPQAccountService } from '../../services/ai/PPQAccountService';

const SKILL_GITHUB_URL = 'https://github.com/RUNSTR-LLC/runstr-fitness-skill';
const SKILL_INSTALL_CMD = 'claude skill install RUNSTR-LLC/runstr-fitness-skill';

interface AgentSkillSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AgentSkillSetupModal: React.FC<AgentSkillSetupModalProps> = ({
  visible,
  onClose,
}) => {
  const [nsec, setNsec] = useState<string | null>(null);
  const [npub, setNpub] = useState<string | null>(null);
  const [ppqApiKey, setPpqApiKey] = useState<string | null>(null);
  const [nsecRevealed, setNsecRevealed] = useState(false);
  const [ppqKeyRevealed, setPpqKeyRevealed] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCredentials();
      // Reset reveal state when modal opens
      setNsecRevealed(false);
      setPpqKeyRevealed(false);
    }
  }, [visible]);

  const loadCredentials = async () => {
    try {
      const [storedNsec, storedNpub, storedPpqKey] = await Promise.all([
        SecureNsecStorage.getNsec(),
        AsyncStorage.getItem('@runstr:npub'),
        PPQAccountService.getApiKey(),
      ]);
      setNsec(storedNsec);
      setNpub(storedNpub);
      setPpqApiKey(storedPpqKey);
    } catch (error) {
      console.error('[AgentSkillSetup] Error loading credentials:', error);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: `${label} copied to clipboard`,
      position: 'top',
      visibilityTime: 2000,
    });
  };

  const maskValue = (value: string, revealChars = 8) => {
    if (value.length <= revealChars + 4) return value;
    return value.slice(0, revealChars) + '...' + value.slice(-4);
  };

  const openGitHub = () => {
    Linking.openURL(SKILL_GITHUB_URL);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="hardware-chip-outline" size={28} color={theme.colors.orangeBright} />
              </View>
              <Text style={styles.title}>RUNSTR Fitness Skill</Text>
              <Text style={styles.subtitle}>
                Give your AI agent access to your workouts, habits, journal entries, mood, steps, and competition rankings.
              </Text>
            </View>

            {/* What It Does */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>What your agent gets access to</Text>
              <View style={styles.featureList}>
                {[
                  'Workout history (running, walking, cycling, etc.)',
                  'Daily habits and streaks',
                  'Journal entries with mood and energy',
                  'Daily step counts',
                  'Competition leaderboards and rankings',
                  'AI fitness coaching based on real data',
                ].map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Step 1: Install */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Install the skill</Text>
              </View>
              <Text style={styles.stepDescription}>
                Run this command in Claude Code on your computer:
              </Text>
              <TouchableOpacity
                style={styles.codeBlock}
                onPress={() => copyToClipboard(SKILL_INSTALL_CMD, 'Install command')}
                activeOpacity={0.7}
              >
                <Text style={styles.codeText}>{SKILL_INSTALL_CMD}</Text>
                <Ionicons name="copy-outline" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={openGitHub} activeOpacity={0.7}>
                <Text style={styles.linkText}>View on GitHub</Text>
              </TouchableOpacity>
            </View>

            {/* Step 2: Copy nsec */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Give your agent your nsec</Text>
              </View>
              <Text style={styles.stepDescription}>
                Your nsec lets the agent decrypt your encrypted fitness backup from Nostr. It's used locally on your machine and never stored or transmitted.
              </Text>
              {nsec ? (
                <View style={styles.credentialContainer}>
                  <TouchableOpacity
                    style={styles.credentialRow}
                    onPress={() => setNsecRevealed(!nsecRevealed)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.credentialInfo}>
                      <Text style={styles.credentialLabel}>nsec</Text>
                      <Text style={styles.credentialValue} numberOfLines={1}>
                        {nsecRevealed ? nsec : maskValue(nsec)}
                      </Text>
                    </View>
                    <Ionicons
                      name={nsecRevealed ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(nsec, 'nsec')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy-outline" size={16} color="#000" />
                    <Text style={styles.copyButtonText}>Copy nsec</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.unavailableBox}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.colors.textMuted} />
                  <Text style={styles.unavailableText}>Sign in to access your nsec</Text>
                </View>
              )}
            </View>

            {/* Step 3: PPQ.ai API Key (optional) */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <Text style={styles.stepTitle}>PPQ.ai API key (optional)</Text>
              </View>
              <Text style={styles.stepDescription}>
                If you use PPQ.ai for AI credits, give your agent the key so it can make AI-powered coaching queries on your behalf.
              </Text>
              {ppqApiKey ? (
                <View style={styles.credentialContainer}>
                  <TouchableOpacity
                    style={styles.credentialRow}
                    onPress={() => setPpqKeyRevealed(!ppqKeyRevealed)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.credentialInfo}>
                      <Text style={styles.credentialLabel}>API Key</Text>
                      <Text style={styles.credentialValue} numberOfLines={1}>
                        {ppqKeyRevealed ? ppqApiKey : maskValue(ppqApiKey)}
                      </Text>
                    </View>
                    <Ionicons
                      name={ppqKeyRevealed ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(ppqApiKey, 'PPQ.ai API key')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy-outline" size={16} color="#000" />
                    <Text style={styles.copyButtonText}>Copy API key</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.unavailableBox}>
                  <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
                  <Text style={styles.unavailableText}>
                    No PPQ.ai account. Select PPQ.ai as your reward destination to set one up.
                  </Text>
                </View>
              )}
            </View>

            {/* Step 4: Backup reminder */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>4</Text>
                </View>
                <Text style={styles.stepTitle}>Keep your backup fresh</Text>
              </View>
              <Text style={styles.stepDescription}>
                Your agent sees whatever was in your last backup. After new workouts, go to Settings {'>'} Data & Backup {'>'} Export to Nostr to sync the latest data.
              </Text>
            </View>

            {/* Privacy note */}
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textMuted} />
              <Text style={styles.privacyText}>
                Your nsec is used locally by the agent to decrypt your backup. It is never stored, logged, or sent to any server.
              </Text>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: '#1a1a1a',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 28, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB366',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  stepSection: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.orangeBright,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
    marginLeft: 34,
  },
  codeBlock: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginLeft: 34,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 13,
    fontFamily: 'Courier',
    color: '#ccc',
    flex: 1,
    marginRight: 8,
  },
  linkText: {
    fontSize: 13,
    color: theme.colors.orangeBright,
    marginLeft: 34,
  },
  credentialContainer: {
    marginLeft: 34,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  credentialValue: {
    fontSize: 13,
    fontFamily: 'Courier',
    color: '#ccc',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.orangeBright,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 34,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  unavailableText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    flex: 1,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  privacyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 36,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AgentSkillSetupModal;
