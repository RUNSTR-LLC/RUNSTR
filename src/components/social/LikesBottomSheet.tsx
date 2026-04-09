// src/components/social/LikesBottomSheet.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';

interface LikesBottomSheetProps {
  visible: boolean;
  likedBy: string[];
  onClose: () => void;
}

export const LikesBottomSheet: React.FC<LikesBottomSheetProps> = ({
  visible,
  likedBy,
  onClose,
}) => {
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());

  useEffect(() => {
    if (!visible || likedBy.length === 0) return;
    let mounted = true;
    nostrProfileService.getProfiles(likedBy).then((fetched) => {
      if (mounted) setProfiles(fetched);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [visible, likedBy]);

  const renderItem = ({ item: npub }: { item: string }) => {
    const profile = profiles.get(npub);
    const name = profile?.display_name || profile?.name || npub.slice(0, 12) + '...';
    return (
      <View style={styles.row}>
        <Avatar name={name} size={36} imageUrl={profile?.picture || undefined} />
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Liked by</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={likedBy}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 17, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text },
  close: { fontSize: 15, color: theme.colors.accent, fontWeight: theme.typography.weights.medium },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  name: { fontSize: 15, color: theme.colors.text, flex: 1 },
});
