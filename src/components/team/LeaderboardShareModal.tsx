/**
 * LeaderboardShareModal - Modal for sharing leaderboard results to Nostr
 * Generates a beautiful card with all runners and posts as kind 1 event
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { theme } from '../../styles/theme';
import {
  LeaderboardCardGenerator,
  type LeaderboardCardData,
} from '../../services/nostr/leaderboardCardGenerator';
import { WorkoutCardRenderer } from '../cards/WorkoutCardRenderer';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import { getNsecFromStorage } from '../../utils/nostr';
import { GlobalNDKService } from '../../services/nostr/GlobalNDKService';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import type { LeaderboardEntry } from '../../services/competition/DailyLeaderboardService';

interface LeaderboardShareModalProps {
  visible: boolean;
  title: string; // "5K Today"
  distance: string; // "5km"
  entries: LeaderboardEntry[];
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LeaderboardShareModal: React.FC<LeaderboardShareModalProps> = ({
  visible,
  title,
  distance,
  entries,
  userId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [cardSvg, setCardSvg] = useState<string>('');
  const [cardDimensions, setCardDimensions] = useState({
    width: 800,
    height: 600,
  });
  const [signer, setSigner] = useState<NDKSigner | null>(null);
  const cardRef = useRef<View>(null);

  const cardGenerator = LeaderboardCardGenerator.getInstance();

  // Load signer when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadSigner();
      generateCardPreview();
    }
  }, [visible, entries]);

  const loadSigner = async () => {
    try {
      const userSigner = await UnifiedSigningService.getInstance().getSigner();
      setSigner(userSigner);
      console.log('✅ Signer loaded for leaderboard share');
    } catch (error) {
      console.error('Failed to load signer:', error);
    }
  };

  const generateCardPreview = async () => {
    if (!entries || entries.length === 0) return;

    try {
      console.log('🎨 Generating leaderboard card preview...');

      const cardData: LeaderboardCardData = {
        title,
        distance,
        date: new Date(),
        entries,
      };

      const result = await cardGenerator.generateLeaderboardCard(cardData);

      console.log('✅ Leaderboard card preview generated:', {
        svgLength: result.svgContent.length,
        dimensions: result.dimensions,
      });

      setCardSvg(result.svgContent);
      setCardDimensions(result.dimensions);
    } catch (error) {
      console.error('❌ Failed to generate leaderboard card preview:', error);
    }
  };

  const handleShare = async () => {
    if (!entries || entries.length === 0) return;

    setLoading(true);

    try {
      // Get signer or nsec
      let signerOrNsec: NDKSigner | string | null = signer;

      if (!signerOrNsec) {
        const nsec = await getNsecFromStorage(userId);
        if (!nsec) {
          console.error('❌ Authentication required');
          setLoading(false);
          return;
        }
        signerOrNsec = nsec;
        console.log('📝 Using nsec for leaderboard post');
      } else {
        console.log('📝 Using Amber signer for leaderboard post');
      }

      // Capture card as image
      let cardImageUri: string | undefined;

      if (cardRef.current && cardSvg) {
        try {
          cardImageUri = await captureRef(cardRef.current, {
            format: 'png',
            quality: 0.9,
          });
          console.log('✅ Leaderboard card captured:', cardImageUri);
        } catch (captureError) {
          console.error('❌ Card capture failed:', captureError);
        }
      }

      // Upload image to nostr.build if captured
      let imageUrl: string | undefined;
      if (cardImageUri) {
        imageUrl = await uploadToNostrBuild(cardImageUri);
      }

      // Generate post text
      const cardData: LeaderboardCardData = {
        title,
        distance,
        date: new Date(),
        entries,
      };
      const postText = cardGenerator.generatePostText(cardData);

      // Create and publish kind 1 event
      const ndk = await GlobalNDKService.getInstance();

      // Get the private key for signing
      let privateKey: string | undefined;
      if (typeof signerOrNsec === 'string') {
        privateKey = signerOrNsec;
      }

      // Create event content with image if available
      let content = postText;
      if (imageUrl) {
        content = `${postText}\n\n${imageUrl}`;
      }

      // Create the event
      const { NDKEvent } = await import('@nostr-dev-kit/ndk');
      const event = new NDKEvent(ndk);
      event.kind = 1;
      event.content = content;
      event.tags = [['t', 'runstr'], ['t', 'fitness'], ['t', 'leaderboard']];

      // Add imeta tag for image if we have one
      if (imageUrl) {
        event.tags.push([
          'imeta',
          `url ${imageUrl}`,
          'm image/png',
          `dim ${cardDimensions.width}x${cardDimensions.height}`,
        ]);
      }

      // Sign the event
      if (privateKey) {
        const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
        const privateSigner = new NDKPrivateKeySigner(privateKey);
        await event.sign(privateSigner);
      } else if (signer) {
        ndk.signer = signer;
        await event.sign();
      }

      // Publish
      await event.publish();
      console.log('✅ Leaderboard posted to Nostr:', event.id);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Failed to share leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic scale
  const MODAL_PADDING = 40;
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = screenWidth - MODAL_PADDING;
  const dynamicScale = Math.min(availableWidth / cardDimensions.width, 1);

  if (!entries || entries.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Share Leaderboard</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>{title}</Text>
              <Text style={styles.summarySubtitle}>
                {entries.length} {entries.length === 1 ? 'runner' : 'runners'}
              </Text>
            </View>

            {/* Card Preview */}
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.cardPreviewContainer}>
              {cardSvg ? (
                <View
                  style={[
                    styles.cardWrapper,
                    {
                      width: cardDimensions.width,
                      height: cardDimensions.height,
                      transform: [{ scale: dynamicScale }],
                    },
                  ]}
                >
                  <WorkoutCardRenderer
                    ref={cardRef}
                    svgContent={cardSvg}
                    width={cardDimensions.width}
                    height={cardDimensions.height}
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.cardPlaceholder,
                    {
                      width: cardDimensions.width * dynamicScale,
                      height: cardDimensions.height * dynamicScale,
                    },
                  ]}
                >
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                  <Text style={styles.cardPlaceholderText}>
                    Generating card...
                  </Text>
                </View>
              )}
            </View>

            {/* Share Button */}
            <TouchableOpacity
              style={[styles.shareButton, loading && styles.shareButtonDisabled]}
              onPress={handleShare}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.background}
                />
              ) : (
                <Text style={styles.shareButtonText}>Share</Text>
              )}
            </TouchableOpacity>

            {/* Info */}
            <Text style={styles.infoText}>
              Your leaderboard will be uploaded to nostr.build and shared as an
              image post
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Upload image to nostr.build
 */
async function uploadToNostrBuild(imageUri: string): Promise<string | undefined> {
  try {
    console.log('📤 Uploading leaderboard card to nostr.build...');

    // Read the file and create form data
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/png',
      name: 'leaderboard.png',
    } as any);

    const uploadResponse = await fetch('https://nostr.build/api/v2/upload/files', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();

    if (result.status === 'success' && result.data?.[0]?.url) {
      console.log('✅ Image uploaded:', result.data[0].url);
      return result.data[0].url;
    }

    throw new Error('Invalid response from nostr.build');
  } catch (error) {
    console.error('❌ Failed to upload to nostr.build:', error);
    return undefined;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  summaryContainer: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryTitle: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  summarySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardPreviewContainer: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  cardWrapper: {
    transformOrigin: 'top left',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardPlaceholderText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  shareButton: {
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
