/**
 * SimpleTeamScreen - Lightweight team screen without heavy dependencies
 * Replaces EnhancedTeamScreen to fix navigation freeze issues
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import SimpleCompetitionService from '../services/competition/SimpleCompetitionService';

interface SimpleTeamScreenProps {
  data: {
    team: any;
    leaderboard?: any[];
    events?: any[];
    challenges?: any[];
  };
  onBack: () => void;
  onCaptainDashboard: () => void;
  onAddChallenge?: () => void;
  onAddEvent?: () => void;
  onEventPress?: (eventId: string, eventData?: any) => void;
  onLeaguePress?: (leagueId: string, leagueData?: any) => void;
  onChallengePress?: (challengeId: string) => void;
  showJoinButton?: boolean;
  userIsMemberProp?: boolean;
  currentUserNpub?: string;
  userIsCaptain?: boolean;
}

export const SimpleTeamScreen: React.FC<SimpleTeamScreenProps> = ({
  data,
  onBack,
  onCaptainDashboard,
  onEventPress,
  showJoinButton = false,
  userIsMemberProp = false,
  currentUserNpub,
  userIsCaptain = false,
}) => {
  console.log('[SimpleTeamScreen] 🚀 Rendering with minimal dependencies');

  const { team } = data || {};
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch team events when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchEvents = async () => {
        console.log('[SimpleTeamScreen] 🔍 useFocusEffect triggered - Team data check:', {
          hasData: !!data,
          hasTeam: !!team,
          teamId: team?.id,
          teamName: team?.name,
          teamKeys: team ? Object.keys(team) : [],
        });

        if (!team?.id) {
          console.warn('[SimpleTeamScreen] ⚠️ No team.id found, cannot fetch events');
          setLoadingEvents(false);
          return;
        }

        setLoadingEvents(true);
        try {
          console.log('[SimpleTeamScreen] 📅 Fetching events for team:', team.id);
          const teamEvents = await SimpleCompetitionService.getInstance().getTeamEvents(team.id);
          console.log('[SimpleTeamScreen] ✅ Found events:', teamEvents.length);
          setEvents(teamEvents);
        } catch (error) {
          console.error('[SimpleTeamScreen] ❌ Error fetching events:', error);
        } finally {
          setLoadingEvents(false);
        }
      };

      fetchEvents();
    }, [team?.id, data, team])
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (!team?.id) return;

    setRefreshing(true);
    try {
      console.log('[SimpleTeamScreen] 🔄 Pull-to-refresh: Fetching events for team:', team.id);
      const teamEvents = await SimpleCompetitionService.getInstance().getTeamEvents(team.id);
      console.log('[SimpleTeamScreen] ✅ Pull-to-refresh: Found events:', teamEvents.length);
      setEvents(teamEvents);
    } catch (error) {
      console.error('[SimpleTeamScreen] ❌ Pull-to-refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [team?.id]);

  // Safety check
  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Team data not available</Text>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Banner Image */}
      {team.bannerImage && (
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: team.bannerImage }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
          />
        }
      >
        {/* Team Info */}
        <View style={styles.teamInfoSection}>
          <Text style={styles.teamName}>{team.name || 'Unknown Team'}</Text>

          {team.description && (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.description}>{team.description}</Text>
            </View>
          )}

          {/* REMOVED: Team Stats - teams are bookmarks, no membership count or status needed */}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Captain Dashboard Button */}
            {userIsCaptain && (
              <TouchableOpacity
                style={styles.captainButton}
                onPress={onCaptainDashboard}
                activeOpacity={0.8}
              >
                <Ionicons name="shield" size={20} color={theme.colors.background} />
                <Text style={styles.captainButtonText}>Captain Dashboard</Text>
              </TouchableOpacity>
            )}

            {/* Join Team Button */}
            {showJoinButton && !userIsMemberProp && (
              <TouchableOpacity
                style={styles.joinButton}
                activeOpacity={0.8}
              >
                <Text style={styles.joinButtonText}>Join Team</Text>
              </TouchableOpacity>
            )}

            {/* Member Badge */}
            {userIsMemberProp && !userIsCaptain && (
              <View style={styles.memberBadge}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.memberBadgeText}>Team Member</Text>
              </View>
            )}
          </View>
        </View>

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Events</Text>

          {loadingEvents ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.text} />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No events scheduled</Text>
              {userIsCaptain && (
                <Text style={styles.emptySubtext}>
                  Create an event from the Captain Dashboard
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.contentList}>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => onEventPress && onEventPress(event.id, event)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="flag" size={20} color={theme.colors.accent} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{event.name}</Text>
                      <Text style={styles.cardDate}>
                        {new Date(event.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="footsteps" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.detailText}>{event.activityType}</Text>
                    </View>
                    {event.targetDistance && (
                      <View style={styles.detailItem}>
                        <Ionicons name="flag-outline" size={16} color={theme.colors.textMuted} />
                        <Text style={styles.detailText}>
                          {event.targetDistance} {event.targetUnit}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 14,
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

  // Banner
  bannerContainer: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  teamInfoSection: {
    padding: 16,
  },
  teamName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },

  // Description
  descriptionCard: {
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Action Buttons
  actionButtons: {
    gap: 12,
  },
  captainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  captainButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  memberBadgeText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '500',
  },

  // Events Section
  eventsSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  contentList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});

export default SimpleTeamScreen;