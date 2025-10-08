/**
 * UnifiedSigningService Integration Tests
 * Tests GlobalNDK signer attachment, auth method detection, and signing coordination
 */

import { UnifiedSigningService } from '../UnifiedSigningService';
import { AmberNDKSigner } from '../amber/AmberNDKSigner';
import { GlobalNDKService } from '../../nostr/GlobalNDKService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDKPrivateKeySigner, NostrEvent } from '@nostr-dev-kit/ndk';

// Mock dependencies
jest.mock('../amber/AmberNDKSigner');
jest.mock('../../nostr/GlobalNDKService');
jest.mock('@react-native-async-storage/async-storage');

describe('UnifiedSigningService', () => {
  let service: UnifiedSigningService;
  const mockNsec = 'nsec1test1234567890abcdefghijklmnopqrstuvwxyz1234567890abc';
  const mockPubkey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockSignature = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    service = UnifiedSigningService.getInstance();
    service.clearCache(); // Clear any cached state

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Auth Method Detection', () => {
    test('detects nostr auth method from stored value', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('nostr');

      const authMethod = await service.getAuthMethod();
      expect(authMethod).toBe('nostr');
    });

    test('detects amber auth method from stored value', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');

      const authMethod = await service.getAuthMethod();
      expect(authMethod).toBe('amber');
    });

    test('backward compatibility: detects nostr from nsec presence', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // No auth_method
        .mockResolvedValueOnce(mockNsec); // Has nsec

      const authMethod = await service.getAuthMethod();
      expect(authMethod).toBe('nostr');

      // Should auto-upgrade by setting auth_method
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@runstr:auth_method', 'nostr');
    });

    test('detects amber from amber_pubkey presence', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // No auth_method
        .mockResolvedValueOnce(null) // No nsec
        .mockResolvedValueOnce(mockPubkey); // Has amber_pubkey

      const authMethod = await service.getAuthMethod();
      expect(authMethod).toBe('amber');
    });

    test('returns null when no auth data present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const authMethod = await service.getAuthMethod();
      expect(authMethod).toBe(null);
    });

    test('caches auth method for performance', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');

      // First call
      await service.getAuthMethod();

      // Second call should use cache
      const authMethod = await service.getAuthMethod();

      // AsyncStorage should only be called once (cached)
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(authMethod).toBe('amber');
    });
  });

  describe('GlobalNDK Signer Attachment', () => {
    test('sets Amber signer on GlobalNDK', async () => {
      const mockNDK = {
        signer: null,
        connect: jest.fn()
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      // Mock AmberNDKSigner
      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature)
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signer = await service.getSigner();

      // Verify signer was set on GlobalNDK
      expect(mockNDK.signer).toBe(mockAmberSigner);
      expect(signer).toBe(mockAmberSigner);
    });

    test('sets nsec signer on GlobalNDK', async () => {
      const mockNDK = {
        signer: null,
        connect: jest.fn()
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('nostr') // auth_method
        .mockResolvedValueOnce(mockNsec); // nsec

      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const signer = await service.getSigner();

      // Verify signer was set on GlobalNDK
      expect(mockNDK.signer).toBeTruthy();
      expect(signer).toBeInstanceOf(NDKPrivateKeySigner);
    });

    test('caches signer for performance', async () => {
      const mockNDK = {
        signer: null,
        connect: jest.fn()
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      // First call
      await service.getSigner();

      // Second call should use cached signer
      const signer = await service.getSigner();

      // AmberNDKSigner should only be constructed once
      expect(AmberNDKSigner).toHaveBeenCalledTimes(1);
      expect(signer).toBe(mockAmberSigner);
    });

    test('returns null when no auth method available', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const signer = await service.getSigner();
      expect(signer).toBe(null);
    });
  });

  describe('Event Signing', () => {
    test('signs event with Amber signer', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature)
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test post',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      const signature = await service.signEvent(event);

      expect(signature).toBe(mockSignature);
      expect(mockAmberSigner.sign).toHaveBeenCalledWith(event);
    });

    test('signs event with nsec signer', async () => {
      const mockNDK = { signer: null };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('nostr')
        .mockResolvedValueOnce(mockNsec);

      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const event: NostrEvent = {
        kind: 1301,
        content: 'Test workout',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      // Mock NDKPrivateKeySigner.sign
      const mockSign = jest.fn().mockResolvedValue(mockSignature);
      jest.spyOn(NDKPrivateKeySigner.prototype, 'sign').mockImplementation(mockSign);

      const signature = await service.signEvent(event);

      expect(signature).toBe(mockSignature);
      expect(mockSign).toHaveBeenCalledWith(event);
    });

    test('throws error when no signer available', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(service.signEvent(event)).rejects.toThrow(/No signer available/);
    });
  });

  describe('Amber Error Handling', () => {
    test('provides helpful error for rejected requests', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('User rejected signing request'))
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(service.signEvent(event)).rejects.toThrow(/rejected in Amber/);
      await expect(service.signEvent(event)).rejects.toThrow(/approve the request/);
    });

    test('provides helpful error for timeout', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('Request timed out'))
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(service.signEvent(event)).rejects.toThrow(/timed out/);
      await expect(service.signEvent(event)).rejects.toThrow(/try again/);
    });

    test('provides helpful error for Amber not installed', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('Could not open Amber app'))
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(service.signEvent(event)).rejects.toThrow(/Could not connect to Amber/);
      await expect(service.signEvent(event)).rejects.toThrow(/installed/);
    });

    test('provides helpful error for permission denied', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('Amber permission denied'))
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(service.signEvent(event)).rejects.toThrow(/permission denied/);
      await expect(service.signEvent(event)).rejects.toThrow(/permissions in Amber/);
    });

    test('provides helpful error for Amber crash', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('Amber app crashed'))
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event: NostrEvent = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey
      } as NostrEvent;

      await expect(service.signEvent(event)).rejects.toThrow(/crashed/);
      await expect(service.signEvent(event)).rejects.toThrow(/restart Amber/);
    });
  });

  describe('User Info Retrieval', () => {
    test('getUserPubkey returns pubkey for Amber', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        user: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const pubkey = await service.getUserPubkey();
      expect(pubkey).toBe(mockPubkey);
    });

    test('getUserNpub returns npub for nsec', async () => {
      const mockNDK = { signer: null };
      const mockNpub = 'npub1test123';

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('nostr')
        .mockResolvedValueOnce(mockNsec);

      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      // Mock NDKPrivateKeySigner.user
      jest.spyOn(NDKPrivateKeySigner.prototype, 'user').mockResolvedValue({
        pubkey: mockPubkey,
        npub: mockNpub
      } as any);

      const npub = await service.getUserNpub();
      expect(npub).toBe(mockNpub);
    });

    test('canSign returns true when auth method exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const canSign = await service.canSign();
      expect(canSign).toBe(true);
    });

    test('canSign returns false when no auth method', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const canSign = await service.canSign();
      expect(canSign).toBe(false);
    });
  });

  describe('Legacy Private Key Access', () => {
    test('getLegacyPrivateKeyHex returns key for nostr users', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('nostr')
        .mockResolvedValueOnce(mockNsec);

      const privateKey = await service.getLegacyPrivateKeyHex();
      expect(privateKey).toBeTruthy();
    });

    test('getLegacyPrivateKeyHex returns null for Amber users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');

      const privateKey = await service.getLegacyPrivateKeyHex();
      expect(privateKey).toBe(null);
    });

    test('getLegacyPrivateKeyHex returns null when not authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const privateKey = await service.getLegacyPrivateKeyHex();
      expect(privateKey).toBe(null);
    });
  });

  describe('Cache Management', () => {
    test('clearCache resets cached signer and auth method', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey })
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      // First call caches signer
      await service.getSigner();

      // Clear cache
      service.clearCache();

      // Next call should create new signer
      await service.getSigner();

      expect(AmberNDKSigner).toHaveBeenCalledTimes(2); // Called twice (not cached)
    });
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const instance1 = UnifiedSigningService.getInstance();
      const instance2 = UnifiedSigningService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
