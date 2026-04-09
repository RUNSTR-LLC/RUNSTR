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
            <Text style={styles.subtitle}>
              RUNSTR rewards you for working out.{'\n'}Choose where your rewards go.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onComplete}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Choose Reward Destination</Text>
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
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
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
