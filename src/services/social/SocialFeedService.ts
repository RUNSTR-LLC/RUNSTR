// src/services/social/SocialFeedService.ts

import { supabase, isSupabaseConfigured } from '../../utils/supabase';
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
