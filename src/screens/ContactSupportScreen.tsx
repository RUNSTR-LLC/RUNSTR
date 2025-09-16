/**
 * ContactSupportScreen - In-app support contact form
 * Allows users to submit support requests with categorization
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useUserStore } from '../store/userStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

interface IssueCategory {
  id: string;
  label: string;
  icon: string;
}

export const ContactSupportScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useUserStore((state) => state.user);

  const categories: IssueCategory[] = [
    { id: 'account', label: 'Account & Login', icon: 'person-outline' },
    { id: 'teams', label: 'Teams & Membership', icon: 'people-outline' },
    { id: 'workouts', label: 'Workouts & Sync', icon: 'fitness-outline' },
    { id: 'bitcoin', label: 'Bitcoin & Payments', icon: 'logo-bitcoin' },
    { id: 'captain', label: 'Captain Features', icon: 'star-outline' },
    { id: 'technical', label: 'Technical Issues', icon: 'build-outline' },
    { id: 'other', label: 'Other', icon: 'help-outline' },
  ];

  useEffect(() => {
    // Gather debug information
    const gatherDebugInfo = async () => {
      const appVersion = '1.0.0'; // You might want to get this from app.json
      const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS} ${Platform.Version})`;
      const userNpub = user?.npub ? user.npub.slice(0, 8) + '...' : 'Not logged in';
      const teamInfo = 'N/A'; // Could fetch from store if needed

      const info = `App Version: ${appVersion}
Device: ${deviceInfo}
User: ${userNpub}
Platform: ${Platform.OS}
Team: ${teamInfo}`;

      setDebugInfo(info);
    };

    gatherDebugInfo();
  }, [user]);

  const handleSubmit = async () => {
    // Validate form
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select an issue category');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please describe your issue');
      return;
    }
    if (!userEmail.trim() || !userEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address for responses');
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      // Store support request locally (in production, this would send to backend)
      const supportRequest = {
        id: `support_${Date.now()}`,
        category: selectedCategory,
        subject,
        message,
        email: userEmail,
        debugInfo,
        timestamp: new Date().toISOString(),
        status: 'pending',
        userNpub: user?.npub || 'anonymous',
      };

      // Save to local storage for now
      const existingRequests = await AsyncStorage.getItem('supportRequests');
      const requests = existingRequests ? JSON.parse(existingRequests) : [];
      requests.push(supportRequest);
      await AsyncStorage.setItem('supportRequests', JSON.stringify(requests));

      // Show success message
      Alert.alert(
        'Request Submitted',
        'Your support request has been received. We\'ll respond within 24-48 hours to the email provided.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Reset form
      setSelectedCategory('');
      setSubject('');
      setMessage('');
      setUserEmail('');
    } catch (error) {
      console.error('Error submitting support request:', error);
      Alert.alert(
        'Submission Failed',
        'Unable to submit your request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'help-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Issue Category Selection */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Issue Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={
                      selectedCategory === category.id
                        ? theme.colors.background
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Contact Form */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.textMuted}
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief description of your issue"
                placeholderTextColor={theme.colors.textMuted}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="Please describe your issue in detail..."
                placeholderTextColor={theme.colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{message.length}/1000</Text>
            </View>
          </Card>

          {/* Debug Information */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Information</Text>
            <Text style={styles.debugText}>
              The following information will be included to help resolve your issue:
            </Text>
            <View style={styles.debugBox}>
              <Text style={styles.debugInfo}>{debugInfo}</Text>
            </View>
          </Card>

          {/* Alternative Contact Methods */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Other Ways to Get Help</Text>
            <TouchableOpacity style={styles.alternativeMethod}>
              <Ionicons name="logo-twitter" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.alternativeText}>Follow @runstrapp for updates</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.alternativeMethod}>
              <Ionicons name="people" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.alternativeText}>Join our Nostr community</Text>
            </TouchableOpacity>
          </Card>

          {/* Submit Button */}
          <Button
            title={isSubmitting ? 'Submitting...' : 'Submit Request'}
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          />

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryButton: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: theme.colors.background,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  messageInput: {
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  debugBox: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
  },
  debugInfo: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  alternativeMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alternativeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 12,
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  bottomPadding: {
    height: 40,
  },
});