/**
 * Challenge Creation Wizard Test Suite
 * Comprehensive end-to-end tests for the challenge creation flow
 */

// @ts-nocheck - Test needs updating for new architecture

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ChallengeCreationWizard } from '../src/components/wizards/ChallengeCreationWizard';
import { useChallengeCreation } from '../src/hooks/useChallengeCreation';
import { ChallengeService } from '../src/services/challengeService';
import { TeammateInfo, User, ChallengeType } from '../src/types';

// Mock dependencies
jest.mock('../src/hooks/useChallengeCreation');
jest.mock('../src/services/challengeService');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock teammates data
const mockTeammates: TeammateInfo[] = [
  {
    id: 'teammate1',
    name: 'Sarah Johnson',
    avatar: 'S',
    stats: { challengesCount: 12, winsCount: 8 },
  },
  {
    id: 'teammate2', 
    name: 'Mike Chen',
    avatar: 'M',
    stats: { challengesCount: 5, winsCount: 3 },
  },
  {
    id: 'teammate3',
    name: 'Emily Rodriguez', 
    avatar: 'E',
    stats: { challengesCount: 18, winsCount: 11 },
  },
];

// Mock challenge types
const mockChallengeTypes: ChallengeType[] = [
  {
    id: 'fastest-5k',
    name: 'Fastest 5K',
    description: 'Best time to complete 5 kilometers wins',
    category: 'race',
    metric: 'time',
  },
  {
    id: 'weekly-distance',
    name: 'Weekly Distance', 
    description: 'Most distance covered in 7 days wins',
    category: 'distance',
    metric: 'distance',
  },
];

