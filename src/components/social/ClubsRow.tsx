// src/components/social/ClubsRow.tsx

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { Club } from '../../types/club';

interface ClubsRowProps {
  clubs: Club[];
  userClubId?: string | null;
}

export const ClubsRow: React.FC<ClubsRowProps> = ({ clubs, userClubId }) => {
  const navigation = useNavigation<any>();

  const sorted = React.useMemo(() => {
    if (!userClubId) return clubs;
    return [...clubs].sort((a, b) => {
      if (a.id === userClubId) return -1;
      if (b.id === userClubId) return 1;
      return 0;
    });
  }, [clubs, userClubId]);

  const renderClub = ({ item }: { item: Club }) => (
    <TouchableOpacity
      style={styles.clubItem}
      onPress={() => navigation.navigate('ClubPage', { clubId: item.id, clubName: item.name })}
      activeOpacity={0.7}
    >
      <Avatar
        name={item.name}
        size={40}
        imageUrl={item.banner_url || undefined}
      />
      <Text style={styles.clubName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (clubs.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted.slice(0, 20)}
        renderItem={renderClub}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  clubItem: {
    alignItems: 'center',
    width: 56,
  },
  clubName: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
    textAlign: 'center',
  },
});
