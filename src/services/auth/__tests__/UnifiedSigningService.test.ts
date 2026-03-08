/**
 * UnifiedSigningService tests aligned with current auth + signer behavior.
 */

(global as any).__DEV__ = false;

jest.mock('../amber/AmberNDKSigner');
jest.mock('../../nostr/GlobalNDKService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    deviceName: 'jest-device',
    expoConfig: { version: '1.0.0-test' },
  },
}));
jest.mock('../SecureNsecStorage', () => ({
  SecureNsecStorage: {
    hasNsec: jest.fn(),
  },
}));
jest.mock('../../../utils/nostrAuth', () => ({
  getAuthenticationData: jest.fn(),
}));
jest.mock('../../../utils/nostr', () => ({
  nsecToPrivateKey: jest.fn(() => 'a'.repeat(64)),
}));

const { UnifiedSigningService } = require('../UnifiedSigningService');
const { AmberNDKSigner } = require('../amber/AmberNDKSigner');
const { GlobalNDKService } = require('../../nostr/GlobalNDKService');
const { SecureNsecStorage } = require('../SecureNsecStorage');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { NDKPrivateKeySigner } = require('@nostr-dev-kit/ndk');
const { getAuthenticationData } = require('../../../utils/nostrAuth');
const { nsecToPrivateKey } = require('../../../utils/nostr');

describe('UnifiedSigningService', () => {
  let service: any;

  const mockNsec = 'nsec1test1234567890abcdefghijklmnopqrstuvwxyz1234567890abc';
  const mockPubkey =
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockSignature =
    'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    service = UnifiedSigningService.getInstance();
    service.clearCache();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    (SecureNsecStorage.hasNsec as jest.Mock).mockResolvedValue(false);
    (getAuthenticationData as jest.Mock).mockResolvedValue(null);
    (nsecToPrivateKey as jest.Mock).mockReturnValue('a'.repeat(64));
  });

  describe('Auth Method Detection', () => {
    test('detects nostr from stored auth method', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('nostr');
      await expect(service.getAuthMethod()).resolves.toBe('nostr');
    });

    test('detects amber from stored auth method', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');
      await expect(service.getAuthMethod()).resolves.toBe('amber');
    });

    test('backward compatibility: detects nostr via SecureNsecStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureNsecStorage.hasNsec as jest.Mock).mockResolvedValue(true);

      await expect(service.getAuthMethod()).resolves.toBe('nostr');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@runstr:auth_method',
        'nostr'
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@runstr:amber_pubkey');
    });

    test('detects amber from amber_pubkey fallback', async () => {
      (SecureNsecStorage.hasNsec as jest.Mock).mockResolvedValue(false);
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@runstr:auth_method') return Promise.resolve(null);
        if (key === '@runstr:amber_pubkey') return Promise.resolve(mockPubkey);
        return Promise.resolve(null);
      });

      await expect(service.getAuthMethod()).resolves.toBe('amber');
    });

    test('caches detected auth method', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');

      await service.getAuthMethod();
      await expect(service.getAuthMethod()).resolves.toBe('amber');
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Signer Wiring', () => {
    test('sets Amber signer on GlobalNDK', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature),
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const signer = await service.getSigner();

      expect(mockAmberSigner.blockUntilReady).toHaveBeenCalledTimes(1);
      expect(mockNDK.signer).toBe(mockAmberSigner);
      expect(signer).toBe(mockAmberSigner);
    });

    test('sets fresh nsec signer on GlobalNDK', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('nostr');
      (getAuthenticationData as jest.Mock).mockResolvedValue({ nsec: mockNsec });
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const signer = await service.getSigner();

      expect(getAuthenticationData).toHaveBeenCalledTimes(1);
      expect(nsecToPrivateKey).toHaveBeenCalledWith(mockNsec);
      expect(mockNDK.signer).toBeInstanceOf(NDKPrivateKeySigner);
      expect(signer).toBeInstanceOf(NDKPrivateKeySigner);
    });

    test('does not cache signer between calls (fresh signer each time)', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const signerA = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      };
      const signerB = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      };

      (AmberNDKSigner as jest.Mock)
        .mockImplementationOnce(() => signerA)
        .mockImplementationOnce(() => signerB);

      const first = await service.getSigner();
      const second = await service.getSigner();

      expect(AmberNDKSigner).toHaveBeenCalledTimes(2);
      expect(first).toBe(signerA);
      expect(second).toBe(signerB);
    });
  });

  describe('Signing', () => {
    test('signs event with amber signer', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockResolvedValue(mockSignature),
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event = {
        kind: 1,
        content: 'Test post',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey,
      };

      await expect(service.signEvent(event)).resolves.toBe(mockSignature);
      expect(mockAmberSigner.sign).toHaveBeenCalledWith(event);
    });

    test('signs event with nsec signer', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('nostr');
      (getAuthenticationData as jest.Mock).mockResolvedValue({ nsec: mockNsec });
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockSign = jest.fn().mockResolvedValue(mockSignature);
      jest.spyOn(NDKPrivateKeySigner.prototype, 'sign').mockImplementation(mockSign);

      const event = {
        kind: 1301,
        content: 'Test workout',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey,
      };

      await expect(service.signEvent(event)).resolves.toBe(mockSignature);
      expect(mockSign).toHaveBeenCalledWith(event);
    });

    test('maps amber rejection to friendly action message', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('amber');
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockAmberSigner = {
        blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
        sign: jest.fn().mockRejectedValue(new Error('User rejected signing request')),
      };
      (AmberNDKSigner as jest.Mock).mockImplementation(() => mockAmberSigner);

      const event = {
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: mockPubkey,
      };

      await expect(service.signEvent(event)).rejects.toThrow(/rejected in Amber/);
      await expect(service.signEvent(event)).rejects.toThrow(/approve the request/);
    });
  });

  describe('User + Legacy Helpers', () => {
    test('getUserNpub returns npub for nostr signer', async () => {
      const mockNDK = { signer: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('nostr');
      (getAuthenticationData as jest.Mock).mockResolvedValue({ nsec: mockNsec });
      (GlobalNDKService.getInstance as jest.Mock).mockResolvedValue(mockNDK);

      const mockNpub = 'npub1test123';
      jest.spyOn(NDKPrivateKeySigner.prototype, 'user').mockResolvedValue({
        pubkey: mockPubkey,
        npub: mockNpub,
      } as any);

      await expect(service.getUserNpub()).resolves.toBe(mockNpub);
    });

    test('getLegacyPrivateKeyHex returns derived key for nostr users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('nostr');
      (getAuthenticationData as jest.Mock).mockResolvedValue({ nsec: mockNsec });

      await expect(service.getLegacyPrivateKeyHex()).resolves.toBe('a'.repeat(64));
    });

    test('getLegacyPrivateKeyHex returns null for amber users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('amber');
      await expect(service.getLegacyPrivateKeyHex()).resolves.toBeNull();
    });
  });
});
