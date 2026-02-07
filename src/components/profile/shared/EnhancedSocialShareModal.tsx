/**
 * EnhancedSocialShareModal - Modal for saving workout cards locally
 * Full screen design matching app's design system (Settings/Rewards screens)
 * Features: Template picker (vertical list), card preview, camera capture, fullscreen preview
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../../styles/theme';
import { WorkoutCardGenerator } from '../../../services/nostr/workoutCardGenerator';
import { WorkoutCardRenderer } from '../../cards/WorkoutCardRenderer';
import { PostingErrorBoundary } from '../../ui/PostingErrorBoundary';
import LocalWorkoutStorageService from '../../../services/fitness/LocalWorkoutStorageService';
import type { Workout } from '../../../types/workout';
import type { PublishableWorkout } from '../../../services/nostr/workoutPublishingService';
import { FullScreenCardModal, PhotoStyle } from './FullScreenCardModal';

interface EnhancedSocialShareModalProps {
  visible: boolean;
  workout: Workout | null;
  userId: string;
  userAvatar?: string;
  userName?: string;
  localWorkoutId?: string;
  onPostToNostr?: (cardImageUri?: string) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  onSuccess?: () => void;
}

type Template = 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant' | 'custom_photo' | 'vertical' | 'gallery';

interface TemplateOption {
  id: Template;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: 'vertical', name: 'Text', description: 'Workout stats with motivational quote', icon: 'phone-portrait-outline' },
  { id: 'custom_photo', name: 'Camera', description: 'Take a photo with stats overlay', icon: 'camera' },
  { id: 'gallery', name: 'Gallery', description: 'Choose photo from library', icon: 'images-outline' },
  { id: 'elegant', name: 'Profile', description: 'Your avatar with workout stats', icon: 'sparkles' },
];

const PHOTO_STYLE_OPTIONS: { id: PhotoStyle; name: string }[] = [
  { id: 'minimal', name: 'Minimal' },
  { id: 'tactical', name: 'Tactical' },
  { id: 'tough', name: 'Tough' },
];

export const EnhancedSocialShareModal: React.FC<EnhancedSocialShareModalProps> = ({
  visible,
  workout,
  userId: _userId,
  userAvatar,
  userName,
  localWorkoutId,
  onPostToNostr,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation('profile');
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>('vertical');
  const [cardSvg, setCardSvg] = useState<string>('');
  const [cardDimensions, setCardDimensions] = useState({ width: 800, height: 600 });
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
  const [photoStyle, setPhotoStyle] = useState<PhotoStyle>('minimal');
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [svgReady, setSvgReady] = useState(Platform.OS !== 'android');
  const cardRef = useRef<View>(null);
  const isMountedRef = useRef(true);

  const cardGenerator = WorkoutCardGenerator.getInstance();

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      setSvgReady(false);
      const timer = setTimeout(() => setSvgReady(true), 300);
      return () => clearTimeout(timer);
    } else if (!visible) {
      setSvgReady(Platform.OS !== 'android');
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      // Delay state reset to prevent flash during close animation
      const timer = setTimeout(() => {
        setCustomPhotoUri(null);
        setShowFullscreenPreview(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    if (workout && visible) {
      generateCardPreview();
    }
  }, [workout, selectedTemplate, visible]);

  const generateCardPreview = async () => {
    if (!workout) return;
    // Skip SVG generation for native/text templates (gallery uses custom_photo rendering)
    if (selectedTemplate === 'achievement' || selectedTemplate === 'custom_photo' || selectedTemplate === 'vertical' || selectedTemplate === 'elegant' || selectedTemplate === 'gallery') {
      if (isMountedRef.current) setCardSvg('');
      return;
    }
    try {
      // At this point, selectedTemplate is guaranteed to be a valid SVG template
      // (achievement, progress, minimal, stats, elegant) since we skip native templates above
      const cardData = await cardGenerator.generateWorkoutCard(workout as PublishableWorkout, {
        template: selectedTemplate as 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant',
        userAvatar,
        userName,
      });
      if (!isMountedRef.current) return;
      setCardSvg(cardData.svgContent);
      setCardDimensions(cardData.dimensions);
    } catch (error) {
      console.error('Failed to generate card preview:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('📸 Photo captured:', result.assets[0].uri.substring(0, 50));
        setCustomPhotoUri(result.assets[0].uri);
        setSelectedTemplate('custom_photo');
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const pickPhotoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to select photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16], // Portrait aspect for fullscreen
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ Photo selected:', result.assets[0].uri.substring(0, 50));
        setCustomPhotoUri(result.assets[0].uri);
        setSelectedTemplate('custom_photo');
      }
    } catch (error) {
      console.error('Failed to pick photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleTemplateSelect = (templateId: Template) => {
    if (templateId === 'custom_photo') {
      takePhoto();
    } else if (templateId === 'gallery') {
      pickPhotoFromGallery();
    } else {
      setSelectedTemplate(templateId);
    }
  };

  const handleSave = async () => {
    if (!workout) return;

    // Dismiss keyboard to prevent iOS crash during modal transition
    Keyboard.dismiss();

    console.log('🖼️ handleSave called:', {
      selectedTemplate,
      customPhotoUri: customPhotoUri?.substring(0, 50),
      photoStyle,
    });

    if (isMountedRef.current) setLoading(true);
    try {
      if (localWorkoutId) {
        // Gallery selection uses custom_photo template for storage
        const storageTemplateId = selectedTemplate === 'gallery' ? 'custom_photo' : selectedTemplate;
        await LocalWorkoutStorageService.saveWorkoutCard(localWorkoutId, {
          templateId: storageTemplateId,
          customPhotoUri: selectedTemplate === 'custom_photo' ? customPhotoUri || undefined : undefined,
        });
      }
      console.log('🖼️ Setting showFullscreenPreview to true');
      setShowFullscreenPreview(true);
    } catch (error) {
      console.error('Failed to save card:', error);
      Alert.alert('Error', 'Failed to save card');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleFullscreenClose = () => {
    // Reset fullscreen state FIRST to prevent render-during-unmount crash
    setShowFullscreenPreview(false);
    onSuccess?.();
    onClose();
  };

  const formatDurationForDisplay = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!workout) return null;

  // Guard against zero-value workouts that can cause rendering issues
  if (workout.duration === 0 && (!workout.distance || workout.distance === 0)) {
    if (visible) {
      return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
          <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0) }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Share Workout</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 16, textAlign: 'center' }}>
                No workout data to share yet. Complete a workout first!
              </Text>
            </View>
          </View>
        </Modal>
      );
    }
    return null;
  }

  const MODAL_PADDING = 40;
  const MAX_PREVIEW_HEIGHT = 180; // Cap preview height to ensure Done button is visible
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = screenWidth - MODAL_PADDING;
  const widthScale = availableWidth / cardDimensions.width;
  const heightScale = MAX_PREVIEW_HEIGHT / cardDimensions.height;
  const dynamicScale = Math.min(widthScale, heightScale, 1);

  // Section Card component for consistent styling
  const SectionCard: React.FC<{ header: string; children: React.ReactNode }> = ({ header, children }) => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>{header}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  // List Row component for template/style selection
  const ListRow: React.FC<{
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    selected?: boolean;
    onPress: () => void;
    isLast?: boolean;
  }> = ({ icon, title, subtitle, selected, onPress, isLast }) => (
    <TouchableOpacity
      style={[styles.listRow, isLast && styles.listRowLast]}
      onPress={onPress}
      disabled={loading}
    >
      {icon && (
        <View style={styles.listRowIcon}>
          <Ionicons name={icon} size={20} color={selected ? theme.colors.accent : theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.listRowText}>
        <Text style={[styles.listRowTitle, selected && styles.listRowTitleSelected]}>{title}</Text>
        {subtitle && <Text style={styles.listRowSubtitle}>{subtitle}</Text>}
      </View>
      {selected && (
        <Ionicons name="checkmark" size={22} color={theme.colors.accent} />
      )}
    </TouchableOpacity>
  );

  // Helper to get workout stats for preview
  const getPreviewStats = () => {
    if (!workout) return { durationStr: '0:00', distanceKm: null, paceMinKm: null, activityType: 'Workout', activityUpper: 'WORKOUT' };
    const minutes = Math.floor(workout.duration / 60);
    const seconds = Math.floor(workout.duration % 60);
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const distanceKm = workout.distance ? (workout.distance / 1000).toFixed(2) : null;
    // Calculate pace in mm:ss format (e.g., "6:02" for 6 minutes 2 seconds per km)
    const paceMinKm = workout.distance && workout.distance > 0
      ? (() => {
          const totalMinutes = workout.duration / 60 / (workout.distance / 1000);
          const mins = Math.floor(totalMinutes);
          const secs = Math.round((totalMinutes - mins) * 60);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        })()
      : null;
    const activityType = workout.type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const activityUpper = workout.type.replace(/_/g, ' ').toUpperCase();
    const steps = workout.steps ?? (workout.metadata as any)?.steps ?? null;
    return { durationStr, distanceKm, paceMinKm, activityType, activityUpper, steps };
  };

  const renderPreview = () => {
    // Vertical full-screen preview
    if (selectedTemplate === 'vertical') {
      const { durationStr, distanceKm, activityType, steps } = getPreviewStats();
      const primaryValue = steps ? steps.toLocaleString() : (distanceKm ? distanceKm : durationStr);
      const primaryLabel = steps ? 'STEPS' : (distanceKm ? 'KM' : 'MIN');
      // Show estimated distance below steps when both are available
      const stepDistanceKm = steps && distanceKm ? distanceKm : null;
      return (
        <View style={styles.verticalPreview}>
          <Text style={styles.verticalPreviewBrand}>R U N S T R</Text>
          <Text style={styles.verticalPreviewActivity}>{activityType}</Text>
          <Text style={styles.verticalPreviewValue}>{primaryValue}</Text>
          <Text style={styles.verticalPreviewLabel}>{primaryLabel}</Text>
          {stepDistanceKm && (
            <Text style={styles.verticalPreviewEstDistance}>~{stepDistanceKm} km</Text>
          )}
          <View style={styles.verticalPreviewDivider} />
          <Text style={styles.verticalPreviewQuote}>"Progress, not perfection."</Text>
        </View>
      );
    }
    // Elegant native preview (no SVG, black/grey/white only)
    if (selectedTemplate === 'elegant') {
      const { durationStr, distanceKm, paceMinKm } = getPreviewStats();
      return (
        <View style={styles.elegantPreview}>
          <Text style={styles.elegantPreviewUsername}>{userName || t('anonymousAthlete')}</Text>
          <Text style={styles.elegantPreviewQuote}>"Consistency beats perfection."</Text>
          <View style={styles.elegantPreviewAvatarCircle}>
            <Text style={styles.elegantPreviewInitial}>
              {userName ? userName.charAt(0).toUpperCase() : 'A'}
            </Text>
          </View>
          <View style={styles.elegantPreviewStats}>
            {distanceKm && <Text style={styles.elegantPreviewStat}>{distanceKm} km</Text>}
            <Text style={styles.elegantPreviewStat}>{durationStr}</Text>
            {paceMinKm && <Text style={styles.elegantPreviewStatSecondary}>{paceMinKm} /km</Text>}
          </View>
          <View style={styles.elegantPreviewDivider} />
          <Text style={styles.elegantPreviewTeamLabel}>Supporting</Text>
          <Text style={styles.elegantPreviewTeamName}>ALS Network</Text>
        </View>
      );
    }
    if (selectedTemplate === 'custom_photo' && customPhotoUri) {
      const { durationStr, distanceKm, paceMinKm, activityType, activityUpper } = getPreviewStats();
      const gradientColors: [string, string] = photoStyle === 'tactical'
        ? ['transparent', 'rgba(26, 46, 26, 0.95)']
        : ['transparent', 'rgba(0, 0, 0, 0.85)'];

      return (
        <View style={styles.styledPhotoPreview}>
          <Image source={{ uri: customPhotoUri }} style={styles.previewImage} resizeMode="cover" />
          <LinearGradient colors={gradientColors} style={styles.previewGradient} />

          {/* Style overlay preview */}
          <View style={styles.previewOverlay}>
            {photoStyle === 'minimal' && (
              <>
                <Text style={styles.previewActivityType}>{activityType}</Text>
                <Text style={styles.previewStatValue}>{durationStr}</Text>
                {distanceKm && <Text style={styles.previewDistance}>{distanceKm} km</Text>}
                {paceMinKm && <Text style={styles.previewDistance}>{paceMinKm}/km</Text>}
                <Text style={styles.previewBrand}>RUNSTR</Text>
              </>
            )}
            {photoStyle === 'tactical' && (
              <>
                <Text style={styles.previewTactical}>MISSION: {activityUpper}</Text>
                {distanceKm && <Text style={styles.previewTacticalStat}>DIST: {distanceKm} km</Text>}
                <Text style={styles.previewTacticalStat}>TIME: {durationStr}</Text>
                {paceMinKm && <Text style={styles.previewTacticalStat}>PACE: {paceMinKm}/km</Text>}
              </>
            )}
            {photoStyle === 'tough' && (
              <>
                <View style={styles.previewToughBar} />
                <Text style={styles.previewActivityType}>{activityUpper}</Text>
                <Text style={styles.previewStatValue}>{durationStr}</Text>
                {distanceKm && <Text style={styles.previewDistance}>{distanceKm} KM</Text>}
                {paceMinKm && <Text style={styles.previewDistance}>{paceMinKm}/km</Text>}
              </>
            )}
          </View>
        </View>
      );
    }
    if (selectedTemplate === 'custom_photo') {
      return (
        <View style={styles.previewPlaceholder}>
          <Ionicons name="camera-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.previewPlaceholderText}>Select Camera to take a photo</Text>
        </View>
      );
    }
    if (selectedTemplate === 'achievement') {
      const type = workout.type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return (
        <View style={styles.textPreview}>
          <Text style={styles.textPreviewTitle}>{type} Complete</Text>
          <Text style={styles.textPreviewDuration}>{formatDurationForDisplay(workout.duration)}</Text>
          {workout.distance && (
            <Text style={styles.textPreviewDistance}>{(workout.distance / 1000).toFixed(2)} km</Text>
          )}
          <Text style={styles.textPreviewHashtag}>#RUNSTR</Text>
        </View>
      );
    }
    if (cardSvg && svgReady) {
      const scaledHeight = Math.min(cardDimensions.height * dynamicScale, MAX_PREVIEW_HEIGHT);
      return (
        <View style={[styles.cardWrapper, { width: cardDimensions.width * dynamicScale, height: scaledHeight }]}>
          <View style={{ transform: [{ scale: dynamicScale }], transformOrigin: 'top left' }}>
            <WorkoutCardRenderer ref={cardRef} svgContent={cardSvg} width={cardDimensions.width} height={cardDimensions.height} />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.previewLoading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.previewLoadingText}>Generating card...</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <PostingErrorBoundary onClose={onClose} fallbackTitle="Share Error" fallbackMessage="There was an error preparing your post. Please try again.">
        <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0) }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Share Workout</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.contentContainer}>
            {/* Card Style Picker */}
            <SectionCard header="CARD STYLE">
              {TEMPLATE_OPTIONS.map((template, index) => (
                <ListRow
                  key={template.id}
                  icon={template.icon}
                  title={template.name}
                  subtitle={template.description}
                  selected={selectedTemplate === template.id}
                  onPress={() => handleTemplateSelect(template.id)}
                  isLast={index === TEMPLATE_OPTIONS.length - 1}
                />
              ))}
            </SectionCard>

            {/* Photo Style Picker - only show when custom_photo selected */}
            {selectedTemplate === 'custom_photo' && customPhotoUri && (
              <SectionCard header="PHOTO STYLE">
                {PHOTO_STYLE_OPTIONS.map((style, index) => (
                  <ListRow
                    key={style.id}
                    title={style.name}
                    selected={photoStyle === style.id}
                    onPress={() => setPhotoStyle(style.id)}
                    isLast={index === PHOTO_STYLE_OPTIONS.length - 1}
                  />
                ))}
              </SectionCard>
            )}

            {/* Preview */}
            <SectionCard header="PREVIEW">
              <View style={styles.previewContainer}>{renderPreview()}</View>
            </SectionCard>

            {/* Action Button - Post to Nostr when callback provided, otherwise Full Screen for screenshot */}
            <TouchableOpacity
              style={[styles.doneButton, loading && styles.doneButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.accentText} />
              ) : (
                <Text style={styles.doneButtonText}>
                  {onPostToNostr ? 'Post to Nostr' : 'Full Screen'}
                </Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </PostingErrorBoundary>

      {/* Fullscreen Preview Modal */}
      <FullScreenCardModal
        visible={showFullscreenPreview}
        onClose={handleFullscreenClose}
        workout={workout as PublishableWorkout}
        templateId={selectedTemplate === 'gallery' ? 'custom_photo' : selectedTemplate}
        customPhotoUri={customPhotoUri}
        userAvatar={userAvatar}
        userName={userName}
        photoStyle={photoStyle}
        onPostToNostr={onPostToNostr}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  // Section Card styles
  sectionCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionContent: {},
  // List Row styles
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  listRowText: {
    flex: 1,
  },
  listRowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  listRowTitleSelected: {
    color: theme.colors.accent,
  },
  listRowSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  // Preview styles
  previewContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  styledPhotoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  previewActivityType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  previewStatValue: {
    fontSize: 18,
    fontWeight: '300',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  previewDistance: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 1,
  },
  previewBrand: {
    fontSize: 8,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 3,
    marginTop: 4,
  },
  previewTactical: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8b7355',
    letterSpacing: 1,
    marginBottom: 2,
  },
  previewTacticalStat: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginTop: 2,
  },
  previewToughBar: {
    height: 2,
    backgroundColor: '#FF3333',
    width: '100%',
    marginBottom: 4,
  },
  previewPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  textPreview: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  textPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  textPreviewDuration: {
    fontSize: 28,
    fontWeight: '300',
    color: theme.colors.text,
    marginBottom: 2,
  },
  textPreviewDistance: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  textPreviewHashtag: {
    fontSize: 12,
    color: theme.colors.accent,
  },
  cardWrapper: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  previewLoading: {
    width: '100%',
    height: 100,
    backgroundColor: '#111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  // Button styles
  doneButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    color: theme.colors.accentText,
    fontSize: 16,
    fontWeight: '600',
  },
  // Vertical preview styles
  verticalPreview: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    alignItems: 'center',
  },
  verticalPreviewBrand: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 4,
    marginBottom: 8,
  },
  verticalPreviewActivity: {
    fontSize: 14,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 4,
  },
  verticalPreviewValue: {
    fontSize: 48,
    fontWeight: '200',
    color: '#fff',
    lineHeight: 54,
  },
  verticalPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  verticalPreviewEstDistance: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  verticalPreviewDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: '60%',
    marginVertical: 12,
  },
  verticalPreviewQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  // Elegant preview styles (black/grey/white only)
  elegantPreview: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    alignItems: 'center',
  },
  elegantPreviewUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  elegantPreviewQuote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  elegantPreviewAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  elegantPreviewInitial: {
    fontSize: 20,
    fontWeight: '300',
    color: '#666',
  },
  elegantPreviewStats: {
    alignItems: 'center',
  },
  elegantPreviewStat: {
    fontSize: 14,
    fontWeight: '300',
    color: '#fff',
  },
  elegantPreviewStatSecondary: {
    fontSize: 10,
    color: '#888',
  },
  elegantPreviewDivider: {
    width: '50%',
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  elegantPreviewTeamLabel: {
    fontSize: 8,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  elegantPreviewTeamName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
