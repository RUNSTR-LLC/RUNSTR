/**
 * EventCaptainDashboardScreen - Event-specific captain management
 * Shows QR code generation, participant management, and join requests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { QRDisplayModal } from '../components/qr/QRDisplayModal';
import QRCodeService from '../services/qr/QRCodeService';
import type { EventQRData } from '../services/qr/QRCodeService';
import type { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type EventCaptainDashboardRouteProp = RouteProp<RootStackParamList, 'EventCaptainDashboard'>;
type EventCaptainDashboardNavigationProp = StackNavigationProp<RootStackParamList, 'EventCaptainDashboard'>;

interface EventCaptainDashboardScreenProps {
  route: EventCaptainDashboardRouteProp;
  navigation: EventCaptainDashboardNavigationProp;
}

export const EventCaptainDashboardScreen: React.FC<EventCaptainDashboardScreenProps> = ({
  route,
  navigation,
}) => {
  const { eventId, eventData } = route.params;

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [eventQRData, setEventQRData] = useState<EventQRData | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);

  useEffect(() => {
    loadParticipants();
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      setIsLoadingParticipants(true);

      // Get team members who are participating in this event
      const TeamMemberCache = (await import('../services/team/TeamMemberCache')).TeamMemberCache.getInstance();
      const members = await TeamMemberCache.getTeamMembers(
        eventData.teamId,
        eventData.captainPubkey
      );

      setParticipants(members);
      console.log(`📊 Loaded ${members.length} participants for event ${eventId}`);
    } catch (error) {
      console.error('❌ Failed to load participants:', error);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      // Get captain's npub for QR data
      const captainNpub = await AsyncStorage.getItem('@runstr:npub');
      if (!captainNpub) {
        Alert.alert('Error', 'Captain authentication not found');
        return;
      }

      // Parse event date to timestamp
      const eventDate = new Date(eventData.eventDate);
      const startTimestamp = Math.floor(eventDate.getTime() / 1000);
      const endTimestamp = startTimestamp + 86400; // Add 1 day

      // Generate QR data
      const qrString = QRCodeService.getInstance().generateEventQR(
        eventId,
        eventData.teamId,
        captainNpub,
        eventData.name,
        startTimestamp,
        endTimestamp,
        eventData.description
      );

      // Parse QR string to EventQRData object
      const parsedQR = JSON.parse(qrString) as EventQRData;
      setEventQRData(parsedQR);
      setQrModalVisible(true);

      console.log('✅ QR code generated for event:', eventId);
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatEventDate = () => {
    if (!eventData?.eventDate) return 'Unknown date';
    const eventDate = new Date(eventData.eventDate);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Captain Dashboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.captainBadge}>
            <Ionicons name="shield" size={16} color={theme.colors.background} />
            <Text style={styles.captainBadgeText}>CAPTAIN</Text>
          </View>

          <Text style={styles.eventName}>{eventData.name}</Text>
          <Text style={styles.eventDate}>{formatEventDate()}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{participants.length}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{eventData.activityType || 'Any'}</Text>
              <Text style={styles.statLabel}>Activity</Text>
            </View>
          </View>
        </View>

        {/* QR Code Generation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event QR Code</Text>
          <Text style={styles.sectionDescription}>
            Generate a QR code for participants to scan and join this event
          </Text>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={handleGenerateQR}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={20} color={theme.colors.background} />
            <Text style={styles.qrButtonText}>Generate QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Participants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants</Text>

          {isLoadingParticipants ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading participants...</Text>
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyStateText}>No participants yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Share the QR code to invite people to join
              </Text>
            </View>
          ) : (
            <View style={styles.participantsList}>
              {participants.map((participantPubkey, index) => (
                <View key={participantPubkey} style={styles.participantItem}>
                  <View style={styles.participantInfo}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantAvatarText}>
                        {index === 0 ? 'C' : (index + 1).toString()}
                      </Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantPubkey}>
                        {participantPubkey.slice(0, 16)}...
                      </Text>
                      <Text style={styles.participantRole}>
                        {index === 0 ? 'Captain' : 'Participant'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Event Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Controls</Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => Alert.alert('Coming Soon', 'Event editing will be available soon')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.text} />
            <Text style={styles.controlButtonText}>Edit Event Details</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Code Modal */}
      {eventQRData && (
        <QRDisplayModal
          visible={qrModalVisible}
          onClose={() => {
            setQrModalVisible(false);
            setEventQRData(null);
          }}
          data={eventQRData}
        />
      )}
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    marginBottom: 12,
  },
  captainBadgeText: {
    color: theme.colors.background,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  section: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  qrButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  participantsList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  participantDetails: {
    flex: 1,
  },
  participantPubkey: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    gap: 12,
  },
  controlButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
});

export default EventCaptainDashboardScreen;
