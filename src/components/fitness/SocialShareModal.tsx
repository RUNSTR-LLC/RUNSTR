/**
 * SocialShareModal - Platform selection modal for workout sharing
 * Allows users to choose where to share their workout (Nostr active, others coming soon)
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface SocialShareModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlatform: (platform: 'nostr' | 'twitter' | 'instagram') => void;
}

interface PlatformOption {
  id: 'nostr' | 'twitter' | 'instagram';
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  available: boolean;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  visible,
  onClose,
  onSelectPlatform,
}) => {
  const platforms: PlatformOption[] = [
    {
      id: 'nostr',
      name: 'Nostr',
      icon: 'flash',
      available: true,
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'logo-twitter',
      available: false,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram',
      available: false,
    },
  ];

  const handlePlatformPress = (platform: PlatformOption) => {
    if (platform.available) {
      onSelectPlatform(platform.id);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share Your Workout</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Choose where to share your achievement
              </Text>

              <View style={styles.platformGrid}>
                {platforms.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    style={[
                      styles.platformButton,
                      !platform.available && styles.platformButtonDisabled,
                    ]}
                    onPress={() => handlePlatformPress(platform)}
                    disabled={!platform.available}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        !platform.available && styles.iconContainerDisabled,
                      ]}
                    >
                      <Ionicons
                        name={platform.icon}
                        size={28}
                        color={platform.available ? theme.colors.text : theme.colors.textMuted}
                      />
                    </View>
                    <Text style={styles.platformName}>{platform.name}</Text>
                    {!platform.available && (
                      <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.infoText}>
                Share your achievements with your community and inspire others to stay active!
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  platformGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  platformButton: {
    alignItems: 'center',
    padding: 12,
    flex: 1,
  },
  platformButtonDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainerDisabled: {
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  comingSoonBadge: {
    fontSize: 10,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SocialShareModal;