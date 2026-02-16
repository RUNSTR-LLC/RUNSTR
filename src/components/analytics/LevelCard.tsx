/**
 * LevelCard - Displays RUNSTR Rank (Web of Trust score from Brainstorm)
 * Tapping the card opens a modal explaining how to improve rank
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nip19 } from 'nostr-tools';
import { theme } from '../../styles/theme';
import { WoTService } from '../../services/wot/WoTService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export const LevelCard: React.FC = () => {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // RUNSTR Rank (WoT) state
  const [wotScore, setWotScore] = useState<number | null>(null);
  const [wotLoading, setWotLoading] = useState(false);
  const [wotError, setWotError] = useState<string | null>(null);
  const [wotFetchedAt, setWotFetchedAt] = useState<number | null>(null);

  // Fetch RUNSTR Rank on mount (check cache first)
  useEffect(() => {
    const loadWoTScore = async () => {
      if (!currentUser?.npub) return;

      try {
        // Convert npub to hex
        const decoded = nip19.decode(currentUser.npub);
        if (decoded.type !== 'npub' || typeof decoded.data !== 'string') {
          console.log('[LevelCard] Invalid npub format');
          return;
        }
        const hexPubkey = decoded.data;

        const wotService = WoTService.getInstance();

        // Check if we have a cached score
        const cached = await wotService.getCachedScoreWithMeta(hexPubkey);
        if (cached) {
          setWotScore(cached.score);
          setWotFetchedAt(cached.fetchedAt);
          console.log('[LevelCard] Loaded cached RUNSTR Rank:', cached.score);
        } else {
          // No cache - fetch from network on first view
          console.log('[LevelCard] No cached score, fetching from network...');
          setWotLoading(true);
          const score = await wotService.fetchAndCacheScore(hexPubkey);
          setWotScore(score);
          setWotFetchedAt(Date.now());
          setWotLoading(false);
        }
      } catch (error) {
        console.error('[LevelCard] Error loading WoT score:', error);
        setWotError('Failed to load RUNSTR Rank');
        setWotLoading(false);
      }
    };

    loadWoTScore();
  }, [currentUser?.npub]);

  // Refresh RUNSTR Rank manually
  const handleRefreshWoT = useCallback(async () => {
    if (!currentUser?.npub) return;

    try {
      setWotLoading(true);
      setWotError(null);

      const decoded = nip19.decode(currentUser.npub);
      if (decoded.type !== 'npub' || typeof decoded.data !== 'string') {
        throw new Error('Invalid npub format');
      }
      const hexPubkey = decoded.data;

      const wotService = WoTService.getInstance();
      const score = await wotService.refreshScore(hexPubkey);
      setWotScore(score);
      setWotFetchedAt(Date.now());
    } catch (error) {
      console.error('[LevelCard] Error refreshing WoT score:', error);
      setWotError('Failed to refresh');
    } finally {
      setWotLoading(false);
    }
  }, [currentUser?.npub]);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        {/* Header with title, refresh, and chevron */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={16} color="#FF9D42" />
            <Text style={styles.title}>RUNSTR Rank</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleRefreshWoT();
              }}
              disabled={wotLoading}
              style={styles.refreshButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {wotLoading ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="refresh" size={16} color="#FF9D42" />
              )}
            </TouchableOpacity>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Rank Display */}
        <View style={styles.rankContent}>
          {wotLoading && wotScore === null ? (
            <Text style={styles.loadingText}>Calculating rank...</Text>
          ) : wotError ? (
            <Text style={styles.errorText}>{wotError}</Text>
          ) : (
            <>
              <Text style={styles.scoreValue}>
                {WoTService.getInstance().formatScore(wotScore)}
              </Text>
              <Text style={styles.tierLabel}>
                {WoTService.getInstance().getRankTier(wotScore)}
              </Text>
            </>
          )}
        </View>

        {wotFetchedAt && !wotLoading && (
          <Text style={styles.lastUpdated}>
            Updated {formatTimeAgo(wotFetchedAt)}
          </Text>
        )}
      </TouchableOpacity>

      {/* RUNSTR Rank Explanation Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About RUNSTR Rank</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* What is RUNSTR Rank */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What is RUNSTR Rank?</Text>
                <Text style={styles.sectionSubtitle}>
                  Your RUNSTR Rank reflects your reputation in the Nostr
                  network, calculated using Web of Trust principles.
                </Text>
              </View>

              {/* How to Improve */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How to Improve Your Rank</Text>
                <View style={styles.itemList}>
                  <View style={styles.itemRow}>
                    <Ionicons name="paper-plane" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Post workouts and engage with the community
                    </Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Ionicons name="flash" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Zap other athletes for great performances
                    </Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Ionicons name="people" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Follow and connect with other RUNSTR users
                    </Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Ionicons name="star" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Get followed by trusted community members
                    </Text>
                  </View>
                </View>
              </View>

              {/* Why It Matters */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why It Matters</Text>
                <View style={styles.itemList}>
                  <View style={styles.itemRow}>
                    <Ionicons name="gift" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Future reward distributions may require minimum rank
                    </Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Ionicons name="trophy" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Some competitions will have rank requirements
                    </Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Ionicons name="shield-checkmark" size={18} color="#FF9D42" />
                    <Text style={styles.itemText}>
                      Higher rank = more trust from the community
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 12,
    marginBottom: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  title: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  refreshButton: {
    padding: 4,
  },

  rankContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },

  scoreValue: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
  },

  tierLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: '#FFB366',
  },

  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  errorText: {
    fontSize: 14,
    color: '#FF6B00',
  },

  lastUpdated: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    maxHeight: '80%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  modalBody: {
    padding: 16,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
    marginBottom: 10,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },

  itemList: {
    gap: 10,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
  },

  itemText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 20,
  },
});
