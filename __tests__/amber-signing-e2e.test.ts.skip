/**
 * Amber Signing End-to-End Tests
 * Tests complete signing flow from event creation to publishing
 */

import { UnifiedSigningService } from '../src/services/auth/UnifiedSigningService';
import { GlobalNDKService } from '../src/services/nostr/GlobalNDKService';
import { AmberNDKSigner } from '../src/services/auth/amber/AmberNDKSigner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDKEvent, NostrEvent } from '@nostr-dev-kit/ndk';

// Mock dependencies
jest.mock('../src/services/auth/amber/AmberNDKSigner');
jest.mock('../src/services/nostr/GlobalNDKService');
jest.mock('@react-native-async-storage/async-storage');

describe('Amber Signing End-to-End', () => {
  const mockPubkey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockSignature = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Clear UnifiedSigningService cache
    UnifiedSigningService.getInstance().clearCache();
  });

  describe('Complete Amber Flow', () => {
    test('kind 1 post flow: create → sign → publish', async () => {
      // Setup: Mock Amber authentication
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = {
        signer: null,
        fetchEvents: jest.fn(),
        publish: jest.fn()
      };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature),
        user: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      // Step 1: Create event
      const event: NostrEvent = {
        kind: 1,
        content: 'Testing Amber signing with kind 1',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      // Step 2: Sign event with UnifiedSigningService
      const signingService = UnifiedSigningService.getInstance();
      const signature = await signingService.signEvent(event);

      // Step 3: Verify signer was attached to GlobalNDK
      expect(mockNDK.signer).toBe(mockAmberSigner);

      // Step 4: Verify signature returned
      expect(signature).toBe(mockSignature);

      // Step 5: Create signed NDKEvent
      const signedEvent = {
        ...event,
        sig: signature
      };

      const ndkEvent = new NDKEvent(mockNDK as any, signedEvent as any);

      // Step 6: Publish to Nostr
      await ndkEvent.publish();

      // Verify complete flow
      expect(mockAmberSigner.sign).toHaveBeenCalledWith(event);
      expect(mockAmberSigner.blockUntilReady).toHaveBeenCalled();
    });

    test('kind 1301 workout flow: create → sign → publish', async () => {
      // Setup
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = {
        signer: null,
        fetchEvents: jest.fn(),
        publish: jest.fn()
      };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature),
        user: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      // Step 1: Create kind 1301 workout event
      const workoutEvent: NostrEvent = {
        kind: 1301,
        content: 'Completed a running workout',
        tags: [
          ['d', 'workout-123'],
          ['title', 'Morning Run'],
          ['exercise', 'running'],
          ['distance', '5.2', 'km'],
          ['duration', '00:30:45'],
          ['calories', '312']
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      // Step 2: Sign
      const signingService = UnifiedSigningService.getInstance();
      const signature = await signingService.signEvent(workoutEvent);

      // Step 3: Verify
      expect(mockNDK.signer).toBe(mockAmberSigner);
      expect(signature).toBe(mockSignature);

      // Step 4: Publish
      const signedEvent = { ...workoutEvent, sig: signature };
      const ndkEvent = new NDKEvent(mockNDK as any, signedEvent as any);
      await ndkEvent.publish();

      // Verify Amber received kind 1301
      expect(mockAmberSigner.sign).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 1301 })
      );
    });
  });

  describe('Multiple Events in Sequence', () => {
    test('signs multiple events without re-initializing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = { signer: null };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature)
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signingService = UnifiedSigningService.getInstance();

      // Sign event 1
      const event1: NostrEvent = {
        kind: 1,
        content: 'First post',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;
      await signingService.signEvent(event1);

      // Sign event 2
      const event2: NostrEvent = {
        kind: 1301,
        content: 'Workout',
        tags: [['d', 'workout-1']],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;
      await signingService.signEvent(event2);

      // Sign event 3
      const event3: NostrEvent = {
        kind: 1,
        content: 'Third post',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;
      await signingService.signEvent(event3);

      // Verify signer was only initialized once (cached)
      expect(AmberNDKSigner).toHaveBeenCalledTimes(1);
      expect(mockAmberSigner.blockUntilReady).toHaveBeenCalledTimes(1);

      // Verify all events were signed
      expect(mockAmberSigner.sign).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery', () => {
    test('retries after user rejects first request', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = { signer: null };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn()
          .mockRejectedValueOnce(new Error('User rejected signing request'))
          .mockResolvedValueOnce(mockSignature) // Success on second try
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signingService = UnifiedSigningService.getInstance();
      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      // First attempt - rejected
      await expect(signingService.signEvent(event)).rejects.toThrow(/rejected in Amber/);

      // Second attempt - success
      const signature = await signingService.signEvent(event);
      expect(signature).toBe(mockSignature);
    });

    test('handles Amber not installed error gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = { signer: null };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('Could not open Amber'))
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signingService = UnifiedSigningService.getInstance();
      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(signingService.signEvent(event)).rejects.toThrow(/Could not connect to Amber/);
    });
  });

  describe('GlobalNDK Integration', () => {
    test('GlobalNDK uses attached signer for queries', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = {
        signer: null,
        fetchEvents: jest.fn().mockResolvedValue([])
      };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        user: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      // Initialize signer
      const signingService = UnifiedSigningService.getInstance();
      await signingService.getSigner();

      // Verify signer is attached to GlobalNDK
      const ndk = await GlobalNDKService.getInstance();
      expect(ndk.signer).toBe(mockAmberSigner);
    });

    test('multiple services share same GlobalNDK signer', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = {
        signer: null,
        fetchEvents: jest.fn()
      };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      // Service 1 initializes signer
      const signingService1 = UnifiedSigningService.getInstance();
      await signingService1.getSigner();

      // Service 2 should get same GlobalNDK with signer already attached
      const ndk = await GlobalNDKService.getInstance();
      expect(ndk.signer).toBe(mockAmberSigner);

      // Verify only one AmberNDKSigner instance created
      expect(AmberNDKSigner).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Persistence', () => {
    test('uses cached pubkey on app restart', async () => {
      // Simulate cached pubkey from previous session
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('amber') // auth_method
        .mockResolvedValueOnce(mockPubkey); // cached amber_pubkey

      const mockNDK = { signer: null };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature)
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signingService = UnifiedSigningService.getInstance();
      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      // Sign event - should use cached pubkey
      await signingService.signEvent(event);

      // Verify signer was initialized (blockUntilReady checks cache)
      expect(mockAmberSigner.blockUntilReady).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('caching prevents redundant Amber calls', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const mockNDK = { signer: null };
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      let initializeCount = 0;
      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockImplementation(() => {
          initializeCount++;
          return Promise.resolve({ pubkey: mockPubkey });
        }),
        sign: jest.fn().mockResolvedValue(mockSignature)
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signingService = UnifiedSigningService.getInstance();

      // Sign 5 events
      for (let i = 0; i < 5; i++) {
        const event: NostrEvent = {
          kind: 1,
          content: `Test ${i}`,
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: mockPubkey
        } as NostrEvent;
        await signingService.signEvent(event);
      }

      // Verify signer only initialized once (cached for subsequent calls)
      expect(initializeCount).toBe(1);
      expect(mockAmberSigner.sign).toHaveBeenCalledTimes(5);
    });
  });
});