const mockCurrentUser: User = {
  id: 'user1',
  name: 'Alex',
  npub: 'npub1test',
  role: 'member',
  teamId: 'team1',
  currentTeamId: 'team1', 
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock hook implementation
const mockUseChallengeCreation = useChallengeCreation as jest.MockedFunction<typeof useChallengeCreation>;

describe('ChallengeCreationWizard', () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();
  const mockCreateChallenge = jest.fn();
  const mockValidateWager = jest.fn();
  const mockFormatWagerDisplay = jest.fn();
  const mockRefreshTeammates = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock hook return
    mockUseChallengeCreation.mockReturnValue({
      teammates: mockTeammates,
      isLoading: false,
      error: null,
      validateWager: mockValidateWager.mockReturnValue({ isValid: true }),
      formatWagerDisplay: mockFormatWagerDisplay.mockReturnValue('1,000 sats'),
      createChallenge: mockCreateChallenge,
      refreshTeammates: mockRefreshTeammates,
      clearError: mockClearError,
    });
  });

  const renderWizard = (props = {}) => {
    return render(
      <ChallengeCreationWizard
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        teammates={mockTeammates}
        currentUser={mockCurrentUser}
        teamId="team1"
        {...props}
      />
    );
  };

  describe('Step 1: Choose Opponent', () => {
    it('renders opponent selection step correctly', () => {
      const { getByText, getByTestId } = renderWizard();
      
      expect(getByText('Choose Opponent')).toBeTruthy();
      expect(getByText('Select a teammate to challenge')).toBeTruthy();
      expect(getByText('Sarah Johnson')).toBeTruthy();
      expect(getByText('Mike Chen')).toBeTruthy();
      expect(getByText('Emily Rodriguez')).toBeTruthy();
    });

    it('disables Next button initially', () => {
      const { getByText } = renderWizard();
      
      const nextButton = getByText('Next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables Next button after selecting opponent', () => {
      const { getByText, getByTestId } = renderWizard();
      
      // Select an opponent
      fireEvent.press(getByText('Sarah Johnson'));
      
      const nextButton = getByText('Next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('progresses to challenge type step after selecting opponent', () => {
      const { getByText } = renderWizard();
      
      // Select opponent and proceed
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      
      expect(getByText('Challenge Type')).toBeTruthy();
      expect(getByText('Choose what kind of challenge you want to create')).toBeTruthy();
    });
  });

  describe('Step 2: Challenge Type Selection', () => {
    beforeEach(() => {
      // Progress to step 2
      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
    });

    it('renders challenge type options', () => {
      const { getByText } = renderWizard();
      
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      
      expect(getByText('Race Challenges')).toBeTruthy();
      expect(getByText('Fastest 5K')).toBeTruthy();
      expect(getByText('Distance Challenges')).toBeTruthy();
      expect(getByText('Weekly Distance')).toBeTruthy();
    });

    it('enables Next after selecting challenge type', () => {
      const { getByText } = renderWizard();
      
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));
      
      const nextButton = getByText('Next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('allows back navigation to opponent selection', () => {
      const { getByText } = renderWizard();
      
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('←')); // Back button
      
      expect(getByText('Choose Opponent')).toBeTruthy();
    });
  });

  describe('Step 3: Wager Amount', () => {
    beforeEach(() => {
      mockValidateWager.mockReturnValue({ isValid: true });
    });

    const progressToWagerStep = () => {
      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));
      fireEvent.press(getByText('Next'));
      return { getByText };
    };

    it('renders wager input step', () => {
      const { getByText } = progressToWagerStep();
      
      expect(getByText('Set Wager')).toBeTruthy();
      expect(getByText('How much are you wagering on this challenge?')).toBeTruthy();
      expect(getByText('Prize Amount')).toBeTruthy();
    });

    it('validates wager amount', () => {
      mockValidateWager.mockReturnValue({ isValid: false, error: 'Minimum wager is 100 sats' });
      
      const { getByText } = progressToWagerStep();
      
      const nextButton = getByText('Next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('allows preset wager selection', () => {
      const { getByText } = progressToWagerStep();
      
      fireEvent.press(getByText('1,000 sats'));
      
      const nextButton = getByText('Next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('Step 4: Review & Confirm', () => {
    const progressToReviewStep = () => {
      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));  
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Next')); // Proceed with default wager
      return { getByText };
    };

    it('displays challenge summary', () => {
      const { getByText } = progressToReviewStep();
      
      expect(getByText('Review Challenge')).toBeTruthy();
      expect(getByText('Confirm the details before creating your challenge')).toBeTruthy();
      expect(getByText('Participants')).toBeTruthy();
      expect(getByText('Challenge Type')).toBeTruthy();
      expect(getByText('Prize Amount')).toBeTruthy();
    });

    it('shows Create Challenge button', () => {
      const { getByText } = progressToReviewStep();
      
      expect(getByText('Create Challenge')).toBeTruthy();
    });
  });

  describe('Challenge Creation', () => {
    const progressToReviewAndCreate = async () => {
      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));
      fireEvent.press(getByText('Next')); 
      fireEvent.press(getByText('Next'));
      return { getByText };
    };

    it('successfully creates challenge', async () => {
      mockCreateChallenge.mockResolvedValue(undefined);
      
      const { getByText } = await progressToReviewAndCreate();
      
      await act(async () => {
        fireEvent.press(getByText('Create Challenge'));
      });

      await waitFor(() => {
        expect(mockCreateChallenge).toHaveBeenCalledWith({
          opponentId: 'teammate1',
          challengeType: expect.objectContaining({
            id: 'fastest-5k',
            name: 'Fastest 5K'
          }),
          wagerAmount: 1000,
          duration: 7,
          expiresAt: expect.any(String),
        });
      });

      expect(getByText('Challenge Created!')).toBeTruthy();
      expect(getByText('Your challenge has been sent to your opponent')).toBeTruthy();
    });

    it('handles challenge creation failure', async () => {
      const error = new Error('Network error occurred');
      mockCreateChallenge.mockRejectedValue(error);
      
      const { getByText } = await progressToReviewAndCreate();
      
      await act(async () => {
        fireEvent.press(getByText('Create Challenge'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Connection Error',
          'Please check your internet connection and try again.',
          expect.any(Array)
        );
      });
    });

    it('handles insufficient funds error', async () => {
      const error = new Error('Insufficient balance in wallet');
      mockCreateChallenge.mockRejectedValue(error);
      
      const { getByText } = await progressToReviewAndCreate();
      
      await act(async () => {
        fireEvent.press(getByText('Create Challenge'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Insufficient Balance',
          'You don\'t have enough sats in your wallet for this wager amount.',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Add Funds' }),
            expect.objectContaining({ text: 'Change Amount' })
          ])
        );
      });
    });

    it('handles opponent unavailable error', async () => {
      const error = new Error('Selected opponent is no longer available');
      mockCreateChallenge.mockRejectedValue(error);
      
      const { getByText } = await progressToReviewAndCreate();
      
      await act(async () => {
        fireEvent.press(getByText('Create Challenge'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Opponent Unavailable',
          'The selected opponent is no longer available. Please choose another teammate.',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Choose Another' })
          ])
        );
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state when fetching teammates', () => {
      mockUseChallengeCreation.mockReturnValue({
        teammates: [],
        isLoading: true,
        error: null,
        validateWager: mockValidateWager,
        formatWagerDisplay: mockFormatWagerDisplay,
        createChallenge: mockCreateChallenge,
        refreshTeammates: mockRefreshTeammates,
        clearError: mockClearError,
      });

      const { getByText } = renderWizard();
      
      expect(getByText('Loading teammates...')).toBeTruthy();
    });

    it('disables Create button during challenge creation', async () => {
      mockUseChallengeCreation.mockReturnValue({
        teammates: mockTeammates,
        isLoading: true,
        error: null,
        validateWager: mockValidateWager,
        formatWagerDisplay: mockFormatWagerDisplay,
        createChallenge: mockCreateChallenge,
        refreshTeammates: mockRefreshTeammates,
        clearError: mockClearError,
      });

      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Next'));
      
      const createButton = getByText('Create Challenge');
      expect(createButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Success Screen', () => {
    it('displays success screen after challenge creation', async () => {
      mockCreateChallenge.mockResolvedValue(undefined);
      
      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Next'));
      
      await act(async () => {
        fireEvent.press(getByText('Create Challenge'));
      });

      await waitFor(() => {
        expect(getByText('Challenge Created!')).toBeTruthy();
        expect(getByText('Your challenge has been sent to your opponent')).toBeTruthy();
        expect(getByText('Done')).toBeTruthy();
      });
    });

    it('resets wizard on Done button press', async () => {
      mockCreateChallenge.mockResolvedValue(undefined);
      
      const { getByText } = renderWizard();
      fireEvent.press(getByText('Sarah Johnson'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Fastest 5K'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Next'));
      
      await act(async () => {
        fireEvent.press(getByText('Create Challenge'));
      });

      await waitFor(() => {
        expect(getByText('Done')).toBeTruthy();
      });

      fireEvent.press(getByText('Done'));
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is pressed', () => {
      const { getByText } = renderWizard();
      
      fireEvent.press(getByText('Cancel'));
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});