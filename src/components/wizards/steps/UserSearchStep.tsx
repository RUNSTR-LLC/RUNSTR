/**
 * UserSearchStep - Global Nostr user search for challenge creation
 * Allows searching any Nostr user by name, npub, or NIP-05 identifier
 * Displays recent challengers and real-time search results
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme } from '../../../styles/theme';
import {
  userDiscoveryService,
  type DiscoveredNostrUser,
} from '../../../services/user/UserDiscoveryService';

interface UserSearchStepProps {
  selectedUser?: DiscoveredNostrUser;
  onSelectUser: (user: DiscoveredNostrUser) => void;
}

interface UserCardProps {
  user: DiscoveredNostrUser;
  isSelected: boolean;
  onSelect: () => void;
}

const ActivityIndicatorBadge: React.FC<{ status: 'active' | 'inactive' | 'new' }> = ({
  status,
}) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'inactive':
        return styles.statusInactive;
      default:
        return styles.statusNew;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      default:
        return 'New';
    }
  };

  return (
    <View style={[styles.statusBadge, getStatusStyle()]}>
      <Text style={styles.statusText}>{getStatusText()}</Text>
    </View>
  );
};

const UserCard: React.FC<UserCardProps> = ({ user, isSelected, onSelect }) => {
  const displayName = user.displayName || user.name || user.npub.slice(0, 16);
  const avatarText = displayName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.userCard, isSelected && styles.userCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{avatarText}</Text>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{displayName}</Text>
        {user.nip05 && <Text style={styles.userNip05}>{user.nip05}</Text>}
        {user.about && (
          <Text style={styles.userAbout} numberOfLines={1}>
            {user.about}
          </Text>
        )}
      </View>

      <View style={styles.userMeta}>
        <ActivityIndicatorBadge status={user.activityStatus} />
        <View
          style={[
            styles.selectionIndicator,
            isSelected && styles.selectionIndicatorSelected,
          ]}
        >
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const UserSearchStep: React.FC<UserSearchStepProps> = ({
  selectedUser,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoveredNostrUser[]>([]);
  const [recentChallengers, setRecentChallengers] = useState<DiscoveredNostrUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadRecentChallengers();
  }, []);

  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    setSearchDebounceTimer(timer);

    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchQuery]);

  const loadRecentChallengers = async () => {
    try {
      setIsLoadingRecent(true);
      const recent = await userDiscoveryService.getRecentChallengers();
      setRecentChallengers(recent);
    } catch (error) {
      console.error('Failed to load recent challengers:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const result = await userDiscoveryService.searchUsers(query);
      setSearchResults(result.users);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = useCallback(
    (user: DiscoveredNostrUser) => {
      onSelectUser(user);
      userDiscoveryService.addRecentChallenger(user.pubkey);
    },
    [onSelectUser]
  );

  const displayUsers = searchQuery.trim().length >= 2 ? searchResults : recentChallengers;
  const showEmptyState = !isSearching && !isLoadingRecent && displayUsers.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, npub, or NIP-05..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={false}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color={theme.colors.text}
            style={styles.searchSpinner}
          />
        )}
      </View>

      {searchQuery.trim().length < 2 && !isLoadingRecent && recentChallengers.length > 0 && (
        <Text style={styles.sectionTitle}>Recent Challengers</Text>
      )}

      {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
        <Text style={styles.sectionTitle}>
          Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
        </Text>
      )}

      <ScrollView
        style={styles.usersList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoadingRecent && searchQuery.trim().length < 2 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.text} />
            <Text style={styles.loadingText}>Loading recent challengers...</Text>
          </View>
        ) : showEmptyState ? (
          <View style={styles.emptyState}>
            {searchQuery.trim().length >= 2 ? (
              <>
                <Text style={styles.emptyStateText}>No users found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try searching by name, npub, or NIP-05 identifier
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyStateText}>Start typing to search</Text>
                <Text style={styles.emptyStateSubtext}>
                  Search any Nostr user globally
                </Text>
              </>
            )}
          </View>
        ) : (
          displayUsers.map((user) => (
            <UserCard
              key={user.pubkey}
              user={user}
              isSelected={selectedUser?.pubkey === user.pubkey}
              onSelect={() => handleSelectUser(user)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  searchSpinner: {
    position: 'absolute',
    right: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userCardSelected: {
    backgroundColor: theme.colors.border,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  userNip05: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  userAbout: {
    fontSize: 12,
    color: theme.colors.textDark,
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusActive: {
    backgroundColor: theme.colors.border,
  },
  statusInactive: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusNew: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
