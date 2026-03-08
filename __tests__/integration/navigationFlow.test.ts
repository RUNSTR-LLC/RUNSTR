/**
 * Navigation Flow Integration Tests
 *
 * Refocused on active navigation-handler contracts.
 * Legacy wizard/component integration assertions depended on removed modules.
 */

jest.mock('../../src/store/userStore', () => ({
  useUserStore: {
    getState: () => ({ user: null }),
  },
}));

jest.mock('../../src/services/auth/authService', () => ({
  AuthService: {
    getCurrentUserWithWallet: jest.fn(async () => null),
    signOut: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/nostr/NostrTeamService', () => ({
  getNostrTeamService: () => ({
    getDiscoveredTeams: () => new Map(),
    joinTeam: jest.fn(async () => ({ success: false, error: 'not-used' })),
  }),
}));

jest.mock('../../src/services/team/captainDetectionService', () => ({
  CaptainDetectionService: {
    getInstance: () => ({
      getCaptainStatus: jest.fn(async () => ({
        isCaptain: false,
        captainOfTeams: [],
      })),
    }),
  },
}));

jest.mock('../../src/utils/teamUtils', () => ({
  isTeamMember: jest.fn(() => false),
  isTeamCaptain: jest.fn(() => false),
}));

jest.mock('../../src/services/user/directNostrProfileService', () => ({
  DirectNostrProfileService: {},
}));

jest.mock('../../src/utils/captainCache', () => ({
  CaptainCache: {
    getCaptainStatus: jest.fn(async () => null),
    setCaptainStatus: jest.fn(async () => undefined),
    getCaptainTeams: jest.fn(async () => []),
  },
}));

jest.mock('../../src/components/ui/CustomAlert', () => ({
  CustomAlertManager: {
    alert: jest.fn(),
  },
}));

import { createNavigationHandlers } from '../../src/navigation/navigationHandlers';

describe('Navigation Handlers - Active Flow Contracts', () => {
  const handlers = createNavigationHandlers();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('routes directly to Team screen with refresh flag', () => {
    const mockNavigation = { navigate: jest.fn() };

    handlers.handleNavigateToTeam('team-direct-789', mockNavigation);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Team', {
      teamId: 'team-direct-789',
      refresh: true,
    });
  });

  test('routes onboarding completion to Profile', () => {
    const mockNavigation = { navigate: jest.fn() };

    handlers.handleOnboardingComplete(
      {
        selectedRole: 'captain',
        authenticated: true,
      },
      mockNavigation
    );

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });

  test('routes wallet management to Profile', () => {
    const mockNavigation = { navigate: jest.fn() };

    handlers.handleManageWallet(mockNavigation);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });

  test('routes help action to HelpSupport when navigation is provided', () => {
    const mockNavigation = { navigate: jest.fn() };

    handlers.handleHelp(mockNavigation);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('HelpSupport');
  });
});
