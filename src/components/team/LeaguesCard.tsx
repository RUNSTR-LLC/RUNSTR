import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { theme } from '../../styles/theme';

interface League {
  id: string;
  teamId: string;
  captainPubkey: string;
  name: string;
  description?: string;
  activityType: string;
  metric: string;
  startDate: string;
  endDate: string;
}

interface LeaguesCardProps {
  leagues: League[];
  onLeaguePress?: (leagueId: string, league: League) => void;
  onAddLeague?: () => void;
  isCaptain?: boolean;
}

export const LeaguesCard: React.FC<LeaguesCardProps> = ({
  leagues,
  onLeaguePress,
  onAddLeague,
  isCaptain = false,
}) => {
  const getLeagueStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (now < start) return 'upcoming';
    if (now > end) return 'past';
    return 'active';
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${start} - ${end}`;
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Leagues</Text>
        {isCaptain && onAddLeague && (
          <TouchableOpacity onPress={onAddLeague} style={styles.addButton}>
            <Ionicons name="add" size={16} color={theme.colors.background} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollableList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="#FF9D42"
      >
        {leagues.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No leagues yet</Text>
            {isCaptain && (
              <Text style={styles.emptyStateHint}>
                Tap + to create your first league
              </Text>
            )}
          </View>
        ) : (
          leagues.map((league) => {
            const status = getLeagueStatus(league.startDate, league.endDate);

            return (
              <TouchableOpacity
                key={league.id}
                style={styles.leagueItem}
                onPress={() => onLeaguePress?.(league.id, league)}
                activeOpacity={0.7}
              >
                <View style={styles.leagueHeader}>
                  <View style={styles.leagueTitleRow}>
                    <Text style={styles.leagueName}>{league.name}</Text>
                    <View style={styles.statusBadges}>
                      <View
                        style={[
                          styles.statusBadge,
                          status === 'active' && styles.activeBadge,
                          status === 'past' && styles.pastBadge,
                          status === 'upcoming' && styles.upcomingBadge,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {status === 'active'
                            ? 'Active'
                            : status === 'past'
                            ? 'Past'
                            : 'Upcoming'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.leagueDate}>
                    {formatDateRange(league.startDate, league.endDate)}
                  </Text>
                </View>
                <Text style={styles.leagueDetails}>
                  {league.activityType} • {league.metric.replace('_', ' ')}
                  {league.description ? ` • ${league.description}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollableList: {
    flex: 1,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  leagueItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leagueHeader: {
    flexDirection: 'column',
    marginBottom: 3,
  },
  leagueTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pastBadge: {
    borderWidth: 1,
    borderColor: theme.colors.textMuted + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  upcomingBadge: {
    borderWidth: 1,
    borderColor: theme.colors.accent + '80',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  leagueName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 16,
    flex: 1,
    marginRight: 8,
  },
  leagueDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },
  leagueDetails: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
});
