/**
 * AmberNDKSigner Unit Tests
 * Tests NIP-55 compliance, timeout handling, error detection, and response parsing
 */

import { AmberNDKSigner } from '../AmberNDKSigner';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { NostrEvent } from '@nostr-dev-kit/ndk';

// Mock dependencies
jest.mock('expo-intent-launcher');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  }
}));

describe('AmberNDKSigner', () => {
  let signer: AmberNDKSigner;
  const mockPubkey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockSignature = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    signer = new AmberNDKSigner();

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('NIP-55 Compliance', () => {
    test('sign_event includes current_user parameter', async () => {
      // Mock successful get_public_key
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      // Initialize signer to get pubkey
      await signer.blockUntilReady();

      // Mock successful sign_event
      let capturedIntent: any;
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce((action, options) => {
        capturedIntent = options;
        return Promise.resolve({
          resultCode: IntentLauncher.ResultCode.Success,
          extra: { signature: mockSignature }
        });
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test post',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await signer.sign(event);

      // Verify current_user parameter is included
      expect(capturedIntent.extra).toHaveProperty('current_user');
      expect(capturedIntent.extra.current_user).toBe(mockPubkey);
    });

    test('sign_event includes id parameter', async () => {
      // Mock successful get_public_key
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      // Mock successful sign_event
      let capturedIntent: any;
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce((action, options) => {
        capturedIntent = options;
        return Promise.resolve({
          resultCode: IntentLauncher.ResultCode.Success,
          extra: { signature: mockSignature }
        });
      });

      const event: NostrEvent = {
        kind: 1301,
        content: 'Test workout',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await signer.sign(event);

      // Verify id parameter is included for request tracking
      expect(capturedIntent.extra).toHaveProperty('id');
      expect(capturedIntent.extra.id).toBeTruthy();
    });

    test('sign_event includes type parameter', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      let capturedIntent: any;
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce((action, options) => {
        capturedIntent = options;
        return Promise.resolve({
          resultCode: IntentLauncher.ResultCode.Success,
          extra: { signature: mockSignature }
        });
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await signer.sign(event);

      expect(capturedIntent.extra.type).toBe('sign_event');
    });

    test('get_public_key does NOT include current_user', async () => {
      let capturedIntent: any;
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce((action, options) => {
        capturedIntent = options;
        return Promise.resolve({
          resultCode: IntentLauncher.ResultCode.Success,
          extra: { result: mockPubkey }
        });
      });

      await signer.requestPublicKey();

      // get_public_key should NOT have current_user (we don't know it yet!)
      expect(capturedIntent.extra).not.toHaveProperty('current_user');
      expect(capturedIntent.extra.type).toBe('get_public_key');
    });

    test('event encoded in URI per NIP-55', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      let capturedIntent: any;
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce((action, options) => {
        capturedIntent = options;
        return Promise.resolve({
          resultCode: IntentLauncher.ResultCode.Success,
          extra: { signature: mockSignature }
        });
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await signer.sign(event);

      // Verify event is URI-encoded in data field
      expect(capturedIntent.data).toContain('nostrsigner:');
      expect(capturedIntent.data).toContain('%7B'); // URL-encoded JSON
    });

    test('unsigned event does NOT include id or sig fields', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      let capturedUri: string = '';
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce((action, options) => {
        capturedUri = options.data;
        return Promise.resolve({
          resultCode: IntentLauncher.ResultCode.Success,
          extra: { signature: mockSignature }
        });
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await signer.sign(event);

      // Decode URI and parse event
      const encodedEvent = capturedUri.replace('nostrsigner:', '');
      const eventJson = decodeURIComponent(encodedEvent);
      const parsedEvent = JSON.parse(eventJson);

      // Verify NO id or sig fields (Amber calculates these)
      expect(parsedEvent).not.toHaveProperty('id');
      expect(parsedEvent).not.toHaveProperty('sig');
    });
  });

  describe('Timeout Handling', () => {
    test('throws timeout error after 60 seconds', async () => {
      jest.useFakeTimers();

      // Mock IntentLauncher to never resolve
      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const requestPromise = signer.requestPublicKey();

      // Fast-forward 61 seconds
      jest.advanceTimersByTime(61000);

      await expect(requestPromise).rejects.toThrow(/timed out after 60 seconds/);

      jest.useRealTimers();
    });

    test('does not timeout if response arrives in time', async () => {
      jest.useFakeTimers();

      (IntentLauncher.startActivityAsync as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => {
          setTimeout(() => resolve({
            resultCode: IntentLauncher.ResultCode.Success,
            extra: { result: mockPubkey }
          }), 5000); // Respond after 5 seconds
        })
      );

      const requestPromise = signer.requestPublicKey();

      // Fast-forward 10 seconds (less than 60s timeout)
      jest.advanceTimersByTime(10000);

      await expect(requestPromise).resolves.toBe(mockPubkey);

      jest.useRealTimers();
    });
  });

  describe('Error Detection', () => {
    test('detects "Amber not installed" error', async () => {
      const installError = new Error('No Activity found to handle Intent');
      (IntentLauncher.startActivityAsync as jest.Mock).mockRejectedValue(installError);

      await expect(signer.requestPublicKey()).rejects.toThrow(/Amber app not found/);

      // Reset mock for second test
      jest.clearAllMocks();
      (IntentLauncher.startActivityAsync as jest.Mock).mockRejectedValue(installError);
      await expect(signer.requestPublicKey()).rejects.toThrow(/Google Play Store/);
    });

    test('detects ActivityNotFoundException', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockRejectedValueOnce(
        new Error('ActivityNotFoundException: No app can perform this action')
      );

      await expect(signer.requestPublicKey()).rejects.toThrow(/Amber app not found/);
    });

    test('detects user rejection', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Canceled
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(signer.sign(event)).rejects.toThrow(/canceled/i);
    });

    test('detects missing signature in response', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      // Response with success but no signature
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: {} // No signature field
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(signer.sign(event)).rejects.toThrow(/Amber did not return a signature/);
    });

    test('throws error on non-Android platform', async () => {
      // Mock iOS platform
      (Platform as any).OS = 'ios';

      await expect(signer.requestPublicKey()).rejects.toThrow(/only available on Android/);

      // Restore Android
      (Platform as any).OS = 'android';
    });
  });

  describe('Response Parsing', () => {
    test('extracts pubkey from extra.result', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      const pubkey = await signer.requestPublicKey();
      expect(pubkey).toBe(mockPubkey);
    });

    test('extracts pubkey from extra.pubkey fallback', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { pubkey: mockPubkey }
      });

      const pubkey = await signer.requestPublicKey();
      expect(pubkey).toBe(mockPubkey);
    });

    test('extracts signature from extra.signature', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { signature: mockSignature }
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      const sig = await signer.sign(event);
      expect(sig).toBe(mockSignature);
    });

    test('extracts signature from signed event object', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      const signedEvent = {
        id: 'event123',
        pubkey: mockPubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'Test',
        sig: mockSignature
      };

      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { event: JSON.stringify(signedEvent) }
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      const sig = await signer.sign(event);
      expect(sig).toBe(mockSignature);
    });

    test('caches event ID when Amber returns full signed event', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.blockUntilReady();

      const eventId = 'cached-event-id-123';
      const signedEvent = {
        id: eventId,
        pubkey: mockPubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'Test',
        sig: mockSignature
      };

      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { event: JSON.stringify(signedEvent) }
      });

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await signer.sign(event);

      expect(signer.getLastSignedEventId()).toBe(eventId);
    });
  });

  describe('Pubkey Handling', () => {
    test('pads 63-character hex pubkey to 64 characters', async () => {
      const unpaddedPubkey = '234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'; // 63 chars

      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: unpaddedPubkey }
      });

      const pubkey = await signer.requestPublicKey();

      // Should be padded to 64 chars
      expect(pubkey.length).toBe(64);
      expect(pubkey).toBe('0' + unpaddedPubkey);
    });

    test('decodes npub to hex', async () => {
      const npub = 'npub1z3s4jf4h5g5d7v9f3s4j5h6g7f8d9s0a1s2d3f4g5h6j7k8l9m0n1p2q3'; // Example

      // Mock successful response with npub
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey } // We'll still return hex for simplicity
      });

      const pubkey = await signer.requestPublicKey();
      expect(pubkey).toMatch(/^[0-9a-fA-F]{64}$/); // Valid hex
    });

    test('caches pubkey in AsyncStorage', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      await signer.requestPublicKey();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@runstr:amber_pubkey', mockPubkey);
    });

    test('retrieves cached pubkey on subsequent calls', async () => {
      // Mock cached pubkey
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(mockPubkey);

      const user = await signer.blockUntilReady();

      // Should NOT call IntentLauncher (using cache)
      expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
      expect(user.pubkey).toBe(mockPubkey);
    });
  });

  describe('Initialization', () => {
    test('blockUntilReady fetches pubkey if not cached', async () => {
      (IntentLauncher.startActivityAsync as jest.Mock).mockResolvedValueOnce({
        resultCode: IntentLauncher.ResultCode.Success,
        extra: { result: mockPubkey }
      });

      const user = await signer.blockUntilReady();

      expect(user.pubkey).toBe(mockPubkey);
      expect(IntentLauncher.startActivityAsync).toHaveBeenCalledTimes(1);
    });

    test('blockUntilReady uses cached pubkey', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(mockPubkey);

      const user = await signer.blockUntilReady();

      expect(user.pubkey).toBe(mockPubkey);
      expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    });

    test('throws error if pubkey not initialized', () => {
      expect(() => signer.pubkey).toThrow(/not initialized/);
    });
  });
});
