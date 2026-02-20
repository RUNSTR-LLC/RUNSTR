/**
 * HostEventModal - Information modal for hosting virtual events
 * Displays event types and contact information for hosting
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface HostEventModalProps {
  visible: boolean;
  onClose: () => void;
}

const EVENT_TYPES = [
  {
    icon: 'walk-outline' as const,
    title: 'Running Challenges',
    description: '5K, 10K, Half Marathon, Marathon, or custom distances',
  },
  {
    icon: 'people-outline' as const,
    title: 'Team Competitions',
    description: 'Compete against other teams with leaderboards and prizes',
  },
  {
    icon: 'trophy-outline' as const,
    title: 'Seasonal Leaderboards',
    description: 'Multi-week competitions with cumulative scoring',
  },
  {
    icon: 'heart-outline' as const,
    title: 'Charity Events',
    description: 'Run for a cause with donations to your chosen charity',
  },
  {
    icon: 'settings-outline' as const,
    title: 'Custom Events',
    description: 'Design your own format with custom rules and scoring',
  },
];

export const HostEventModal: React.FC<HostEventModalProps> = ({
  visible,
  onClose,
}) => {
  const handleEmailPress = () => {
    Linking.openURL('mailto:dakota.brown@runstr.club?subject=Host%20a%20Virtual%20Event');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Host a Virtual Event</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Introduction */}
              <Text style={styles.intro}>
                Want to host your own virtual fitness event on RUNSTR? We can help you
                create engaging competitions for your community, team, or organization.
              </Text>

              {/* Event Types */}
              <Text style={styles.sectionTitle}>Types of Events</Text>
              <View style={styles.eventTypesList}>
                {EVENT_TYPES.map((eventType, index) => (
                  <View key={index} style={styles.eventTypeItem}>
                    <View style={styles.eventTypeIcon}>
                      <Ionicons
                        name={eventType.icon}
                        size={24}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.eventTypeContent}>
                      <Text style={styles.eventTypeTitle}>{eventType.title}</Text>
                      <Text style={styles.eventTypeDescription}>
                        {eventType.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Contact Section */}
              <View style={styles.contactSection}>
                <Text style={styles.contactTitle}>Ready to Get Started?</Text>
                <Text style={styles.contactDescription}>
                  Email us with your event details and we'll help you set everything up.
                  Include information about your target audience, preferred dates, and
                  any special requirements.
                </Text>

                <TouchableOpacity
                  style={styles.emailButton}
                  onPress={handleEmailPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={20} color={theme.colors.background} />
                  <Text style={styles.emailButtonText}>dakota.brown@runstr.club</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
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
  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  intro: {
    fontSize: 15,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 16,
  },
  eventTypesList: {
    gap: 12,
    marginBottom: 32,
  },
  eventTypeItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  eventTypeContent: {
    flex: 1,
  },
  eventTypeTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  eventTypeDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  contactSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contactTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});

export default HostEventModal;
