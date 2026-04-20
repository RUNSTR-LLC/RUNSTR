// src/services/social/SocialFeedService.ts

import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import type { SocialFeedPost, SocialFeedZap, SocialFeedComment } from '../../types/social';

export class SocialFeedService {
  private static instance: SocialFeedService;
  private cachedPosts: SocialFeedPost[] | null = null;

  static getInstance(): SocialFeedService {
    if (!SocialFeedService.instance) {
      SocialFeedService.instance = new SocialFeedService();
    }
    return SocialFeedService.instance;
  }

  async fetchFeed(cursor?: string, limit: number = 20): Promise<SocialFeedPost[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase!
        .from('social_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SocialFeedService] Failed to fetch feed:', error);
        return [];
      }

      const posts = (data || []) as SocialFeedPost[];

      if (!cursor) {
        this.cachedPosts = posts;
      }

      return posts;
    } catch (error) {
      console.error('[SocialFeedService] fetchFeed error:', error);
      return [];
    }
  }

  getCachedFeed(): SocialFeedPost[] | null {
    return this.cachedPosts;
  }

  clearCache(): void {
    this.cachedPosts = null;
  }

  async insertPost(post: {
    event_id: string;
    npub: string;
    content: string;
    images: string[];
    hashtags: string[];
    author_name: string;
    author_avatar: string;
    created_at: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase!
        .from('social_feed')
        .insert(post);

      if (error) {
        if (error.code === '23505') return true;
        console.error('[SocialFeedService] Failed to insert post:', error);
        return false;
      }

      if (this.cachedPosts) {
        this.cachedPosts = [post as SocialFeedPost, ...this.cachedPosts];
      }

      return true;
    } catch (error) {
      console.error('[SocialFeedService] insertPost error:', error);
      return false;
    }
  }

  /**
   * Create a post locally first, then publish to Nostr in the background.
   * Returns the local post immediately so the UI can render it.
   */
  async createLocalPost(content: string): Promise<SocialFeedPost | null> {
    const npub = await AsyncStorage.getItem('@runstr:npub');
    if (!npub) return null;

    const displayName = await AsyncStorage.getItem('@runstr:display_name');
    const now = new Date().toISOString();
    const localId = `local_${Date.now()}`;

    // Extract hashtags from content
    const hashtags = content.match(/#\w+/g)?.map((t) => t.slice(1)) || [];

    const localPost: SocialFeedPost = {
      id: localId,
      event_id: localId,
      npub,
      content,
      images: null,
      hashtags: hashtags.length > 0 ? hashtags : null,
      author_name: displayName || null,
      author_avatar: null,
      created_at: now,
      indexed_at: now,
      like_count: 0,
      repost_count: 0,
      zap_total: 0,
      liked_by: null,
      reposted_by: null,
      comment_count: 0,
      localOnly: true,
    };

    // Prepend to cache immediately
    if (this.cachedPosts) {
      this.cachedPosts = [localPost, ...this.cachedPosts];
    } else {
      this.cachedPosts = [localPost];
    }

    // Publish to Nostr in background
    this.publishToNostr(localPost, content, hashtags).catch((err) => {
      console.warn('[SocialFeedService] Background publish failed:', err);
    });

    return localPost;
  }

  private async publishToNostr(
    localPost: SocialFeedPost,
    content: string,
    hashtags: string[],
  ): Promise<void> {
    const PUBLISH_TIMEOUT_MS = 10000;

    const ndk = await GlobalNDKService.getInstance();
    const signer = await UnifiedSigningService.getInstance().getSigner();
    if (!signer) throw new Error('No signer available');

    const event = new NDKEvent(ndk);
    event.kind = 1 as NDKKind;
    event.content = content;
    event.tags = hashtags.map((t) => ['t', t]);

    await event.sign(signer);
    await Promise.race([
      event.publish(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS),
      ),
    ]);

    // Update the local post with the real event ID
    const realEventId = event.id;
    if (this.cachedPosts) {
      const idx = this.cachedPosts.findIndex((p) => p.id === localPost.id);
      if (idx !== -1) {
        this.cachedPosts[idx] = {
          ...this.cachedPosts[idx],
          id: realEventId,
          event_id: realEventId,
          localOnly: undefined,
        };
      }
    }

    // Also insert into Supabase so it appears for others.
    // Insert directly (not via insertPost) to avoid double-prepending to the cache,
    // since the cached post was already updated in place with the real event ID above.
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase!
          .from('social_feed')
          .insert({
            event_id: realEventId,
            npub: localPost.npub,
            content,
            images: [],
            hashtags,
            author_name: localPost.author_name || '',
            author_avatar: localPost.author_avatar || '',
            created_at: localPost.created_at,
          });
        // Ignore unique-violation (23505) — the post may already exist via indexer
        if (error && error.code !== '23505') {
          console.error('[SocialFeedService] Failed to insert post to Supabase:', error);
        }
      } catch (err) {
        console.error('[SocialFeedService] Supabase insert exception:', err);
      }
    }
  }

  async getZapsForPost(postId: string): Promise<SocialFeedZap[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase!
        .from('social_feed_zaps')
        .select('*')
        .eq('post_id', postId)
        .order('amount', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SocialFeedService] getZapsForPost error:', error);
        return [];
      }

      return (data || []) as SocialFeedZap[];
    } catch (error) {
      console.error('[SocialFeedService] getZapsForPost exception:', error);
      return [];
    }
  }

  async getCommentsForPost(
    postId: string,
    limit: number = 5,
    cursor?: string,
  ): Promise<SocialFeedComment[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase!
        .from('social_feed_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SocialFeedService] getCommentsForPost error:', error);
        return [];
      }

      return (data || []) as SocialFeedComment[];
    } catch (error) {
      console.error('[SocialFeedService] getCommentsForPost exception:', error);
      return [];
    }
  }
}

export default SocialFeedService.getInstance();
