/**
 * OnboardingWizard - Multi-step onboarding flow for new users
 * Guides users through authentication, team selection, and initial setup
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { DiscoveryTeam } from '../../types';
import { TeamDiscoveryScreen } from '../../screens/TeamDiscoveryScreen';
import { analytics } from '../../utils/analytics';
import { RoleSelectionStep } from './steps/RoleSelectionStep';
import { AuthService } from '../../services/auth/authService';
import { SimpleTeamJoiningService } from '../../services/user/simpleTeamJoining';
import { AppleSignInButton } from '../auth/AppleSignInButton';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { OnboardingWalletSetupStep } from './steps/OnboardingWalletSetupStep';

type OnboardingStep =
  | 'welcome'
  | 'authentication'
  | 'role_selection'
  | 'wallet_setup'
  | 'permissions'
  | 'team_selection'
  | 'setup_complete';

interface OnboardingWizardProps {
  onComplete: (data: {
    selectedTeam?: DiscoveryTeam;
    selectedRole?: 'member' | 'captain';
    authenticated?: boolean;
  }) => void;
  onSkip?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedTeam, setSelectedTeam] = useState<DiscoveryTeam | undefined>();
  const [selectedRole, setSelectedRole] = useState<
    'member' | 'captain' | undefined
  >();
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    'Setting up your account...'
  );

  useEffect(() => {
    // Track onboarding start
    analytics.trackOnboardingStarted();
  }, []);

  // Step progression handlers
  const handleNext = () => {
    // Track step completion
    analytics.trackOnboardingStepCompleted(
      getStepNumber(currentStep),
      currentStep
    );

    // Progress to next step
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('authentication');
        break;
      case 'authentication':
        // After authentication, go to role selection if needed
        if (authenticatedUser?.needsRoleSelection) {
          setCurrentStep('role_selection');
        } else if (authenticatedUser?.needsWalletCreation) {
          setCurrentStep('wallet_setup');
        } else {
          setCurrentStep('permissions');
        }
        break;
      case 'role_selection':
        // After role selection, go to wallet setup if needed
        if (authenticatedUser?.needsWalletCreation) {
          setCurrentStep('wallet_setup');
        } else {
          setCurrentStep('permissions');
        }
        break;
      case 'wallet_setup':
        setCurrentStep('permissions');
        break;
      case 'permissions':
        setCurrentStep('team_selection');
        break;
      case 'team_selection':
        setCurrentStep('setup_complete');
        break;
      case 'setup_complete':
        onComplete({
          selectedTeam,
          selectedRole,
          authenticated: !!authenticatedUser,
        });
        break;
    }
  };

  const handleTeamJoin = async (team: DiscoveryTeam) => {
    try {
      console.log(
        'OnboardingWizard: User attempting to join team during onboarding:',
        team.name
      );

      // Get current authenticated user
      const currentUser = await AuthService.getCurrentUserWithWallet();
      if (!currentUser) {
        Alert.alert(
          'Error',
          'Please complete authentication before joining a team'
        );
        return;
      }

      // Show processing state
      setIsProcessing(true);
      setProcessingMessage(`Joining ${team.name}...`);

      // Validate team join eligibility
      const validation = await SimpleTeamJoiningService.validateTeamJoin(
        currentUser.id,
        team.id
      );
      if (!validation.success) {
        Alert.alert(
          'Cannot Join Team',
          validation.error || 'Unable to join this team'
        );
        setIsProcessing(false);
        return;
      }

      // Perform actual team join
      const result = await SimpleTeamJoiningService.joinTeam(
        currentUser.id,
        team.id
      );

      if (result.success) {
        console.log(
          'OnboardingWizard: Successfully joined team during onboarding:',
          team.name
        );
        setSelectedTeam(team);
        setIsProcessing(false);
        setCurrentStep('setup_complete');
      } else {
        console.error(
          'OnboardingWizard: Team join failed during onboarding:',
          result.error
        );
        Alert.alert(
          'Join Failed',
          result.error ||
            'Unable to join team during onboarding. You can try again later from team discovery.'
        );
        setIsProcessing(false);
        // Continue to completion without team
        setSelectedTeam(undefined);
        setCurrentStep('setup_complete');
      }
    } catch (error) {
      console.error(
        'OnboardingWizard: Unexpected error joining team during onboarding:',
        error
      );
      Alert.alert(
        'Error',
        'An unexpected error occurred. You can join a team later from team discovery.'
      );
      setIsProcessing(false);
      // Continue to completion without team
      setSelectedTeam(undefined);
      setCurrentStep('setup_complete');
    }
  };

  const handleSkipTeamSelection = () => {
    analytics.trackOnboardingStepCompleted(
      getStepNumber(currentStep),
      currentStep
    );
    setSelectedTeam(undefined);
    setCurrentStep('setup_complete');
  };

  const handleOnboardingComplete = () => {
    analytics.trackOnboardingCompleted(selectedTeam);
    onComplete({
      selectedTeam,
      selectedRole,
      authenticated: !!authenticatedUser,
    });
  };

  const handleOnboardingSkip = () => {
    analytics.trackOnboardingSkipped();
    onSkip?.();
  };

  // Authentication handlers
  const handleAuthenticationComplete = (authResult: any) => {
    console.log('OnboardingWizard: Auth result received:', authResult);

    if (authResult.success) {
      setAuthenticatedUser(authResult);

      console.log(
        'OnboardingWizard: needsRoleSelection:',
        authResult.needsRoleSelection
      );
      console.log(
        'OnboardingWizard: needsWalletCreation:',
        authResult.needsWalletCreation
      );
      console.log('OnboardingWizard: user role:', authResult.user?.role);

      if (authResult.needsRoleSelection) {
        console.log('OnboardingWizard: Moving to role_selection step');
        setCurrentStep('role_selection');
      } else if (authResult.needsWalletCreation) {
        console.log('OnboardingWizard: Moving to wallet_setup step');
        setCurrentStep('wallet_setup');
      } else if (authResult.user?.role) {
        console.log('OnboardingWizard: User has role, moving to permissions');
        setSelectedRole(authResult.user.role);
        setCurrentStep('permissions');
      } else {
        console.log('OnboardingWizard: Fallback to role_selection step');
        setCurrentStep('role_selection');
      }
    } else {
      console.error(
        'OnboardingWizard: Authentication failed:',
        authResult.error
      );
    }
  };

  // Role selection handler with wallet creation
  const handleRoleSelected = async (role: 'member' | 'captain') => {
    if (!authenticatedUser) return;

    setIsProcessing(true);
    setProcessingMessage(`Setting up your ${role} account...`);

    try {
      console.log(
        'OnboardingWizard: Starting role selection and wallet creation for user:',
        authenticatedUser.user?.id
      );
      console.log(
        'OnboardingWizard: Full auth user object:',
        authenticatedUser
      );

      // Step 1: Create personal wallet if needed
      let walletAddress: string | undefined;
      if (authenticatedUser.needsWalletCreation) {
        setProcessingMessage('Creating your Bitcoin wallet...');
        console.log('OnboardingWizard: Creating personal wallet...');

        const walletResult = await AuthService.createPersonalWallet(
          authenticatedUser.user.id
        );

        if (!walletResult.success) {
          console.error(
            'OnboardingWizard: Failed to create wallet:',
            walletResult.error
          );
          // Don't fail the entire process - user can create wallet later
          console.log(
            'OnboardingWizard: Continuing without wallet - user can create it later'
          );
          setProcessingMessage(`Finalizing your ${role} account...`);
        } else {
          walletAddress = walletResult.lightningAddress;
          console.log(
            'OnboardingWizard: Personal wallet created successfully:',
            walletAddress
          );
          setProcessingMessage(
            `Wallet created! Finalizing your ${role} account...`
          );
        }
      } else {
        setProcessingMessage(`Finalizing your ${role} account...`);
      }

      // Step 2: Update user role in database
      console.log('OnboardingWizard: Updating user role to:', role);
      const updateResult = await AuthService.updateUserRole(
        authenticatedUser.user.id,
        {
          role,
          personalWalletAddress: walletAddress,
        }
      );

      if (updateResult.success) {
        setSelectedRole(role);

        // Update the authenticated user state with new info
        setAuthenticatedUser({
          ...authenticatedUser,
          role,
          personalWalletAddress: walletAddress,
          needsRoleSelection: false,
          needsWalletCreation: !walletAddress, // Still need wallet if creation failed
        });

        console.log('OnboardingWizard: Role selection completed successfully');

        // Go to wallet setup if wallet creation failed, otherwise to permissions
        if (walletAddress) {
          setCurrentStep('permissions');
        } else {
          setCurrentStep('wallet_setup');
        }
      } else {
        console.error(
          'OnboardingWizard: Failed to update user role:',
          updateResult.error
        );
        // Show error message to user
        alert(`Failed to set up your ${role} account: ${updateResult.error}`);
      }
    } catch (error) {
      console.error('OnboardingWizard: Error during role selection:', error);
      alert(
        `An error occurred while setting up your account. Please try again.`
      );
    } finally {
      setIsProcessing(false);
      setProcessingMessage('Setting up your account...');
    }
  };

  // Wallet setup handler
  const handleWalletSetupComplete = async () => {
    if (!authenticatedUser?.user?.id) return;

    setIsProcessing(true);
    setProcessingMessage('Creating your Bitcoin wallet...');

    try {
      console.log(
        'OnboardingWizard: Creating wallet for user:',
        authenticatedUser.user.id
      );

      const walletResult = await AuthService.createPersonalWallet(
        authenticatedUser.user.id
      );

      if (walletResult.success) {
        // Update user state
        setAuthenticatedUser({
          ...authenticatedUser,
          personalWalletAddress: walletResult.lightningAddress,
          needsWalletCreation: false,
        });

        console.log(
          'OnboardingWizard: Wallet created successfully:',
          walletResult.lightningAddress
        );
        setCurrentStep('permissions');
      } else {
        console.error(
          'OnboardingWizard: Failed to create wallet:',
          walletResult.error
        );
        alert(`Failed to create wallet: ${walletResult.error}`);
      }
    } catch (error) {
      console.error('OnboardingWizard: Error during wallet creation:', error);
      alert('An error occurred while creating your wallet. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('Setting up your account...');
    }
  };

  // Helper function to get step number for analytics
  const getStepNumber = (step: OnboardingStep): number => {
    const stepOrder: OnboardingStep[] = [
      'welcome',
      'authentication',
      'role_selection',
      'wallet_setup',
      'permissions',
      'team_selection',
      'setup_complete',
    ];
    return stepOrder.indexOf(step) + 1;
  };

  // Step progress calculation
  const getStepProgress = () => {
    // Only show progress for main steps (skip intermediate steps for cleaner UX)
    const stepOrder: OnboardingStep[] = [
      'welcome',
      'authentication',
      'permissions',
      'team_selection',
      'setup_complete',
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: stepOrder.length,
      progress: ((currentIndex + 1) / stepOrder.length) * 100,
    };
  };

  // Render different step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep onNext={handleNext} onSkip={handleOnboardingSkip} />
        );
      case 'authentication':
        return (
          <AuthenticationStep
            onNext={handleNext}
            onSkip={handleOnboardingSkip}
            onAuthComplete={handleAuthenticationComplete}
            isProcessing={false} // Authentication has its own internal processing state
          />
        );
      case 'role_selection':
        return (
          <RoleSelectionStep
            onNext={handleRoleSelected}
            selectedRole={selectedRole}
          />
        );
      case 'wallet_setup':
        return (
          <OnboardingWalletSetupStep
            onNext={handleWalletSetupComplete}
            onSkip={() => setCurrentStep('permissions')}
          />
        );
      case 'permissions':
        return (
          <PermissionsStep
            onNext={handleNext}
            onSkip={handleSkipTeamSelection}
          />
        );
      case 'team_selection':
        return (
          <TeamDiscoveryScreen
            onClose={handleSkipTeamSelection}
            onTeamJoin={handleTeamJoin}
            onTeamSelect={(team) => console.log('Team preview:', team.name)}
          />
        );
      case 'setup_complete':
        return (
          <SetupCompleteStep
            selectedTeam={selectedTeam}
            selectedRole={selectedRole}
            onComplete={handleOnboardingComplete}
          />
        );
      default:
        return null;
    }
  };

  // Don't show progress for team discovery step and intermediate steps
  const showProgress = ![
    'team_selection',
    'role_selection',
    'wallet_setup',
  ].includes(currentStep);
  const progress = getStepProgress();

  // Show processing overlay when needed
  if (isProcessing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>{processingMessage}</Text>
          <Text style={styles.processingSubtext}>
            This may take a moment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress.progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.current} of {progress.total}
          </Text>
        </View>
      )}

      {/* Step content */}
      {renderStepContent()}
    </SafeAreaView>
  );
};

