/**
 * Amber signing flow tests aligned with current UnifiedSigningService behavior.
 *
 * Notes:
 * - UnifiedSigningService now creates a fresh signer on each call (no signer cache).
 * - Tests mock runtime/native modules to keep Jest deterministic in Node.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../src/services/auth/amber/AmberNDKSigner', () => ({
  AmberNDKSigner: jest.fn(),
}));

jest.mock('../src/services/nostr/GlobalNDKService', () => ({
  GlobalNDKService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../src/services/auth/SecureNsecStorage', () => ({
  SecureNsecStorage: {
    hasNsec: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../src/utils/nostrAuth', () => ({
  getAuthenticationData: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/utils/nostr', () => ({
  nsecToPrivateKey: jest.fn(() => 'hex-private-key'),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-constants', () => ({
  deviceName: 'jest-device',
  expoConfig: { version: 'test-version' },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '18.0',
  },
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { AmberNDKSigner } = require('../src/services/auth/amber/AmberNDKSigner');
const { GlobalNDKService } = require('../src/services/nostr/GlobalNDKService');
const { UnifiedSigningService } = require('../src/services/auth/UnifiedSigningService');

describe('Amber Signing End-to-End', () => {
  const mockPubkey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockSignature =
    'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === '@runstr:auth_method') return 'amber';
      if (key === '@runstr:amber_pubkey') return mockPubkey;
      return null;
    });

    const service = UnifiedSigningService.getInstance();
    service.clearCache();
  });

  test('kind 1 flow: service signs event and attaches signer to GlobalNDK', async () => {
    const mockNDK = { signer: null };
    GlobalNDKService.getInstance.mockResolvedValue(mockNDK);

    const mockAmberSigner = {
      blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      sign: jest.fn().mockResolvedValue(mockSignature),
      user: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
    };
    AmberNDKSigner.mockImplementation(() => mockAmberSigner);

    const event = {
      kind: 1,
      content: 'Testing Amber signing with kind 1',
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: mockPubkey,
    };

    const signingService = UnifiedSigningService.getInstance();
    const signature = await signingService.signEvent(event as any);

    expect(signature).toBe(mockSignature);
    expect(mockAmberSigner.blockUntilReady).toHaveBeenCalledTimes(1);
    expect(mockAmberSigner.sign).toHaveBeenCalledWith(event);
    expect(mockNDK.signer).toBe(mockAmberSigner);
  });

  test('kind 1301 workout flow signs successfully with Amber signer', async () => {
    const mockNDK = { signer: null };
    GlobalNDKService.getInstance.mockResolvedValue(mockNDK);

    const mockAmberSigner = {
      blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      sign: jest.fn().mockResolvedValue(mockSignature),
    };
    AmberNDKSigner.mockImplementation(() => mockAmberSigner);

    const workoutEvent = {
      kind: 1301,
      content: 'Completed a running workout',
      tags: [
        ['d', 'workout-123'],
        ['title', 'Morning Run'],
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: mockPubkey,
    };

    const signingService = UnifiedSigningService.getInstance();
    const signature = await signingService.signEvent(workoutEvent as any);

    expect(signature).toBe(mockSignature);
    expect(mockAmberSigner.sign).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 1301 })
    );
  });

  test('creates fresh Amber signer for each signEvent call (no signer cache)', async () => {
    const mockNDK = { signer: null };
    GlobalNDKService.getInstance.mockResolvedValue(mockNDK);

    const signerA = {
      blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      sign: jest.fn().mockResolvedValue('sig-a'),
    };
    const signerB = {
      blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      sign: jest.fn().mockResolvedValue('sig-b'),
    };

    AmberNDKSigner
      .mockImplementationOnce(() => signerA)
      .mockImplementationOnce(() => signerB);

    const signingService = UnifiedSigningService.getInstance();

    const event1 = { kind: 1, content: 'First', tags: [], created_at: 1, pubkey: mockPubkey };
    const event2 = { kind: 1, content: 'Second', tags: [], created_at: 2, pubkey: mockPubkey };

    await signingService.signEvent(event1 as any);
    await signingService.signEvent(event2 as any);

    expect(AmberNDKSigner).toHaveBeenCalledTimes(2);
    expect(signerA.blockUntilReady).toHaveBeenCalledTimes(1);
    expect(signerB.blockUntilReady).toHaveBeenCalledTimes(1);
  });

  test('maps rejected Amber request into friendly error', async () => {
    const mockNDK = { signer: null };
    GlobalNDKService.getInstance.mockResolvedValue(mockNDK);

    const mockAmberSigner = {
      blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      sign: jest.fn().mockRejectedValue(new Error('User rejected signing request')),
    };
    AmberNDKSigner.mockImplementation(() => mockAmberSigner);

    const signingService = UnifiedSigningService.getInstance();
    const event = { kind: 1, content: 'Test', tags: [], created_at: 1, pubkey: mockPubkey };

    await expect(signingService.signEvent(event as any)).rejects.toThrow(/rejected in Amber/i);
  });

  test('maps Amber app launch failure into connect guidance error', async () => {
    const mockNDK = { signer: null };
    GlobalNDKService.getInstance.mockResolvedValue(mockNDK);

    const mockAmberSigner = {
      blockUntilReady: jest.fn().mockResolvedValue({ pubkey: mockPubkey }),
      sign: jest.fn().mockRejectedValue(new Error('Could not open Amber')),
    };
    AmberNDKSigner.mockImplementation(() => mockAmberSigner);

    const signingService = UnifiedSigningService.getInstance();
    const event = { kind: 1, content: 'Test', tags: [], created_at: 1, pubkey: mockPubkey };

    await expect(signingService.signEvent(event as any)).rejects.toThrow(/Could not connect to Amber/i);
  });
});
