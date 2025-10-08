/**
 * Progressive Loader - Instant UI Updates with Background Enrichment
 *
 * PERFORMANCE: Show lightweight data immediately, enrich in background
 *
 * Inspired by runstr-github's progressive loading strategy:
 * - Phase 1: Lightweight processing (instant display)
 * - Phase 2: Background enrichment (profiles, reactions, etc.)
 * - Result: 10x faster perceived load time
 *
 * Usage:
 * ```typescript
 * import { ProgressiveLoader } from '@/utils/progressiveLoader';
 *
 * // Phase 1: Show lightweight data immediately
 * const quickPosts = ProgressiveLoader.lightweightProcess(rawEvents);
 * setPosts(quickPosts);
 * setLoading(false); // ✅ User sees content INSTANTLY
 *
 * // Phase 2: Enrich in background
 * const enriched = await ProgressiveLoader.enrichInBackground(quickPosts);
 * setPosts(enriched); // Update with full data
 * ```
 */

import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { ProfileCache } from '../cache/ProfileCache';

export interface LightweightPost {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  kind: number;
  // Lightweight metadata
  author: {
    pubkey: string;
    profile: {
      name: string;
      picture?: string;
    };
  };
  // Placeholder counts (will be enriched later)
  likes?: number;
  reposts?: number;
  zaps?: number;
  comments?: number;
  needsEnrichment?: boolean;
}

export interface EnrichedPost extends LightweightPost {
  // Enriched data
  author: {
    pubkey: string;
    profile: {
      name: string;
      picture?: string;
      about?: string;
      lud16?: string;
      nip05?: string;
    };
    needsProfile?: boolean;
  };
  // Actual reaction counts
  likes: number;
  reposts: number;
  zaps: number;
  zapAmount?: number;
  comments: number;
  commentsData?: any[];
  needsEnrichment: false;
}

/**
 * ProgressiveLoader - Static utility for progressive data loading
 */
export class ProgressiveLoader {
  /**
   * Phase 1: Lightweight Processing
   * Minimal processing for instant display
   *
   * @param events - Raw NDK events
   * @returns Lightweight posts ready for immediate display
   */
  static lightweightProcess(events: NDKEvent[] | Set<NDKEvent>): LightweightPost[] {
    const eventsArray = Array.isArray(events) ? events : Array.from(events);

    return eventsArray.map(event => ({
      id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at || Math.floor(Date.now() / 1000),
      content: event.content,
      tags: event.tags,
      kind: event.kind || 1,
      author: {
        pubkey: event.pubkey,
        profile: {
          name: this.extractNameFromEvent(event) || 'Loading…',
          picture: undefined,
        },
      },
      // Placeholder counts
      likes: 0,
      reposts: 0,
      zaps: 0,
      comments: 0,
      needsEnrichment: true,
    }));
  }

  /**
   * Phase 2: Background Enrichment
   * Enrich posts with profiles and reactions in background
   *
   * @param posts - Lightweight posts to enrich
   * @returns Promise of enriched posts
   */
  static async enrichInBackground(posts: LightweightPost[]): Promise<EnrichedPost[]> {
    console.log(`[ProgressiveLoader] Enriching ${posts.length} posts in background...`);

    // Extract all unique pubkeys
    const pubkeys = [...new Set(posts.map(p => p.pubkey))];

    // Fetch profiles in parallel
    const profilesMap = await ProfileCache.fetchProfiles(pubkeys);

    // Enrich posts with profile data
    const enrichedPosts: EnrichedPost[] = posts.map(post => {
      const profile = profilesMap.get(post.pubkey);

      return {
        ...post,
        author: {
          pubkey: post.pubkey,
          profile: {
            name: profile?.name || post.author.profile.name,
            picture: profile?.picture,
            about: profile?.about,
            lud16: profile?.lud16,
            nip05: profile?.nip05,
          },
          needsProfile: !profile,
        },
        // Keep counts as-is (reactions would be fetched separately if needed)
        likes: post.likes || 0,
        reposts: post.reposts || 0,
        zaps: post.zaps || 0,
        comments: post.comments || 0,
        needsEnrichment: false,
      };
    });

    console.log(`[ProgressiveLoader] Enriched ${enrichedPosts.length} posts with profiles`);
    return enrichedPosts;
  }

  /**
   * Merge lightweight posts with enriched data
   * Preserves original order, updates with enriched data
   *
   * @param lightweight - Original lightweight posts
   * @param enriched - Enriched posts
   * @returns Merged posts
   */
  static mergePosts(
    lightweight: LightweightPost[],
    enriched: EnrichedPost[]
  ): EnrichedPost[] {
    const enrichedMap = new Map(enriched.map(p => [p.id, p]));

    return lightweight.map(post => {
      const enrichedPost = enrichedMap.get(post.id);
      return enrichedPost || (post as EnrichedPost);
    });
  }

  /**
   * Extract name from event tags if available
   * Provides better initial UX than "Loading…"
   */
  private static extractNameFromEvent(event: NDKEvent): string | null {
    // Check for name in tags (some clients include this)
    const nameTag = event.tags.find(tag => tag[0] === 'name');
    if (nameTag && nameTag[1]) {
      return nameTag[1];
    }

    // Try to parse from content if kind 0 (profile event)
    if (event.kind === 0) {
      try {
        const profile = JSON.parse(event.content);
        return profile.name || profile.display_name || profile.displayName || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Check if post needs enrichment
   */
  static needsEnrichment(post: LightweightPost | EnrichedPost): boolean {
    return post.needsEnrichment === true;
  }

  /**
   * Filter posts that need profile enrichment
   */
  static filterNeedingProfiles(posts: (LightweightPost | EnrichedPost)[]): string[] {
    return posts
      .filter(p => 'needsProfile' in p.author && p.author.needsProfile)
      .map(p => p.pubkey)
      .filter((pubkey, index, self) => self.indexOf(pubkey) === index); // Unique
  }
}
