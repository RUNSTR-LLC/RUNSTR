// src/components/social/ClubsRow.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { SimpleTeamCreationModal } from '../creation/SimpleTeamCreationModal';
import type { Club } from '../../types/club';

interface ClubsRowProps {
  clubs: Club[];
  userClubId?: string | null;
  onClubCreated?: () => void;
}

export const ClubsRow: React.FC<ClubsRowProps> = ({ clubs, userClubId, onClubCreated }) => {
  const navigation = useNavigation<any>();
  const [showCreate, setShowCreate] = useState(false);

  const sorted = React.useMemo(() => {
    const byMembers = [...clubs].sort(
      (a, b) => (b.member_count ?? 0) - (a.member_count ?? 0)
    );
    if (!userClubId) return byMembers;
    return byMembers.sort((a, b) => {
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
        size={56}
        imageUrl={item.banner_url || undefined}
      />
      <Text style={styles.clubName}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const handleClubCreated = useCallback(() => {
    setShowCreate(false);
    onClubCreated?.();
  }, [onClubCreated]);

  const createButton = (
    <TouchableOpacity
      style={styles.createItem}
      onPress={() => setShowCreate(true)}
      activeOpacity={0.7}
    >
      <View style={styles.createCircle}>
        <Ionicons name="add" size={28} color={theme.colors.accent} />
      </View>
      <Text style={styles.clubName}>Create</Text>
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
        ListFooterComponent={createButton}
      />
      <SimpleTeamCreationModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onTeamCreated={handleClubCreated}
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
    maxWidth: 72,
  },
  clubName: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  createItem: {
    alignItems: 'center',
    maxWidth: 72,
  },
  createCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
  },
});
