// src/components/social/ZapsBottomSheet.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import feedService from '../../services/social/SocialFeedService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import type { SocialFeedZap } from '../../types/social';

interface ZapsBottomSheetProps {
  visible: boolean;
  postId: string;
  zapTotal: number;
  onClose: () => void;
}

export const ZapsBottomSheet: React.FC<ZapsBottomSheetProps> = ({
  visible,
  postId,
  zapTotal,
  onClose,
}) => {
  const [zaps, setZaps] = useState<SocialFeedZap[]>([]);
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setIsLoading(true);

    feedService.getZapsForPost(postId).then(async (fetched) => {
      if (!mounted) return;
      setZaps(fetched);

      const npubs = [...new Set(fetched.map((z) => z.sender_npub))];
      if (npubs.length > 0) {
        const p = await nostrProfileService.getProfiles(npubs).catch(() => new Map() as Map<string, NostrProfile>);
        if (mounted) setProfiles(p);
      }
      setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [visible, postId]);

  const renderItem = ({ item }: { item: SocialFeedZap }) => {
    const profile = profiles.get(item.sender_npub);
    const name = profile?.display_name || profile?.name || item.sender_npub.slice(0, 12) + '...';
    return (
      <View style={styles.row}>
        <Avatar name={name} size={36} imageUrl={profile?.picture || undefined} />
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.amountContainer}>
          <Ionicons name="flash" size={14} color={theme.colors.orangeDeep} />
          <Text style={styles.amount}>{item.amount.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Zaps</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>Done</Text>
          </TouchableOpacity>
        </View>
        {zapTotal > 0 && (
          <View style={styles.totalRow}>
            <Ionicons name="flash" size={18} color={theme.colors.orangeDeep} />
            <Text style={styles.totalText}>{zapTotal.toLocaleString()} total</Text>
          </View>
        )}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : zaps.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>No zaps yet</Text>
          </View>
        ) : (
          <FlatList
            data={zaps}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}
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
  totalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  totalText: { fontSize: 16, fontWeight: theme.typography.weights.semiBold, color: theme.colors.orangeDeep },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  name: { fontSize: 15, color: theme.colors.text, flex: 1 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  amount: { fontSize: 14, fontWeight: theme.typography.weights.semiBold, color: theme.colors.orangeDeep },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
});