// Welcome Step Component
const WelcomeStep: React.FC<{
  onNext: () => void;
  onSkip?: () => void;
}> = ({ onNext, onSkip }) => (
  <ScrollView
    style={styles.stepContainer}
    contentContainerStyle={styles.stepContent}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepTitle}>Welcome to RUNSTR</Text>
      <Text style={styles.stepSubtitle}>
        Transform your fitness routine into competitive, Bitcoin-earning
        experiences
      </Text>
    </View>

    <View style={styles.featureList}>
      <Text style={styles.featureItem}>
        • Join teams and compete with runners worldwide
      </Text>
      <Text style={styles.featureItem}>
        • Earn Bitcoin rewards for your workouts
      </Text>
      <Text style={styles.featureItem}>
        • Participate in challenges and events
      </Text>
      <Text style={styles.featureItem}>
        • Sync workouts with Nostr fitness protocols
      </Text>
    </View>

    <View style={styles.stepActions}>
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
      {onSkip && (
        <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
          <Text style={styles.secondaryButtonText}>Skip Setup</Text>
        </TouchableOpacity>
      )}
    </View>
  </ScrollView>
);

// Authentication Step Component
const AuthenticationStep: React.FC<{
  onNext: () => void;
  onSkip?: () => void;
  onAuthComplete?: (authResult: any) => void;
  isProcessing?: boolean;
}> = ({ onNext, onSkip, onAuthComplete, isProcessing }) => {
  const [nsecInput, setNsecInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleNostrAuth = async () => {
    if (!nsecInput.trim()) {
      setAuthError('Please enter your nsec key');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const authResult = await AuthService.signInWithNostr(nsecInput.trim());

      if (authResult.success) {
        onAuthComplete?.(authResult);
      } else {
        setAuthError(authResult.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const authResult = await AuthService.signInWithApple();

      if (authResult.success) {
        onAuthComplete?.(authResult);
      } else {
        setAuthError(authResult.error || 'Apple Sign-In failed');
      }
    } catch (error) {
      console.error('Apple authentication error:', error);
      setAuthError('Apple Sign-In failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const authResult = await AuthService.signInWithGoogle();

      if (authResult.success) {
        onAuthComplete?.(authResult);
      } else {
        setAuthError(authResult.error || 'Google Sign-In failed');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      setAuthError('Google Sign-In failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepContent}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Choose Sign In Method</Text>
        <Text style={styles.stepSubtitle}>
          Secure your account and Bitcoin rewards
        </Text>
      </View>

      <View style={styles.authOptions}>
        {/* NOSTR-ONLY MVP: Apple/Google auth hidden for MVP */}
        {/* 
      <AppleSignInButton 
        onPress={handleAppleAuth}
        style={styles.authButton}
        disabled={isAuthenticating}
      />

      <GoogleSignInButton 
        onPress={handleGoogleAuth}
        style={styles.authButton}
        disabled={isAuthenticating}
      />

      <TouchableOpacity style={[styles.authButton, styles.authButtonDisabled]}>
        <Text style={styles.authButtonTextDisabled}>🔵 Continue with Google (Coming Soon)</Text>
      </TouchableOpacity>
      */}

        <View style={styles.nostrSection}>
          <Text style={styles.nostrLabel}>⚡ Sign in with Nostr</Text>
          <TextInput
            style={styles.nsecInput}
            placeholder="Enter your nsec key..."
            placeholderTextColor={theme.colors.textMuted}
            value={nsecInput}
            onChangeText={setNsecInput}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          {authError && <Text style={styles.errorText}>{authError}</Text>}
          <TouchableOpacity
            style={[
              styles.nostrButton,
              isAuthenticating && styles.nostrButtonDisabled,
            ]}
            onPress={handleNostrAuth}
            disabled={isAuthenticating}
          >
            <Text style={styles.nostrButtonText}>
              {isAuthenticating ? 'Authenticating...' : 'Sign In with Nostr'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stepActions}>
        {onSkip && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

// Permissions Step Component
const PermissionsStep: React.FC<{
  onNext: () => void;
  onSkip: () => void;
}> = ({ onNext, onSkip }) => (
  <ScrollView
    style={styles.stepContainer}
    contentContainerStyle={styles.stepContent}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepTitle}>Enable Fitness Tracking</Text>
      <Text style={styles.stepSubtitle}>
        Allow RUNSTR to sync your Nostr workouts automatically
      </Text>
    </View>

    <View style={styles.permissionsList}>
      <View style={styles.permissionItem}>
        <Text style={styles.permissionTitle}>⚡ Nostr Workout Sync</Text>
        <Text style={styles.permissionDescription}>
          Sync workout notes (kind 1301) from Nostr relays automatically
        </Text>
      </View>

      <View style={styles.permissionItem}>
        <Text style={styles.permissionTitle}>🔔 Push Notifications</Text>
        <Text style={styles.permissionDescription}>
          Get notified about challenges, events, and Bitcoin rewards
        </Text>
      </View>
    </View>

    <View style={styles.stepActions}>
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Enable Permissions</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
        <Text style={styles.secondaryButtonText}>Set Up Later</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

// Setup Complete Step Component
const SetupCompleteStep: React.FC<{
  selectedTeam?: DiscoveryTeam;
  selectedRole?: 'member' | 'captain';
  onComplete: () => void;
}> = ({ selectedTeam, selectedRole, onComplete }) => (
  <ScrollView
    style={styles.stepContainer}
    contentContainerStyle={styles.stepContent}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepTitle}>
        {selectedTeam ? 'Welcome to the Team!' : 'Setup Complete!'}
      </Text>
      <Text style={styles.stepSubtitle}>
        {selectedTeam
          ? `You've joined ${selectedTeam.name} as a ${selectedRole}. Start competing and earning Bitcoin rewards!`
          : `Your ${selectedRole} account is ready! You can join a team anytime from your profile.`}
      </Text>
    </View>

    {selectedTeam && (
      <View style={styles.teamSummary}>
        <Text style={styles.teamSummaryTitle}>{selectedTeam.name}</Text>
        <Text style={styles.teamSummaryPrize}>
          {selectedTeam.prizePool.toLocaleString()} sat prize pool
        </Text>
        <Text style={styles.teamSummaryMembers}>
          {selectedTeam.stats.memberCount} active members
        </Text>
      </View>
    )}

    <View style={styles.stepActions}>
      <TouchableOpacity style={styles.primaryButton} onPress={onComplete}>
        <Text style={styles.primaryButtonText}>Start Competing</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  progressContainer: {
    padding: 20,
    paddingBottom: 10,
  },

  progressBar: {
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },

  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
  },

  progressText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  stepContainer: {
    flex: 1,
  },

  stepContent: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },

  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  featureList: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },

  featureItem: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },

  authOptions: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },

  authButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },

  authButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  permissionsList: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },

  permissionItem: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  permissionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  permissionDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  teamSummary: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    alignItems: 'center',
  },

  teamSummaryTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  teamSummaryPrize: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },

  teamSummaryMembers: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  stepActions: {
    alignSelf: 'stretch',
    gap: 12,
  },

  primaryButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  // Processing overlay styles
  processingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },

  processingText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },

  processingSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Enhanced authentication styles
  authButtonDisabled: {
    backgroundColor: theme.colors.border,
  },

  authButtonTextDisabled: {
    color: theme.colors.textMuted,
  },

  nostrSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  nostrLabel: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },

  nsecInput: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 12,
    textAlign: 'center',
  },

  nostrButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },

  nostrButtonDisabled: {
    backgroundColor: theme.colors.border,
  },

  nostrButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },
});
