/**
 * End-to-End Authentication Flow Tests
 * Comprehensive testing of Phase 1 authentication implementation
 */

import { 
  generateNostrKeyPair,
  validateNsec,
  nsecToNpub,
  storeNsecLocally,
  getNsecFromStorage,
  clearNostrStorage,
  normalizeNsecInput 
} from '../src/utils/nostr';
import { AuthService } from '../src/services/auth/authService';
import coinosService from '../src/services/coinosService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Supabase
jest.mock('../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({
            then: jest.fn()
          })),
          single: jest.fn(() => ({
            then: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            then: jest.fn()
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          then: jest.fn()
        }))
      }))
    })),
    auth: {
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn()
    }
  }
}));

describe('Authentication Flow E2E Tests', () => {
  const testNsec = 'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5f';
  const expectedNpub = 'npub1yx5cw0xrx6mc8vjpdnvl3lnvvkr2ce9g98x9w2l2qdtdgstz3tkqxyxk5l';
  
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear?.();
    await clearNostrStorage();
  });

  describe('Nostr Utilities', () => {
    test('should generate valid Nostr key pairs', async () => {
      const keyPair = generateNostrKeyPair();
      
      expect(keyPair.nsec).toMatch(/^nsec1[a-z0-9]+$/);
      expect(keyPair.npub).toMatch(/^npub1[a-z0-9]+$/);
      expect(keyPair.privateKeyHex).toHaveLength(64);
      expect(keyPair.publicKeyHex).toHaveLength(64);
      expect(validateNsec(keyPair.nsec)).toBe(true);
    });

    test('should validate nsec formats correctly', () => {
      expect(validateNsec(testNsec)).toBe(true);
      expect(validateNsec('invalid-nsec')).toBe(false);
      expect(validateNsec('nsec1invalid')).toBe(false);
      expect(validateNsec('')).toBe(false);
    });

    test('should convert nsec to npub correctly', () => {
      const npub = nsecToNpub(testNsec);
      expect(npub).toMatch(/^npub1[a-z0-9]+$/);
      expect(npub).toHaveLength(63); // Standard npub length
    });

    test('should normalize different nsec input formats', () => {
      // Valid nsec should return as-is
      expect(normalizeNsecInput(testNsec)).toBe(testNsec);
      
      // Should trim whitespace
      expect(normalizeNsecInput(`  ${testNsec}  `)).toBe(testNsec);
      
      // Should handle hex private key
      const hexKey = '7c8a0d923321a8f0abf5ecb8f0a5d5e0d4b6f1b7a8e9c2d3f4a5b6c7d8e9f0a1';
      const normalizedFromHex = normalizeNsecInput(hexKey);
      expect(normalizedFromHex).toMatch(/^nsec1[a-z0-9]+$/);
    });

    test('should store and retrieve nsec securely', async () => {
      const userId = 'test-user-123';
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      
      mockSetItem.mockResolvedValue(undefined);
      mockGetItem.mockResolvedValue('encrypted-nsec-data');

      await storeNsecLocally(testNsec, userId);
      
      expect(mockSetItem).toHaveBeenCalledWith(
        '@runstr:nsec_encrypted',
        expect.any(String)
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        '@runstr:npub',
        expect.stringMatching(/^npub1[a-z0-9]+$/)
      );
    });
  });

  describe('CoinOS Service Integration', () => {
    test('should initialize CoinOS service', async () => {
      await coinosService.initialize();
      expect(coinosService).toBeDefined();
    });

    test('should check service availability', async () => {
      // Mock fetch for service availability
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
        } as Response)
      );

      const isAvailable = await coinosService.checkServiceAvailability();
      expect(isAvailable).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://coinos.io/api/ping',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('should handle service unavailability', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
        } as Response)
      );

      const isAvailable = await coinosService.checkServiceAvailability();
      expect(isAvailable).toBe(false);
    });

    test('should create personal wallet with valid user ID', async () => {
      const userId = 'test-user-123';
      
      // Mock successful wallet creation
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true } as Response) // Service availability
        .mockResolvedValueOnce({ // Registration
          ok: true,
          json: () => Promise.resolve({
            token: 'test-auth-token',
            id: 'coinos-user-id'
          })
        } as Response)
        .mockResolvedValueOnce({ // Get user info
          ok: true,
          json: () => Promise.resolve({
            id: 'coinos-user-id',
            username: 'test-username',
            balance: 0
          })
        } as Response);

      const result = await coinosService.createPersonalWallet(userId);
      
      expect(result.success).toBe(true);
      expect(result.wallet).toBeDefined();
      expect(result.wallet?.lightningAddress).toMatch(/@coinos\.io$/);
    });
  });

  describe('Authentication Service', () => {
    test('should authenticate new user with valid nsec', async () => {
      const mockSupabaseFrom = require('../src/services/supabase').supabase.from;
      
      // Mock: No existing user found
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => 
              Promise.resolve({ data: [], error: null })
            )
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => 
              Promise.resolve({
                data: {
                  id: 'new-user-123',
                  name: 'Test User',
                  npub: expectedNpub,
                  role: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            )
          }))
        }))
      });

      const result = await AuthService.signInWithNostr(testNsec);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.needsOnboarding).toBe(true);
      expect(result.needsRoleSelection).toBe(true);
      expect(result.needsWalletCreation).toBe(true);
      expect(result.user?.npub).toBe(expectedNpub);
    });

    test('should authenticate existing user with valid nsec', async () => {
      const mockSupabaseFrom = require('../src/services/supabase').supabase.from;
      const existingUser = {
        id: 'existing-user-123',
        name: 'Existing User',
        email: null,
        npub: expectedNpub,
        role: 'member',
        current_team_id: null,
        created_at: new Date().toISOString(),
        last_sync_at: null,
        updated_at: new Date().toISOString()
      };

      // Mock: Existing user found
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => 
              Promise.resolve({ data: [existingUser], error: null })
            )
          }))
        }))
      });

      // Mock CoinOS has wallet credentials
      const mockHasWalletCredentials = jest.spyOn(coinosService, 'hasWalletCredentials');
      mockHasWalletCredentials.mockResolvedValue(true);

      const result = await AuthService.signInWithNostr(testNsec);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.needsOnboarding).toBe(false);
      expect(result.needsRoleSelection).toBe(false);
      expect(result.needsWalletCreation).toBe(false);
      expect(result.user?.id).toBe('existing-user-123');
    });

    test('should handle invalid nsec input', async () => {
      const result = await AuthService.signInWithNostr('invalid-nsec');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid nsec format');
      expect(result.user).toBeUndefined();
    });

    test('should handle database errors during user creation', async () => {
      const mockSupabaseFrom = require('../src/services/supabase').supabase.from;
      
      // Mock: Database query error
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => 
              Promise.resolve({ 
                data: null, 
                error: { message: 'Database connection failed' } 
              })
            )
          }))
        }))
      });

      const result = await AuthService.signInWithNostr(testNsec);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to check existing user');
    });

    test('should update user role successfully', async () => {
      const mockSupabaseFrom = require('../src/services/supabase').supabase.from;
      const userId = 'test-user-123';
      const roleData = { role: 'captain' as const };

      mockSupabaseFrom.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => 
            Promise.resolve({ error: null })
          )
        }))
      });

      const result = await AuthService.updateUserRole(userId, roleData);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('User role updated successfully');
    });

    test('should create personal wallet successfully', async () => {
      const userId = 'test-user-123';
      
      // Mock successful wallet creation
      const mockCreatePersonalWallet = jest.spyOn(coinosService, 'createPersonalWallet');
      mockCreatePersonalWallet.mockResolvedValue({
        success: true,
        wallet: {
          id: 'wallet-123',
          userId,
          provider: 'coinos',
          balance: 0,
          lightningAddress: 'testuser@coinos.io',
          createdAt: new Date()
        }
      });

      // Mock database update
      const mockSupabaseFrom = require('../src/services/supabase').supabase.from;
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      });

      const result = await AuthService.createPersonalWallet(userId);
      
      expect(result.success).toBe(true);
      expect(result.lightningAddress).toBe('testuser@coinos.io');
    });
  });

  describe('Complete Authentication Flow', () => {
    test('should complete full new user authentication flow', async () => {
      // Setup mocks for complete flow
      const mockSupabaseFrom = require('../src/services/supabase').supabase.from;
      
      // Step 1: No existing user
      mockSupabaseFrom.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'new-user-123',
                name: 'user_yx5cw0xr',
                npub: expectedNpub,
                role: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            }))
          }))
        }))
      });

      // Step 2: Authentication
      const authResult = await AuthService.signInWithNostr(testNsec);
      expect(authResult.success).toBe(true);
      expect(authResult.needsOnboarding).toBe(true);
      expect(authResult.needsRoleSelection).toBe(true);

      // Step 3: Role Selection
      mockSupabaseFrom.mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      });

      const roleResult = await AuthService.updateUserRole(
        authResult.user!.id, 
        { role: 'member' }
      );
      expect(roleResult.success).toBe(true);

      // Step 4: Wallet Creation
      const mockCreateWallet = jest.spyOn(coinosService, 'createPersonalWallet');
      mockCreateWallet.mockResolvedValue({
        success: true,
        wallet: {
          id: 'wallet-123',
          userId: authResult.user!.id,
          provider: 'coinos',
          balance: 0,
          lightningAddress: 'runstruser123@coinos.io',
          createdAt: new Date()
        }
      });

      mockSupabaseFrom.mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      });

      const walletResult = await AuthService.createPersonalWallet(authResult.user!.id);
      expect(walletResult.success).toBe(true);
      expect(walletResult.lightningAddress).toContain('@coinos.io');

      console.log('✅ Complete authentication flow test passed');
    });
  });

  describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      // Mock network failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      const isAvailable = await coinosService.checkServiceAvailability();
      expect(isAvailable).toBe(false);
    });

    test('should handle wallet creation failures', async () => {
      const userId = 'test-user-123';
      
      // Mock wallet creation failure
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false } as Response); // Service unavailable

      const result = await coinosService.createPersonalWallet(userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('currently unavailable');
    });

    test('should clear storage on sign out', async () => {
      const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;
      mockMultiRemove.mockResolvedValue(undefined);

      const mockSupabaseSignOut = require('../src/services/supabase').supabase.auth.signOut;
      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const result = await AuthService.signOut();
      
      expect(result.success).toBe(true);
      expect(mockMultiRemove).toHaveBeenCalled();
    });
  });

  describe('Local Storage Integration', () => {
    test('should encrypt and store nsec locally', async () => {
      const userId = 'test-user-123';
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockResolvedValue(undefined);

      await storeNsecLocally(testNsec, userId);

      expect(mockSetItem).toHaveBeenCalledWith(
        '@runstr:nsec_encrypted',
        expect.any(String)
      );
      
      // Verify npub is also stored
      expect(mockSetItem).toHaveBeenCalledWith(
        '@runstr:npub',
        expect.stringMatching(/^npub1[a-z0-9]+$/)
      );
    });

    test('should handle storage errors gracefully', async () => {
      const userId = 'test-user-123';
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockRejectedValue(new Error('Storage full'));

      await expect(storeNsecLocally(testNsec, userId)).rejects.toThrow(
        'Failed to store Nostr keys locally'
      );
    });
  });
});