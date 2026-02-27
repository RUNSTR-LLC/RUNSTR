/**
 * ProfileEditScreen - Edit Nostr profile metadata (kind 0 event)
 * Allows users to update their display name, bio, profile picture, Lightning address, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../styles/theme';
import { CustomAlert } from '../components/ui/CustomAlert';
import {
  nostrProfilePublisher,
  type EditableProfile,
} from '../services/nostr/NostrProfilePublisher';
import { useAuth } from '../contexts/AuthContext';
import { validateProfile } from '../utils/profileValidation';

export const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser } = useAuth();

  // Form state
  const [profile, setProfile] = useState<EditableProfile>({
    name: '',
    about: '',
    picture: '',
    banner: '',
    lud16: '',
    website: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<EditableProfile>({});
  const [alertConfig, setAlertConfig] = useState<{visible: boolean; title: string; message: string; buttons: any[]}>({
    visible: false, title: '', message: '', buttons: []
  });

  // Load current profile data on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCurrentProfile();
    }, [])
  );

  // Auto-save draft to AsyncStorage
  useEffect(() => {
    if (hasChanges) {
      saveDraft();
    }
  }, [profile]);

  const loadCurrentProfile = async () => {
    setIsLoading(true);
    try {
      // Try to load from Nostr first
      const currentProfile = await nostrProfilePublisher.getCurrentProfile();

      if (currentProfile) {
        setProfile(currentProfile);
        setOriginalProfile(currentProfile);
      } else if (currentUser) {
        // Fallback to current user data
        setProfile({
          name: currentUser.displayName || currentUser.name || '',
          about: currentUser.bio || '',
          picture: currentUser.picture || '',
          banner: currentUser.banner || '',
          lud16: currentUser.lud16 || '',
          website: currentUser.website || '',
        });
        setOriginalProfile({
          name: currentUser.displayName || currentUser.name || '',
          about: currentUser.bio || '',
          picture: currentUser.picture || '',
          banner: currentUser.banner || '',
          lud16: currentUser.lud16 || '',
          website: currentUser.website || '',
        });
      }

      // Check for draft
      const draft = await loadDraft();
      if (draft) {
        setProfile(draft);
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(
        '@runstr:profile_draft',
        JSON.stringify(profile)
      );
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadDraft = async (): Promise<EditableProfile | null> => {
    try {
      const draft = await AsyncStorage.getItem('@runstr:profile_draft');
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem('@runstr:profile_draft');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const updateField = (field: keyof EditableProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors = validateProfile(profile);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please fix the errors before saving',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) }]
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await nostrProfilePublisher.publishProfileUpdate(profile);

      if (result.success) {
        await clearDraft();

        setAlertConfig({
          visible: true,
          title: 'Success',
          message: `Profile updated successfully! Published to ${result.publishedToRelays} relays.`,
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setAlertConfig(prev => ({...prev, visible: false}));
                // Wait for alert dismiss animation before navigating
                setTimeout(() => {
                  navigation.goBack();
                }, 100);
              },
            },
          ]
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to update profile',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) }]
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'An unexpected error occurred while saving',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) }]
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setAlertConfig({
        visible: true,
        title: 'Discard Changes?',
        message: 'You have unsaved changes. Do you want to discard them?',
        buttons: [
          { text: 'Keep Editing', style: 'cancel', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setAlertConfig(prev => ({...prev, visible: false}));
              clearDraft();
              navigation.goBack();
            },
          },
        ]
      });
    } else {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            style={[
              styles.headerButton,
              !hasChanges && styles.headerButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text style={[styles.headerButtonText, styles.saveButtonText]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture Preview */}
          {profile.picture && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: profile.picture }}
                style={styles.profileImage}
              />
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Display Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(text) => updateField('name', text)}
                placeholder="Your display name"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={50}
              />
              {errors.name && <Text style={styles.error}>{errors.name}</Text>}
              <Text style={styles.charCount}>
                {profile.name?.length || 0}/50
              </Text>
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profile.about}
                onChangeText={(text) => updateField('about', text)}
                placeholder="Tell us about yourself"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              {errors.about && <Text style={styles.error}>{errors.about}</Text>}
              <Text style={styles.charCount}>
                {profile.about?.length || 0}/500
              </Text>
            </View>

            {/* Profile Picture URL */}
            <View style={styles.field}>
              <Text style={styles.label}>Profile Picture URL</Text>
              <TextInput
                style={styles.input}
                value={profile.picture}
                onChangeText={(text) => updateField('picture', text)}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.picture && (
                <Text style={styles.error}>{errors.picture}</Text>
              )}
            </View>

            {/* Banner URL */}
            <View style={styles.field}>
              <Text style={styles.label}>Banner Image URL</Text>
              <TextInput
                style={styles.input}
                value={profile.banner}
                onChangeText={(text) => updateField('banner', text)}
                placeholder="https://example.com/banner.jpg"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.banner && (
                <Text style={styles.error}>{errors.banner}</Text>
              )}
            </View>

            {/* Lightning Address */}
            <View style={styles.field}>
              <Text style={styles.label}>Lightning Address</Text>
              <TextInput
                style={styles.input}
                value={profile.lud16}
                onChangeText={(text) => updateField('lud16', text)}
                placeholder="username@getalby.com"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {errors.lud16 && <Text style={styles.error}>{errors.lud16}</Text>}
              <View style={styles.helperTextContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.helperText}>
                  Your Lightning address allows others to send you Bitcoin tips
                  (zaps). This is where you'll receive rewards, challenge
                  winnings, and donations.
                </Text>
              </View>
            </View>

            {/* Website */}
            <View style={styles.field}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={profile.website}
                onChangeText={(text) => updateField('website', text)}
                placeholder="https://yourwebsite.com"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {errors.website && (
                <Text style={styles.error}>{errors.website}</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({...prev, visible: false}))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.text,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  saveButtonText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSpacer: {
    flex: 1,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  imagePreview: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  // Form
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    color: theme.colors.error || '#FF6B00',
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  helperText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});
