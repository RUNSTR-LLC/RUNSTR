// src/services/social/SocialInteractionService.ts

import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import LightningZapServiceDefault from '../nutzap/LightningZapService';
import { PaymentRouter } from '../wallet/PaymentRouter';

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
    error?: string;
  }> {
    try {
      await this.publishKind7(eventId, authorPubkey);
      return { success: true };
    } catch (err) {
      console.warn('[SocialInteraction] Kind 7 publish failed:', err);
      return { success: false, error: 'Failed to publish like' };
    }
  }

  async repost(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.publishKind6(eventId, authorPubkey);
      return { success: true };
    } catch (err) {
      console.warn('[SocialInteraction] Kind 6 publish failed:', err);
      return { success: false, error: 'Failed to publish repost' };
    }
  }

  async zap(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const walletAvailable = await PaymentRouter.isWalletAvailable();
    if (!walletAvailable) {
      return { success: false, error: 'Connect a wallet in Settings to zap' };
    }

    try {
      const result = await LightningZapServiceDefault.sendLightningZap(
        authorPubkey,
        DEFAULT_ZAP_AMOUNT,
        '',
        eventId
      );

      if (!result.success) {
        return { success: false, error: result.error || 'Zap failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[SocialInteraction] zap error:', error);
      return { success: false, error: 'Zap failed' };
    }
  }

  async publishComment(eventId: string, authorPubkey: string, content: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const ndk = await GlobalNDKService.getInstance();
      const signer = await UnifiedSigningService.getInstance().getSigner();
      if (!signer) throw new Error('No signer');

      const event = new NDKEvent(ndk);
      event.kind = 1 as NDKKind;
      event.content = content;
      event.tags = [
        ['e', eventId, '', 'root'],
        ['p', authorPubkey],
      ];

      await Promise.race([
        event.publish(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS)),
      ]);

      return { success: true };
    } catch (err) {
      console.warn('[SocialInteraction] Comment publish failed:', err);
      return { success: false, error: 'Failed to publish comment' };
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
