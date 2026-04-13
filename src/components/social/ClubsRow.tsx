// src/components/social/ClubsRow.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredMatches = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return clubs
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [clubs, searchQuery]);

  const handleMatchPress = useCallback(
    (club: Club) => {
      setSearchQuery('');
      navigation.navigate('ClubPage', { clubId: club.id, clubName: club.name });
    },
    [navigation]
  );

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
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clubs..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {filteredMatches.length > 0 && (
          <View style={styles.dropdown}>
            {filteredMatches.map((club) => (
              <TouchableOpacity
                key={club.id}
                style={styles.dropdownRow}
                onPress={() => handleMatchPress(club)}
                activeOpacity={0.7}
              >
                <Avatar
                  name={club.name}
                  size={32}
                  imageUrl={club.banner_url || undefined}
                />
                <Text style={styles.dropdownName} numberOfLines={1}>
                  {club.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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
    zIndex: 10,
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
  searchWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    zIndex: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    height: 42,
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    maxHeight: 320,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
});
