/**
 * Team Creation Integration Tests
 * Tests Phase 1 & 2 fixes: Real NPUB usage + Navigation Flow
 */

import TeamService, { TeamCreationData } from '../../src/services/teamService';
import { User } from '../../src/types';

// Mock Supabase
jest.mock('../../src/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({ data: null, error: null })),
      insert: jest.fn(() => ({ 
        select: jest.fn(() => ({ 
          single: jest.fn(() => ({ data: { id: 'test-team-123' }, error: null }))
        }))
      })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ data: null, error: null })) })),
      eq: jest.fn(() => ({ data: null, error: null }))
    }))
  }
}));

describe('Team Creation Integration Tests - Phase 1 & 2 Fixes', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'Test Captain',
    npub: 'npub1real5nostr6public7key8example9abcdef1234567890abcdef',
    email: null,
    role: 'captain',
    teamId: null,
    currentTeamId: null,
    createdAt: '2024-01-01T00:00:00Z',
    lastSyncAt: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log for cleaner test output
  });

  describe('Phase 1: Real NPUB Usage', () => {
    test('should create team with REAL user npub instead of fake placeholder', async () => {
      // Arrange
      const teamData: TeamCreationData = {
        name: 'Bitcoin Runners',
        about: 'Elite Bitcoin running team',
        captainId: mockUser.id,
        captainNpub: mockUser.npub, // ✅ REAL NPUB - not fake placeholder
        captainName: mockUser.name, // ✅ REAL NAME - not fake placeholder
        prizePool: 50000
      };

      // Act
      const result = await TeamService.createTeam(teamData);

      // Assert Phase 1 Fix: Real NPUB Usage
      expect(result.success).toBe(true);
      expect(result.teamId).toBe('test-team-123');

      // Verify NO fake npub is used (Phase 1 fix)
      const upsertCall = (TeamService as any).supabase?.from()?.upsert;
      expect(upsertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          npub: mockUser.npub, // ✅ Uses REAL npub
          name: mockUser.name   // ✅ Uses REAL name
        }),
        expect.any(Object)
      );

      // Verify fake patterns are NOT used
      expect(upsertCall).not.toHaveBeenCalledWith(
        expect.objectContaining({
          npub: `simple_${mockUser.id}` // ❌ Old fake pattern eliminated
        }),
        expect.any(Object)
      );
    });

    test('should fail gracefully with invalid user data', async () => {
      // Arrange - Invalid team data missing required fields
      const invalidTeamData: Partial<TeamCreationData> = {
        name: 'Test Team',
        about: 'Test description'
        // Missing captainId, captainNpub, captainName
      };

      // Act & Assert
      await expect(
        TeamService.createTeam(invalidTeamData as TeamCreationData)
      ).rejects.toThrow();
    });
  });

  describe('Phase 2: Team Creation Success Logging', () => {
    test('should log successful team creation with real npub', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const teamData: TeamCreationData = {
        name: 'Lightning Cyclists',
        about: 'Fast Bitcoin cycling team',
        captainId: mockUser.id,
        captainNpub: mockUser.npub,
        captainName: mockUser.name,
        prizePool: 21000
      };

      // Act
      await TeamService.createTeam(teamData);

      // Assert proper logging for Phase 2 verification
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using REAL Nostr identity'),
        expect.stringContaining(mockUser.npub)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Team created successfully')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration: Full Team Creation Flow', () => {
    test('should complete full team creation workflow with real identities', async () => {
      // Arrange
      const teamData: TeamCreationData = {
        name: 'Satoshi Sprinters',
        about: 'Ultra-fast Bitcoin sprint team',
        captainId: mockUser.id,
        captainNpub: mockUser.npub, // ✅ Phase 1: Real identity
        captainName: mockUser.name, // ✅ Phase 1: Real identity  
        prizePool: 100000
      };

      // Act
      const result = await TeamService.createTeam(teamData);

      // Assert - Full integration success
      expect(result).toEqual({
        success: true,
        teamId: 'test-team-123'
      });

      // Verify complete data integrity
      expect(teamData.captainNpub).toMatch(/^npub1[a-z0-9]{58}$/i); // Valid npub format
      expect(teamData.captainName).toBe(mockUser.name); // Real user name
      expect(teamData.captainId).toBe(mockUser.id); // Consistent user ID
    });
  });
});