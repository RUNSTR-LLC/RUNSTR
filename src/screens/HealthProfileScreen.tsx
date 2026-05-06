/**
 * HealthProfileScreen - Optional health data for improved analytics
 * All data stays on device (privacy-preserving)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const HEALTH_PROFILE_KEY = '@runstr:health_profile';

export interface HealthProfile {
  weight?: number; // kg
  height?: number; // cm
  age?: number; // years
  lastUpdated: string;
}

export const HealthProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');

  const handleWeightChange = (text: string) => {
    setWeight(text);
  };
  const handleHeightChange = (text: string) => {
    setHeight(text);
  };
  const handleAgeChange = (text: string) => {
    setAge(text);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem(HEALTH_PROFILE_KEY);
      if (profileData) {
        let profile: HealthProfile | null = null;
        try {
          profile = JSON.parse(profileData);
        } catch (e) {
          console.warn('[HealthProfile] Failed to parse stored profile:', e);
          profile = null;
        }
        if (profile) {
          if (profile.weight) setWeight(profile.weight.toString());
          if (profile.height) setHeight(profile.height.toString());
          if (profile.age) setAge(profile.age.toString());
        }
      }
    } catch (error) {
      console.error('Failed to load health profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const profile: HealthProfile = {
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        age: age ? parseInt(age, 10) : undefined,
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(profile));
      console.log('[HealthProfile] ✅ Profile saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Failed to save health profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      await AsyncStorage.removeItem(HEALTH_PROFILE_KEY);
      setWeight('');
      setHeight('');
      setAge('');
      console.log('✅ Health profile cleared');
    } catch (error) {
      console.error('❌ Failed to clear health profile:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orangeBright} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Privacy Notice */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Ionicons
              name="lock-closed"
              size={24}
              color={theme.colors.orangeBright}
            />
            <Text style={styles.privacyTitle}>Your Data Stays Private</Text>
          </View>
          <Text style={styles.privacyText}>
            This information never leaves your device. It's only used to provide
            more accurate calorie estimates and BMI calculations in your
            analytics.
          </Text>
          <Text style={styles.privacySubtext}>
            All fields are optional. The app works perfectly without this data.
          </Text>
        </View>

        {/* Weight Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Weight (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={handleWeightChange}
              placeholder="70"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>
          <Text style={styles.inputHint}>
            Used for more accurate calorie estimates
          </Text>
        </View>

        {/* Height Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Height (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={handleHeightChange}
              placeholder="170"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
          <Text style={styles.inputHint}>
            Required for BMI calculation in analytics
          </Text>
        </View>

        {/* Age Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Age (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={handleAgeChange}
              placeholder="30"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={styles.inputUnit}>years</Text>
          </View>
          <Text style={styles.inputHint}>
            Helps refine metabolic calculations
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  privacyCard: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 157, 66, 0.3)',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
  privacyText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  privacySubtext: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: theme.colors.text,
    paddingVertical: 12,
  },
  inputUnit: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  inputHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  clearButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
});
