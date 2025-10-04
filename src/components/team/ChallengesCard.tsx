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
import { FormattedChallenge } from '../../types';
import { theme } from '../../styles/theme';

interface ChallengesCardProps {
  challenges: FormattedChallenge[];
  onAddChallenge?: () => void;
  onChallengePress?: (challengeId: string) => void;
}

export const ChallengesCard: React.FC<ChallengesCardProps> = ({
  challenges,
  onAddChallenge,
  onChallengePress,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
      </View>

      <ScrollView
        style={styles.scrollableList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="#FF9D42"
      >
        {challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeItem}
            onPress={() => onChallengePress?.(challenge.id)}
            activeOpacity={0.7}
          >
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeName}>
                {challenge.type === 'p2p' &&
                challenge.participant1 &&
                challenge.participant2
                  ? `${challenge.participant1} vs ${challenge.participant2}`
                  : challenge.name}
              </Text>
              <Text style={styles.challengeDate}>{challenge.date}</Text>
            </View>
            <Text style={styles.challengeDetails}>{challenge.details}</Text>
            {/* Removed prize display - no Bitcoin functionality in this phase */}
          </TouchableOpacity>
        ))}
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
  challengeItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  challengeName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 16,
    flex: 1,
    marginRight: 8,
  },
  challengeDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },
  challengeDetails: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 14,
    marginBottom: 3,
  },
  // Removed prize styles - no Bitcoin functionality in this phase
});
