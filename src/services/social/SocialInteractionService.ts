// src/services/social/SocialInteractionService.ts

import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import LightningZapServiceDefault from '../nutzap/LightningZapService';
import { PaymentRouter } from '../wallet/PaymentRouter';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

const DEFAULT_ZAP_AMOUNT = 100;
const PUBLISH_TIMEOUT_MS = 10000;

export class SocialInteractionService {
  private static instance: SocialInteractionService;

  static getInstance(): SocialInteractionService {
    if (!SocialInteractionService.instance) {
      SocialInteractionService.instance = new SocialInteractionService();
    }
    return SocialInteractionService.instance;
  }

  async toggleLike(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    newCount: number;
    isLiked: boolean;
    error?: string;
  }> {
    const userNpub = await this.getUserNpub();
    if (!userNpub) return { success: false, newCount: 0, isLiked: false, error: 'Not signed in' };

    if (!isSupabaseConfigured()) return { success: false, newCount: 0, isLiked: false, error: 'Supabase not configured' };

    const { data, error: rpcError } = await supabase!
      .rpc('toggle_social_like', { post_id: postId, user_npub: userNpub });

    if (rpcError) {
      console.error('[SocialInteraction] toggle_social_like error:', rpcError);
      return { success: false, newCount: 0, isLiked: false, error: 'Failed to update like' };
    }

    const result = data?.[0] || { new_like_count: 0, is_liked: false };
    const isLiked = result.is_liked;

    if (isLiked) {
      this.publishKind7(eventId, authorPubkey).catch((err) =>
        console.warn('[SocialInteraction] Kind 7 publish failed:', err)
      );
    }

    return { success: true, newCount: result.new_like_count, isLiked };
  }

  async repost(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    newCount: number;
    wasAdded: boolean;
    error?: string;
  }> {
    const userNpub = await this.getUserNpub();
    if (!userNpub) return { success: false, newCount: 0, wasAdded: false, error: 'Not signed in' };

    if (!isSupabaseConfigured()) return { success: false, newCount: 0, wasAdded: false, error: 'Supabase not configured' };

    const { data, error: rpcError } = await supabase!
      .rpc('add_social_repost', { post_id: postId, user_npub: userNpub });

    if (rpcError) {
      console.error('[SocialInteraction] add_social_repost error:', rpcError);
      return { success: false, newCount: 0, wasAdded: false, error: 'Failed to repost' };
    }

    const result = data?.[0] || { new_repost_count: 0, was_added: false };

    if (result.was_added) {
      this.publishKind6(eventId, authorPubkey).catch((err) =>
        console.warn('[SocialInteraction] Kind 6 publish failed:', err)
      );
    }

    return { success: true, newCount: result.new_repost_count, wasAdded: result.was_added };
  }

  async zap(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    newTotal: number;
    error?: string;
  }> {
    const walletAvailable = await PaymentRouter.isWalletAvailable();
    if (!walletAvailable) {
      return { success: false, newTotal: 0, error: 'Connect a wallet in Settings to zap' };
    }

    try {
      const result = await LightningZapServiceDefault.sendLightningZap(
        authorPubkey,
        DEFAULT_ZAP_AMOUNT,
        '',
        eventId
      );

      if (!result.success) {
        return { success: false, newTotal: 0, error: result.error || 'Zap failed' };
      }

      let newTotal = 0;
      if (isSupabaseConfigured()) {
        const { data } = await supabase!
          .rpc('add_social_zap', { post_id: postId, amount: DEFAULT_ZAP_AMOUNT });
        newTotal = data || 0;
      }

      return { success: true, newTotal };
    } catch (error) {
      console.error('[SocialInteraction] zap error:', error);
      return { success: false, newTotal: 0, error: 'Zap failed' };
    }
  }

  private async getUserNpub(): Promise<string | null> {
    try {
      return await UnifiedSigningService.getInstance().getUserNpub();
    } catch {
      return null;
    }
  }

  private async publishKind7(eventId: string, authorPubkey: string): Promise<void> {
    const ndk = await GlobalNDKService.getInstance();
    const signer = await UnifiedSigningService.getInstance().getSigner();
    if (!signer) throw new Error('No signer');

    const event = new NDKEvent(ndk);
    event.kind = 7 as NDKKind;
    event.content = '+';
    event.tags = [
      ['e', eventId, ''],
      ['p', authorPubkey],
    ];

    await Promise.race([
      event.publish(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS)),
    ]);
  }

  private async publishKind6(eventId: string, authorPubkey: string): Promise<void> {
    const ndk = await GlobalNDKService.getInstance();
    const signer = await UnifiedSigningService.getInstance().getSigner();
    if (!signer) throw new Error('No signer');

    const event = new NDKEvent(ndk);
    event.kind = 6 as NDKKind;
    event.content = '';
    event.tags = [
      ['e', eventId, ''],
      ['p', authorPubkey],
    ];

    await Promise.race([
      event.publish(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS)),
    ]);
  }
}

export default SocialInteractionService.getInstance();
