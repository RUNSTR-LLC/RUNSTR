/**
 * WavlakeZapService - Handles Lightning zaps to Wavlake artists
 * Uses LNURL from Wavlake API and NWC for payment
 */

import { NWCWalletService } from '../wallet/NWCWalletService';
import { NWCStorageService } from '../wallet/NWCStorageService';
import { WavlakeService } from './WavlakeService';
import type { WavlakeTrack, ZapResult } from '../../types/music';

interface LNURLPayResponse {
  callback: string;
  minSendable: number; // millisats
  maxSendable: number; // millisats
  metadata: string;
  tag: string;
}

class WavlakeZapServiceClass {
  /**
   * Check if NWC wallet is available for zapping
   */
  async hasWallet(): Promise<boolean> {
    try {
      return await NWCStorageService.hasNWC();
    } catch {
      return false;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    try {
      const result = await NWCWalletService.getBalance();
      return result.balance;
    } catch (error) {
      console.error('[WavlakeZap] Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Decode bech32 LNURL to URL
   */
  private decodeLnurl(lnurl: string): string {
    try {
      // Import bech32 from scure
      const { bech32 } = require('@scure/base');

      // Decode bech32
      const { prefix, words } = bech32.decode(lnurl, 2000);
      if (prefix !== 'lnurl') {
        throw new Error('Invalid LNURL prefix');
      }

      // Convert from 5-bit words to bytes
      const bytes = bech32.fromWords(words);
      const url = new TextDecoder().decode(new Uint8Array(bytes));
      return url;
    } catch (error) {
      console.error('[WavlakeZap] Failed to decode LNURL:', error);
      throw new Error('Invalid LNURL format');
    }
  }

  /**
   * Fetch LNURL-pay details
   */
  private async fetchLnurlPayDetails(url: string): Promise<LNURLPayResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'ERROR') {
        throw new Error(data.reason || 'LNURL error');
      }

      return data as LNURLPayResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Request invoice from LNURL callback
   */
  private async requestInvoice(
    callback: string,
    amountMsats: number,
    comment?: string
  ): Promise<string> {
    const params = new URLSearchParams({
      amount: amountMsats.toString(),
    });

    if (comment) {
      params.append('comment', comment);
    }

    const separator = callback.includes('?') ? '&' : '?';
    const url = `${callback}${separator}${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'ERROR') {
        throw new Error(data.reason || 'Invoice request failed');
      }

      if (!data.pr) {
        throw new Error('No invoice in response');
      }

      return data.pr;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Zap a track's artist
   *
   * @param track - The track to zap
   * @param amountSats - Amount in satoshis
   * @param comment - Optional comment
   * @returns ZapResult with success/failure info
   */
  async zapTrack(
    track: WavlakeTrack,
    amountSats: number,
    comment?: string
  ): Promise<ZapResult> {
    const result: ZapResult = {
      success: false,
      amountSats,
      trackId: track.id,
      artistName: track.artist.name,
    };

    try {
      // Check wallet
      const hasWallet = await this.hasWallet();
      if (!hasWallet) {
        result.error = 'No NWC wallet configured';
        return result;
      }

      // Get LNURL from Wavlake
      console.log('[WavlakeZap] Getting LNURL for track:', track.id);
      const lnurl = await WavlakeService.getLnurl(track.id);

      // Decode LNURL to URL
      console.log('[WavlakeZap] Decoding LNURL...');
      const lnurlUrl = this.decodeLnurl(lnurl);

      // Fetch pay details
      console.log('[WavlakeZap] Fetching pay details from:', lnurlUrl);
      const payDetails = await this.fetchLnurlPayDetails(lnurlUrl);

      // Validate amount
      const amountMsats = amountSats * 1000;
      if (amountMsats < payDetails.minSendable) {
        result.error = `Minimum amount is ${Math.ceil(payDetails.minSendable / 1000)} sats`;
        return result;
      }
      if (amountMsats > payDetails.maxSendable) {
        result.error = `Maximum amount is ${Math.floor(payDetails.maxSendable / 1000)} sats`;
        return result;
      }

      // Request invoice
      console.log('[WavlakeZap] Requesting invoice for', amountSats, 'sats');
      const invoice = await this.requestInvoice(
        payDetails.callback,
        amountMsats,
        comment || `Zap from RUNSTR: ${track.title}`
      );

      // Pay invoice
      console.log('[WavlakeZap] Paying invoice...');
      const paymentResult = await NWCWalletService.sendPayment(invoice);

      if (paymentResult.success) {
        console.log('[WavlakeZap] ✅ Zap successful!');
        result.success = true;
        result.preimage = paymentResult.preimage;
        return result;
      } else {
        result.error = paymentResult.error || 'Payment failed';
        return result;
      }
    } catch (error) {
      console.error('[WavlakeZap] Zap failed:', error);
      result.error =
        error instanceof Error ? error.message : 'Failed to send zap';
      return result;
    }
  }

  /**
   * Quick zap with default amount
   */
  async quickZap(
    track: WavlakeTrack,
    defaultAmount: number = 100
  ): Promise<ZapResult> {
    return this.zapTrack(track, defaultAmount, `⚡ from RUNSTR`);
  }
}

export const WavlakeZapService = new WavlakeZapServiceClass();
export default WavlakeZapService;
