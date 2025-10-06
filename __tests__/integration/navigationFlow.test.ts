/**
 * Navigation Flow Integration Tests
 * Tests Phase 2 fixes: Direct Team Navigation (no more double popups)
 */

// @ts-nocheck - Test needs updating for new architecture

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ReviewLaunchStep } from '../../src/components/wizards/steps/ReviewLaunchStep';
import { createNavigationHandlers } from '../../src/navigation/navigationHandlers';
import { TeamCreationData, User } from '../../src/types';

// Mock dependencies
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  }
}));

jest.mock('../../src/services/teamService', () => ({
  default: {
    createTeam: jest.fn(() => Promise.resolve({
      success: true,
      teamId: 'team-abc-123'
    }))
  }
}));

describe('Navigation Flow Tests - Phase 2 Fixes', () => {
  const mockUser: User = {
    id: 'user-456',
    name: 'Navigation Test User',
    npub: 'npub1test2navigation3flow4example5678901234567890',
    email: null,
    role: 'captain',
    teamId: null,
    currentTeamId: null,
    createdAt: '2024-01-01T00:00:00Z',
    lastSyncAt: null
  };

  const mockTeamData: TeamCreationData = {
    teamName: 'Test Navigation Team',
    teamAbout: 'Testing direct navigation flow',
    captainId: mockUser.id,
    captainNpub: mockUser.npub,
    captainName: mockUser.name,
    prizePool: 25000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('Phase 2: Direct Navigation (No Popups)', () => {
    test('should navigate directly to team dashboard without Alert popup', async () => {
      // Arrange
      const mockNavigateToTeam = jest.fn();
      const mockOnLaunchComplete = jest.fn();

      // Act - Render ReviewLaunchStep with real navigation callback
      const { getByText } = render(
        React.createElement(ReviewLaunchStep, {
          data: mockTeamData,
          currentUser: mockUser,
          onDataChange: jest.fn(),
          onNext: jest.fn(),
          onBack: jest.fn(),
          onLaunchComplete: mockOnLaunchComplete,
          onNavigateToTeam: mockNavigateToTeam // ✅ Phase 2: Real navigation
        })
      );

      // Trigger team launch
      const launchButton = getByText('🚀 Launch Your Team');
      fireEvent.press(launchButton);

      // Wait for team creation to complete
      await waitFor(() => {
        expect(mockOnLaunchComplete).toHaveBeenCalledWith(
          expect.any(String),
          'team-abc-123'
        );
      });

      // Wait for success state and navigation
      await waitFor(() => {
        const dashboardButton = getByText('Go to Team Dashboard');
        expect(dashboardButton).toBeTruthy();
      });

      // Trigger navigation
      const dashboardButton = getByText('Go to Team Dashboard');
      fireEvent.press(dashboardButton);

      // Assert Phase 2 Fix: Direct navigation, NO Alert popup
      expect(mockNavigateToTeam).toHaveBeenCalledWith('team-abc-123');
      expect(Alert.alert).not.toHaveBeenCalledWith('Success!', expect.any(String)); // ❌ Old popup eliminated
    });

    test('should handle navigation error gracefully', async () => {
      // Arrange - Navigation callback missing
      const mockOnLaunchComplete = jest.fn();

      // Act
      const { getByText } = render(
        React.createElement(ReviewLaunchStep, {
          data: mockTeamData,
          currentUser: mockUser,
          onDataChange: jest.fn(),
          onNext: jest.fn(),
          onBack: jest.fn(),
          onLaunchComplete: mockOnLaunchComplete,
          onNavigateToTeam: undefined // Missing navigation callback
        })
      );

      // Launch team and wait for success
      fireEvent.press(getByText('🚀 Launch Your Team'));
      await waitFor(() => {
        expect(getByText('Go to Team Dashboard')).toBeTruthy();
      });

      // Try to navigate
      fireEvent.press(getByText('Go to Team Dashboard'));

      // Assert graceful error handling
      expect(Alert.alert).toHaveBeenCalledWith(
        'Navigation Error',
        'Unable to navigate to team dashboard'
      );
    });
  });

  describe('Navigation Handlers Integration', () => {
    test('should handle team creation completion with direct navigation', () => {
      // Arrange
      const mockNavigation = {
        navigate: jest.fn()
      };
      
      const handlers = createNavigationHandlers();
      const teamData: TeamCreationData = {
        teamName: 'Handler Test Team',
        teamAbout: 'Testing navigation handlers',
        captainId: mockUser.id,
        captainNpub: mockUser.npub,
        captainName: mockUser.name
      };

      // Act - Phase 2: Navigation with teamId
      handlers.handleTeamCreationComplete(
        teamData,
        mockNavigation,
        'team-handler-456' // ✅ teamId provided
      );

      // Assert Phase 2 Fix: Direct navigation to Team screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Team', {
        teamId: 'team-handler-456',
        refresh: true
      });
      
      // Verify NO Alert popup (Phase 2 fix)
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should fallback to captain dashboard if no teamId', () => {
      // Arrange
      const mockNavigation = {
        navigate: jest.fn()
      };
      
      const handlers = createNavigationHandlers();
      const teamData: TeamCreationData = {
        teamName: 'Fallback Test Team', 
        teamAbout: 'Testing fallback navigation',
        captainId: mockUser.id,
        captainNpub: mockUser.npub,
        captainName: mockUser.name
      };

      // Act - No teamId provided
      handlers.handleTeamCreationComplete(
        teamData,
        mockNavigation
        // undefined teamId
      );

      // Assert fallback behavior
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CaptainDashboard');
    });

    test('should handle direct team navigation', () => {
      // Arrange
      const mockNavigation = {
        navigate: jest.fn()
      };
      
      const handlers = createNavigationHandlers();

      // Act - Phase 2: Direct team navigation
      handlers.handleNavigateToTeam('team-direct-789', mockNavigation);

      // Assert direct navigation
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Team', {
        teamId: 'team-direct-789',
        refresh: true
      });
    });
  });

  describe('End-to-End Navigation Flow', () => {
    test('should complete full navigation workflow without popups', async () => {
      // Arrange - Full workflow simulation
      const mockNavigation = {
        navigate: jest.fn()
      };
      
      const mockNavigateToTeam = jest.fn();
      const handlers = createNavigationHandlers();

      // Simulate complete flow
      const teamCreationData: TeamCreationData = {
        teamName: 'E2E Test Team',
        teamAbout: 'End-to-end navigation test', 
        captainId: mockUser.id,
        captainNpub: mockUser.npub,
        captainName: mockUser.name,
        prizePool: 75000
      };

      // Act 1: Team creation completes
      handlers.handleTeamCreationComplete(
        teamCreationData,
        mockNavigation,
        'team-e2e-999'
      );

      // Act 2: Direct navigation triggered  
      handlers.handleNavigateToTeam('team-e2e-999', mockNavigation);

      // Assert: Complete workflow success
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'Team', {
        teamId: 'team-e2e-999',
        refresh: true
      });
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'Team', {
        teamId: 'team-e2e-999', 
        refresh: true
      });

      // Verify Phase 2 Fix: NO Alert popups at all
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});