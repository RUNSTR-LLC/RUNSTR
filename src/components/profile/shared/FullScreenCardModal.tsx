/**
 * FullScreenCardModal - Full screen workout card display for screenshotting
 * Renders workout cards at full screen for easy social media sharing
 * Supports themed photo overlays: MINIMAL, TACTICAL, TOUGH
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import { WorkoutCardRenderer } from '../../cards/WorkoutCardRenderer';
import { WorkoutCardGenerator } from '../../../services/nostr/workoutCardGenerator';
import { FullScreenVerticalCard } from './FullScreenVerticalCard';
import { theme } from '../../../styles/theme';
import type { PublishableWorkout } from '../../../services/nostr/workoutPublishingService';
import { useUnitPreference } from '../../../hooks/useUnitPreference';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Motivational quotes for SVG wrapper
const WRAPPER_QUOTES: Record<string, string[]> = {
  running: [
    'Every step forward is a step toward something bigger.',
    "The miracle isn't that I finished. It's that I started.",
    "It's your mind you have to convince.",
  ],
  walking: [
    'One step at a time.',
    'Every step counts.',
    'Progress is progress, no matter how small.',
  ],
  cycling: [
    'To keep your balance, you must keep moving.',
    'It never gets easier; you just go faster.',
  ],
  strength_training: [
    "The only bad workout is the one that didn't happen.",
    "Strength comes from overcoming what you thought you couldn't.",
  ],
  gym: [
    "The only bad workout is the one that didn't happen.",
    "Strength comes from overcoming what you thought you couldn't.",
  ],
  default: [
    'You showed up. That matters.',
    'Consistency beats perfection.',
    'Progress, not perfection.',
  ],
};

export type PhotoStyle = 'minimal' | 'tactical' | 'tough';

interface FullScreenCardModalProps {
  visible: boolean;
  onClose: () => void;
  workout: PublishableWorkout | null;
  templateId: string;
  customPhotoUri?: string | null;
  userAvatar?: string;
  userName?: string;
  photoStyle?: PhotoStyle;
  onPostToNostr?: (cardImageUri?: string) => Promise<{ success: boolean; error?: string }>;
}

export const FullScreenCardModal: React.FC<FullScreenCardModalProps> = ({
  visible,
  onClose,
  workout,
  templateId,
  customPhotoUri,
  userAvatar,
  userName,
  photoStyle = 'minimal',
  onPostToNostr,
}) => {
  const { t } = useTranslation('profile');
  const { isMetric, distanceLabel, paceLabel } = useUnitPreference();
  const [isPosting, setIsPosting] = useState(false);
  const captureViewRef = useRef<View>(null);

  // Calculate photo dimensions for custom photo overlay
  const photoWidth = SCREEN_WIDTH - 32; // 16px padding on each side
  const photoHeight = SCREEN_HEIGHT * 0.75; // 75% of screen height
  const [cardData, setCardData] = useState<{
    svgContent: string;
    dimensions: { width: number; height: number };
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const cardGenerator = WorkoutCardGenerator.getInstance();

  // Generate random quote for wrapper
  const wrapperQuote = useMemo(() => {
    if (!workout) return WRAPPER_QUOTES.default[0];
    const workoutType = workout.type?.toLowerCase() || '';
    const quotes = WRAPPER_QUOTES[workoutType] || WRAPPER_QUOTES.default;
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, [workout, visible]); // Regenerate when modal opens

  useEffect(() => {
    // Skip SVG generation for native templates (elegant is now fully native)
    if (visible && workout && templateId !== 'custom_photo' && templateId !== 'achievement' && templateId !== 'vertical' && templateId !== 'elegant') {
      generateCard();
    }
  }, [visible, templateId, workout]);

  // Clear card data when modal closes so fresh card (with new random quote) generates next time
  useEffect(() => {
    if (!visible) {
      setCardData(null);
    }
  }, [visible]);

  // Android status bar control - use imperative API for reliable hiding
  useEffect(() => {
    if (visible && Platform.OS === 'android') {
      // Make status bar translucent so content draws underneath
      RNStatusBar.setTranslucent(true);
      // Hide the status bar completely
      RNStatusBar.setHidden(true, 'fade');
      // Set background transparent in case it shows momentarily
      RNStatusBar.setBackgroundColor('transparent');
    }

    return () => {
      if (Platform.OS === 'android') {
        // Restore status bar when modal closes
        RNStatusBar.setHidden(false, 'fade');
        RNStatusBar.setBackgroundColor('#000000');
      }
    };
  }, [visible]);

  const generateCard = async () => {
    if (!workout) return;
    setIsGenerating(true);
    try {
      const data = await cardGenerator.generateWorkoutCard(workout, {
        template: templateId as 'progress' | 'minimal' | 'stats' | 'elegant',
        userAvatar,
        userName,
      });
      setCardData(data);
    } catch (error) {
      console.error('Failed to generate fullscreen card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper: get workout stats
  const getWorkoutStats = () => {
    if (!workout) return { durationStr: '0:00', distanceValue: null, paceValue: null, activityUpper: 'WORKOUT', isStrength: false, totalReps: null, sets: null, reps: null };
    const minutes = Math.floor(workout.duration / 60);
    const seconds = Math.floor(workout.duration % 60);
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Distance in user's preferred unit
    const distanceValue = workout.distance
      ? isMetric
        ? (workout.distance / 1000).toFixed(2)
        : (workout.distance * 0.000621371).toFixed(2)
      : null;

    // Calculate pace in mm:ss format (e.g., "6:02" for 6 minutes 2 seconds per unit)
    const paceValue = workout.distance && workout.distance > 0
      ? (() => {
          // Convert to user's preferred unit
          const distanceInUnits = isMetric
            ? workout.distance / 1000
            : workout.distance * 0.000621371;
          const totalMinutes = workout.duration / 60 / distanceInUnits;
          const mins = Math.floor(totalMinutes);
          const secs = Math.round((totalMinutes - mins) * 60);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        })()
      : null;
    const activityUpper = workout.type.replace(/_/g, ' ').toUpperCase();

    // Strength training stats
    // Note: workout.reps is already the TOTAL reps (sum across all sets), not per-set
    const isStrength = workout.type === 'strength_training' || workout.type === 'gym';
    const totalReps = isStrength ? (workout.reps || 0) : null;
    const sets = isStrength ? workout.sets : null;
    const reps = isStrength ? workout.reps : null;

    return { durationStr, distanceValue, paceValue, activityUpper, isStrength, totalReps, sets, reps };
  };

  // MINIMAL STYLE - Clean, modern, Instagram-story style
  const renderMinimalOverlay = () => {
    const { durationStr, distanceValue, paceValue } = getWorkoutStats();
    return (
      <View style={styles.minimalOverlay}>
        <View style={styles.minimalLine} />
        <View style={styles.minimalStatsRow}>
          {distanceValue && (
            <View style={styles.minimalStat}>
              <Text style={styles.minimalValue}>{distanceValue}</Text>
              <Text style={styles.minimalLabel}>{distanceLabel}</Text>
            </View>
          )}
          <View style={styles.minimalStat}>
            <Text style={styles.minimalValue}>{durationStr}</Text>
            <Text style={styles.minimalLabel}>min</Text>
          </View>
          {paceValue && (
            <View style={styles.minimalStat}>
              <Text style={styles.minimalValue}>{paceValue}</Text>
              <Text style={styles.minimalLabel}>{paceLabel}</Text>
            </View>
          )}
        </View>
        <Text style={styles.minimalBrand}>R U N S T R</Text>
      </View>
    );
  };

  // TACTICAL STYLE - Military/spec-ops data readout
  const renderTacticalOverlay = () => {
    const { durationStr, distanceValue, paceValue, activityUpper } = getWorkoutStats();
    return (
      <View style={styles.tacticalOverlay}>
        {/* Corner brackets */}
        <View style={[styles.tacticalCorner, styles.tacticalCornerTL]} />
        <View style={[styles.tacticalCorner, styles.tacticalCornerTR]} />
        <View style={[styles.tacticalCorner, styles.tacticalCornerBL]} />
        <View style={[styles.tacticalCorner, styles.tacticalCornerBR]} />

        <View style={styles.tacticalBox}>
          <Text style={styles.tacticalMission}>MISSION: {activityUpper}</Text>
          <View style={styles.tacticalDivider} />
          <View style={styles.tacticalStatsColumn}>
            {distanceValue && <Text style={styles.tacticalStat}>DIST: {distanceValue} {distanceLabel}</Text>}
            <Text style={styles.tacticalStat}>TIME: {durationStr}</Text>
            {paceValue && <Text style={styles.tacticalStat}>PACE: {paceValue}{paceLabel}</Text>}
          </View>
          <View style={styles.tacticalDivider} />
          <Text style={styles.tacticalStatus}>{'▶'} RUNSTR // COMPLETE</Text>
        </View>
      </View>
    );
  };

  // TOUGH STYLE - Bold, industrial, high-contrast
  const renderToughOverlay = () => {
    const { durationStr, distanceValue, paceValue, activityUpper } = getWorkoutStats();
    const activitySpaced = activityUpper.split('').join(' ');
    return (
      <View style={styles.toughOverlay}>
        <View style={styles.toughTopBar} />
        <View style={styles.toughContent}>
          <Text style={styles.toughActivity}>{activitySpaced}</Text>
          <Text style={styles.toughStats}>
            {distanceValue ? `${distanceValue} ${distanceLabel.toUpperCase()}` : ''}{distanceValue ? '  |  ' : ''}{durationStr}{paceValue ? `  |  ${paceValue} PACE` : ''}
          </Text>
          <View style={styles.toughUnderline} />
          <Text style={styles.toughBrand}>RUNSTR</Text>
        </View>
      </View>
    );
  };

  // Render SVG card with full-screen wrapper (avatar at top, card in middle, branding at bottom)
  const renderSvgWithWrapper = () => {
    if (!cardData) return null;

    // Calculate scale to fit card in center section
    const centerHeight = SCREEN_HEIGHT * 0.55; // 55% of screen for card
    const widthScale = (SCREEN_WIDTH - 32) / cardData.dimensions.width;
    const heightScale = centerHeight / cardData.dimensions.height;
    const scale = Math.min(widthScale, heightScale, 1.2);

    return (
      <View style={styles.fullScreenWrapper}>
        {/* TOP: Avatar + Username + Quote */}
        <View style={styles.topSection}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.wrapperAvatar} />
          ) : (
            <View style={styles.wrapperAvatarPlaceholder}>
              <Text style={styles.wrapperAvatarInitial}>
                {userName ? userName.charAt(0).toUpperCase() : 'R'}
              </Text>
            </View>
          )}
          {userName && <Text style={styles.wrapperUserName}>{userName}</Text>}
          <Text style={styles.wrapperQuote}>"{wrapperQuote}"</Text>
        </View>

        {/* CENTER: Scaled SVG Card */}
        <View style={styles.cardSection}>
          <View style={[styles.cardWrapper, {
            width: cardData.dimensions.width * scale,
            height: cardData.dimensions.height * scale,
          }]}>
            <View style={{ transform: [{ scale }], transformOrigin: 'top left' }}>
              <WorkoutCardRenderer
                svgContent={cardData.svgContent}
                width={cardData.dimensions.width}
                height={cardData.dimensions.height}
              />
            </View>
          </View>
        </View>

        {/* BOTTOM: Branding */}
        <View style={styles.bottomSection}>
          <Text style={styles.wrapperBranding}>R U N S T R</Text>
        </View>
      </View>
    );
  };

  // Render elegant template as fully native layout (no SVG)
  const renderElegantNative = () => {
    const { durationStr, distanceValue, paceValue, isStrength, totalReps, sets, reps } = getWorkoutStats();

    // Get team from workout metadata or default to ALS Network
    const teamName = workout?.metadata?.team || 'ALS Network';

    return (
      <View style={styles.elegantContainer}>
        {/* TOP: Username + Quote */}
        <View style={styles.elegantTop}>
          <Text style={styles.elegantUsername}>
            {userName || t('anonymousAthlete')}
          </Text>
          <Text style={styles.elegantQuote}>"{wrapperQuote}"</Text>
        </View>

        {/* MIDDLE: Large Avatar */}
        <View style={styles.elegantMiddle}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.elegantAvatar} />
          ) : (
            <View style={styles.elegantAvatarPlaceholder}>
              <Text style={styles.elegantAvatarInitial}>
                {userName ? userName.charAt(0).toUpperCase() : 'A'}
              </Text>
            </View>
          )}
        </View>

        {/* BOTTOM: Stats + Team */}
        <View style={styles.elegantBottom}>
          {/* STRENGTH STATS */}
          {isStrength ? (
            <>
              <Text style={styles.elegantStat}>{totalReps} reps</Text>
              <Text style={styles.elegantStatSecondary}>{sets} sets x {reps} reps</Text>
              <Text style={styles.elegantStatSecondary}>{durationStr}</Text>
            </>
          ) : (
            /* CARDIO STATS */
            <>
              {distanceValue && (
                <Text style={styles.elegantStat}>{distanceValue} {distanceLabel}</Text>
              )}
              <Text style={styles.elegantStat}>{durationStr}</Text>
              {paceValue && (
                <Text style={styles.elegantStatSecondary}>{paceValue} {paceLabel}</Text>
              )}
            </>
          )}

          {/* Divider */}
          <View style={styles.elegantDivider} />

          {/* Team */}
          <Text style={styles.elegantSupportingLabel}>Supporting</Text>
          <Text style={styles.elegantTeamName}>{teamName}</Text>
        </View>
      </View>
    );
  };

  // Render photo with selected style overlay
  const renderPhotoWithStyle = () => {
    if (!customPhotoUri || !workout) return null;

    const gradientColors: [string, string] = photoStyle === 'tactical'
      ? ['transparent', 'rgba(26, 46, 26, 0.95)']
      : ['transparent', 'rgba(0, 0, 0, 0.85)'];

    // Use calculated pixel dimensions instead of percentages
    return (
      <View style={[styles.photoWithOverlay, { width: photoWidth, height: photoHeight }]}>
        <Image
          source={{ uri: customPhotoUri }}
          style={[styles.customPhotoBackground, { width: photoWidth, height: photoHeight }]}
          resizeMode="cover"
        />
        <LinearGradient colors={gradientColors} style={styles.gradientOverlay} />

        {photoStyle === 'minimal' && renderMinimalOverlay()}
        {photoStyle === 'tactical' && renderTacticalOverlay()}
        {photoStyle === 'tough' && renderToughOverlay()}
      </View>
    );
  };

  const renderContent = () => {
    // Debug logging
    console.log('🖼️ FullScreenCardModal renderContent:', {
      templateId,
      hasCustomPhotoUri: !!customPhotoUri,
      customPhotoUri: customPhotoUri?.substring(0, 50),
      hasWorkout: !!workout,
      photoStyle,
    });

    // Full-screen vertical card - native React Native layout
    if (templateId === 'vertical' && workout) {
      return (
        <FullScreenVerticalCard
          workout={workout}
          userAvatar={userAvatar}
          userName={userName}
        />
      );
    }

    // Custom photo with themed overlay
    if (templateId === 'custom_photo' && customPhotoUri && workout) {
      return renderPhotoWithStyle();
    }

    // Fallback for custom_photo without URI
    if (templateId === 'custom_photo' && !customPhotoUri) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No photo available</Text>
        </View>
      );
    }

    // Text-based achievement template (no emojis)
    if (templateId === 'achievement' && workout) {
      const { durationStr, distanceValue, activityUpper } = getWorkoutStats();
      return (
        <View style={styles.textCardContainer}>
          <Text style={styles.textCardTitle}>
            {activityUpper} COMPLETE
          </Text>
          <View style={styles.textCardDivider} />
          <Text style={styles.textCardDuration}>{durationStr}</Text>
          {distanceValue && (
            <Text style={styles.textCardDistance}>{distanceValue} {distanceLabel}</Text>
          )}
          <Text style={styles.textCardHashtags}>#RUNSTR</Text>
        </View>
      );
    }

    // Elegant template - fully native (no SVG)
    if (templateId === 'elegant' && workout) {
      return renderElegantNative();
    }

    // SVG card templates - use full-screen wrapper
    if (cardData) {
      return renderSvgWithWrapper();
    }

    // Loading state
    if (isGenerating) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Generating card...</Text>
        </View>
      );
    }

    return null;
  };

  // Handle posting to Nostr (captures card and calls callback)
  const handlePost = async () => {
    if (!onPostToNostr || !captureViewRef.current) return;

    setIsPosting(true);
    try {
      // Capture the full-screen card as an image
      const uri = await captureRef(captureViewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('[FullScreenCard] Captured card image:', uri?.substring(0, 50));

      // Call the post callback with the captured image
      const result = await onPostToNostr(uri);

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Posted to Nostr!',
          text2: 'Your workout has been shared',
          position: 'bottom',
          visibilityTime: 3000,
        });
        onClose();
        return; // Exit early - don't update state on unmounting component
      } else {
        Toast.show({
          type: 'error',
          text1: 'Post Failed',
          text2: result.error || 'Could not post to Nostr',
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('[FullScreenCard] Post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Post Failed',
        text2: 'Could not capture card',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
    // Only reset isPosting if we didn't close (i.e. there was an error)
    setIsPosting(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* iOS: Use declarative expo-status-bar. Android: Handled imperatively via useEffect */}
      {Platform.OS === 'ios' && <ExpoStatusBar hidden={true} />}
      <View style={styles.container}>
        {/* Capture wrapper for screenshot */}
        <View ref={captureViewRef} collapsable={false} style={styles.captureWrapper}>
          <View style={styles.cardContainer}>
            {renderContent()}
          </View>
        </View>

        {/* Post to Nostr button (only if callback provided) */}
        {onPostToNostr && (
          <View style={styles.postButtonContainer}>
            <TouchableOpacity
              style={[styles.postButton, isPosting && styles.postButtonDisabled]}
              onPress={handlePost}
              disabled={isPosting}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color={theme.colors.background} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color={theme.colors.background} />
                  <Text style={styles.postButtonText}>Post to Nostr</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tap to close (only if no post callback - screenshot mode) */}
        {!onPostToNostr && (
          <TouchableOpacity
            style={styles.closeOverlay}
            activeOpacity={1}
            onPress={onClose}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  captureWrapper: { flex: 1, backgroundColor: '#000' },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardWrapper: { overflow: 'hidden', borderRadius: 12 },
  closeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  postButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    gap: 12,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  photoWithOverlay: { position: 'relative', borderRadius: 16, overflow: 'hidden' },
  customPhotoBackground: { position: 'absolute', top: 0, left: 0 },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },

  // MINIMAL STYLE
  minimalOverlay: { position: 'absolute', bottom: 32, left: 24, right: 24 },
  minimalLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginBottom: 20, width: '60%', alignSelf: 'center' },
  minimalStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  minimalStat: { alignItems: 'center' },
  minimalValue: { fontSize: 40, fontWeight: '300', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  minimalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  minimalBrand: { fontSize: 16, fontWeight: '600', color: theme.colors.accent, textAlign: 'center', letterSpacing: 8 },

  // TACTICAL STYLE
  tacticalOverlay: { position: 'absolute', bottom: 24, left: 16, right: 16 },
  tacticalCorner: { position: 'absolute', width: 20, height: 20, borderColor: 'rgba(255,255,255,0.6)' },
  tacticalCornerTL: { top: -30, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  tacticalCornerTR: { top: -30, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  tacticalCornerBL: { bottom: -10, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  tacticalCornerBR: { bottom: -10, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  tacticalBox: { backgroundColor: 'rgba(26, 46, 26, 0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', padding: 16, marginHorizontal: 8 },
  tacticalMission: { fontFamily: 'Courier', fontSize: 16, fontWeight: '700', color: '#8b7355', marginBottom: 8, letterSpacing: 1 },
  tacticalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 8 },
  tacticalStatsColumn: { gap: 4 },
  tacticalStat: { fontFamily: 'Courier', fontSize: 14, color: '#fff', letterSpacing: 1 },
  tacticalStatus: { fontFamily: 'Courier', fontSize: 12, color: '#8b7355', marginTop: 4 },

  // TOUGH STYLE
  toughOverlay: { position: 'absolute', bottom: 24, left: 0, right: 0 },
  toughTopBar: { height: 4, backgroundColor: '#FF3333', marginBottom: 16 },
  toughContent: { paddingHorizontal: 24 },
  toughActivity: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 6, marginBottom: 12, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  toughStats: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 1, marginBottom: 12 },
  toughUnderline: { height: 3, backgroundColor: '#fff', width: '80%', marginBottom: 12 },
  toughBrand: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'right', letterSpacing: 2 },

  // ACHIEVEMENT TEXT CARD (no emojis)
  textCardContainer: { backgroundColor: '#111', borderRadius: 20, padding: 32, alignItems: 'center', width: '90%', maxWidth: 400, borderWidth: 2, borderColor: theme.colors.text },
  textCardTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  textCardDivider: { height: 2, backgroundColor: theme.colors.text, width: '50%', marginBottom: 20 },
  textCardDuration: { fontSize: 48, fontWeight: '300', color: '#fff', marginBottom: 8 },
  textCardDistance: { fontSize: 24, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  textCardHashtags: { fontSize: 16, color: theme.colors.accent, marginTop: 16 },
  loadingContainer: { alignItems: 'center' },
  loadingText: { color: '#666', fontSize: 16, marginTop: 12 },

  // Full-screen wrapper styles for SVG templates
  fullScreenWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    paddingTop: 40,
    paddingBottom: 30,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  wrapperAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  wrapperAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  wrapperAvatarInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  wrapperUserName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  wrapperQuote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  cardSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  wrapperBranding: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 8,
  },

  // Elegant native styles (black/grey/white only, no orange)
  elegantContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  elegantTop: {
    alignItems: 'center',
  },
  elegantUsername: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  elegantQuote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  elegantMiddle: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  elegantAvatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#333',
  },
  elegantAvatarPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  elegantAvatarInitial: {
    fontSize: 72,
    fontWeight: '300',
    color: '#666',
  },
  elegantBottom: {
    alignItems: 'center',
  },
  elegantStat: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 4,
  },
  elegantStatSecondary: {
    fontSize: 18,
    color: '#888',
    marginBottom: 16,
  },
  elegantDivider: {
    width: '60%',
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  elegantSupportingLabel: {
    fontSize: 12,
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  elegantTeamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
