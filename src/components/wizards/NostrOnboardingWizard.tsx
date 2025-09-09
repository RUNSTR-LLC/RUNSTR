/**
 * NostrOnboardingWizard - Streamlined 3-step Nostr-first onboarding
 * Step 1: Nostr Authentication → Step 2: Profile Import → Step 3: Role Selection
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
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { DiscoveryTeam, TeamCreationData, DifficultyLevel } from '../../types';
import { NostrProfile } from '../../services/nostr/NostrProfileService';
import { AuthService } from '../../services/auth/authService';
import { TeamService } from '../../services/teamService';
import { useUserStore } from '../../store/userStore';
import { RoleSelectionStep } from './steps/RoleSelectionStep';
import { ProfileImportScreen } from '../../screens/ProfileImportScreen';
import { NostrConnectionStatus } from '../ui/NostrConnectionStatus';
import { TeamDiscoveryScreen } from '../../screens/TeamDiscoveryScreen';
import { TeamCreationWizard } from './TeamCreationWizard';
import {
  nsecToNpub,
  generateNostrKeyPair,
  validateNsec,
  normalizeNsecInput,
} from '../../utils/nostr';

type OnboardingStep = 'auth' | 'profile' | 'role' | 'team_action';

interface NostrOnboardingWizardProps {
  onComplete: (data: {
    selectedTeam?: DiscoveryTeam;
    selectedRole?: 'member' | 'captain';
    authenticated?: boolean;
    profile?: NostrProfile;
  }) => void;
  onSkip?: () => void;
}

export const NostrOnboardingWizard: React.FC<NostrOnboardingWizardProps> = ({
  onComplete,
  onSkip,
}) => {
  // User store for loading user data
  const { loadUser } = useUserStore();

  // Step tracking
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth');

  // Auth state
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    'member' | 'captain' | undefined
  >();
  const [selectedTeam, setSelectedTeam] = useState<DiscoveryTeam | undefined>();

  const stepTitles = {
    auth: 'Connect Your Identity',
    profile: 'Import Your Profile',
    role: 'Choose Your Role',
    team_action:
      selectedRole === 'captain' ? 'Create Your Team' : 'Join a Team',
  };

  const getStepNumber = () => {
    const steps = ['auth', 'profile', 'role', 'team_action'];
    return steps.indexOf(currentStep) + 1;
  };

  // Step 1: Authentication Complete - Skip to completion for Phase 1
  const handleAuthComplete = async (authResult: any) => {
    console.log('NostrOnboarding: Auth completed', authResult.success);

    if (authResult.success) {
      setAuthenticatedUser(authResult);

      // Load user data into user store
      if (authResult.user?.id) {
        try {
          console.log(
            'NostrOnboarding: Loading user data into store:',
            authResult.user.id
          );
          await loadUser(authResult.user.id);
          console.log('NostrOnboarding: User loaded successfully into store');
        } catch (error) {
          console.error(
            'NostrOnboarding: Failed to load user into store:',
            error
          );
        }
      }

      console.log('🚀 NostrOnboarding: Starting completion process...');

      // Skip multi-step wizard for Phase 1 - go directly to completion
      // Pass authentication status directly since state update might be async
      console.log(
        '🚀 NostrOnboarding: About to call onComplete with authenticated=true'
      );

      try {
        onComplete({
          selectedTeam: undefined, // No team selection in Phase 1
          selectedRole: undefined, // No role selection in Phase 1
          authenticated: true, // User just successfully authenticated
          profile: userProfile || undefined,
        });
        console.log(
          '🚀 NostrOnboarding: onComplete callback invoked successfully'
        );
      } catch (error) {
        console.error('🚀 NostrOnboarding: Error calling onComplete:', error);
      }
    } else {
      console.error('NostrOnboarding: Auth failed:', authResult.error);
    }
  };

  // Step 2: Profile Import Complete
  const handleProfileImported = (profile: NostrProfile) => {
    console.log(
      'NostrOnboarding: Profile imported',
      profile.display_name || profile.name
    );
    setUserProfile(profile);
    setCurrentStep('role');
  };

  const handleProfileSkipped = () => {
    console.log('NostrOnboarding: Profile import skipped');
    setCurrentStep('role');
  };

  // Step 3: Role Selection Complete
  const handleRoleSelected = async (role: 'member' | 'captain') => {
    console.log('NostrOnboarding: Role selected:', role);

    if (!authenticatedUser) return;

    try {
      // Update user role in database
      const updateResult = await AuthService.updateUserRole(
        authenticatedUser.user.id,
        { role }
      );

      if (updateResult.success) {
        setSelectedRole(role);
        setCurrentStep('team_action');
      } else {
        Alert.alert(
          'Error',
          `Failed to set up your ${role} account: ${updateResult.error}`
        );
      }
    } catch (error) {
      console.error('NostrOnboarding: Role selection error:', error);
      Alert.alert('Error', 'Failed to save role selection. Please try again.');
    }
  };

  // Step 4: Team Action Complete (member joins team OR captain creates team)
  const handleTeamJoined = (team: DiscoveryTeam) => {
    console.log('NostrOnboarding: Team joined:', team.name);
    setSelectedTeam(team);
    completeOnboarding();
  };

  const handleTeamCreated = async (teamData: TeamCreationData) => {
    console.log(
      'NostrOnboarding: Team created by captain, creating database record...'
    );

    if (!authenticatedUser?.user?.id) {
      console.error('NostrOnboarding: No authenticated user for team creation');
      Alert.alert('Error', 'Unable to create team - user not authenticated');
      return;
    }

    try {
      // Create the team in the database using TeamService with REAL Nostr identity
      const createResult = await TeamService.createTeam({
        name: teamData.teamName,
        about: teamData.teamAbout,
        captainId: authenticatedUser.user.id,
        captainNpub: authenticatedUser.user.npub, // REAL Nostr public key
        captainName: authenticatedUser.user.name, // REAL user name
        lightningAddress: teamData.walletAddress,
        prizePool: teamData.walletBalance || 0,
      });

      if (createResult.success && createResult.teamId) {
        console.log(
          'NostrOnboarding: Team created successfully:',
          createResult.teamId
        );

        // Reload user data to reflect new team membership
        await loadUser(authenticatedUser.user.id);

        // Create a DiscoveryTeam object for the selected team
        const createdTeam: DiscoveryTeam = {
          id: createResult.teamId,
          name: teamData.teamName,
          description: teamData.teamAbout,
          about: teamData.teamAbout,
          captainId: authenticatedUser.user.id,
          prizePool: teamData.walletBalance || 0,
          memberCount: 1,
          joinReward: 0,
          exitFee: 0,
          avatar: undefined,
          createdAt: new Date().toISOString(),
          isActive: true,
          difficulty: 'intermediate' as DifficultyLevel,
          stats: {
            memberCount: 1,
            avgPace: 'N/A',
            activeEvents: 0,
            activeChallenges: 0,
          },
          recentActivities: [],
          recentPayout: undefined,
          isFeatured: false,
        };

        setSelectedTeam(createdTeam);
        completeOnboarding();
      } else {
        console.error(
          'NostrOnboarding: Team creation failed:',
          createResult.error
        );
        Alert.alert('Error', `Failed to create team: ${createResult.error}`);
      }
    } catch (error) {
      console.error('NostrOnboarding: Unexpected error creating team:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while creating your team. Please try again.'
      );
    }
  };

  const handleSkipTeamAction = () => {
    console.log('NostrOnboarding: Team action skipped');
    completeOnboarding();
  };

  const completeOnboarding = () => {
    onComplete({
      selectedTeam: undefined, // No team selection in Phase 1
      selectedRole: undefined, // No role selection in Phase 1
      authenticated: !!authenticatedUser,
      profile: userProfile || undefined,
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'auth':
        return (
          <NostrAuthStep onAuthComplete={handleAuthComplete} onSkip={onSkip} />
        );

      case 'profile':
        return (
          <ProfileImportScreen
            npub={authenticatedUser?.user?.npub || ''}
            onContinue={handleProfileImported}
            onSkip={handleProfileSkipped}
          />
        );

      case 'role':
        return (
          <RoleSelectionStep
            onNext={handleRoleSelected}
            selectedRole={selectedRole}
          />
        );

      case 'team_action':
        if (selectedRole === 'captain') {
          return (
            <TeamCreationWizard
              currentUser={authenticatedUser?.user}
              onComplete={handleTeamCreated}
              onNavigateToTeam={(teamId) => {
                // NostrOnboardingWizard handles completion differently
                console.log(
                  'NostrOnboarding: Team navigation requested for:',
                  teamId
                );
                // Navigation will be handled by handleTeamCreated -> onComplete callback
              }}
              onCancel={handleSkipTeamAction}
            />
          );
        } else {
          return (
            <TeamDiscoveryScreen
              onClose={handleSkipTeamAction}
              onTeamJoin={handleTeamJoined}
              onTeamSelect={(team) => console.log('Team preview:', team.name)}
            />
          );
        }

      default:
        return <View />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(getStepNumber() / 4) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{getStepNumber()} of 4</Text>
        </View>

        <Text style={styles.stepTitle}>{stepTitles[currentStep]}</Text>

        {/* Connection status for auth and profile steps */}
        {(currentStep === 'auth' || currentStep === 'profile') && (
          <NostrConnectionStatus
            showDetails={false}
            style={styles.connectionStatus}
          />
        )}
      </View>

      {/* Step Content */}
      <View style={styles.content}>{renderStepContent()}</View>
    </SafeAreaView>
  );
};

// Step 1: Nostr Authentication (Nostr-only, no Apple/Google)
const NostrAuthStep: React.FC<{
  onAuthComplete: (result: any) => void;
  onSkip?: () => void;
}> = ({ onAuthComplete, onSkip }) => {
  const [nsecInput, setNsecInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showKeyGenerator, setShowKeyGenerator] = useState(false);

  const handleNostrAuth = async () => {
    if (!nsecInput.trim()) {
      setAuthError('Please enter your nsec key');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const normalizedNsec = normalizeNsecInput(nsecInput.trim());
      const authResult = await AuthService.signInWithNostr(normalizedNsec);

      if (authResult.success) {
        onAuthComplete(authResult);
      } else {
        setAuthError(authResult.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('NostrAuth: Authentication error:', error);
      setAuthError(
        error instanceof Error ? error.message : 'Authentication failed'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGenerateKeys = () => {
    try {
      const keyPair = generateNostrKeyPair();
      setNsecInput(keyPair.nsec);
      setShowKeyGenerator(false);

      Alert.alert(
        'New Keys Generated',
        'New Nostr keys have been generated. Save your private key (nsec) securely!',
        [
          {
            text: 'I Understand',
            onPress: () => {
              // Auto-authenticate with generated keys
              handleNostrAuth();
            },
          },
        ]
      );
    } catch (error) {
      setAuthError('Failed to generate new keys. Please try again.');
    }
  };

  if (showKeyGenerator) {
    return (
      <ScrollView
        style={styles.stepContainer}
        contentContainerStyle={styles.stepContent}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Generate New Nostr Keys</Text>
          <Text style={styles.stepSubtitle}>
            Create a new Nostr identity for RUNSTR
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Your private key (nsec) is like a password. Save it securely -
            you&apos;ll need it to access your account on any device.
          </Text>
        </View>

        <View style={styles.stepActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateKeys}
          >
            <Text style={styles.primaryButtonText}>Generate Keys</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowKeyGenerator(false)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepContent}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Sign in with Nostr</Text>
        <Text style={styles.stepSubtitle}>
          Connect your Nostr identity to import your profile and fitness data
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Private Key (nsec)</Text>
        <TextInput
          style={[styles.textInput, authError && styles.textInputError]}
          value={nsecInput}
          onChangeText={(text) => {
            setNsecInput(text);
            setAuthError(null);
          }}
          placeholder="nsec1..."
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {authError && <Text style={styles.errorText}>{authError}</Text>}
      </View>

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isAuthenticating && styles.buttonDisabled,
          ]}
          onPress={handleNostrAuth}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowKeyGenerator(true)}
        >
          <Text style={styles.secondaryButtonText}>
            New to Nostr? Generate Keys
          </Text>
        </TouchableOpacity>

        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginRight: 12,
  },

  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
    borderRadius: 2,
  },

  progressText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  stepTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  connectionStatus: {
    marginTop: 8,
  },

  content: {
    flex: 1,
  },

  stepContainer: {
    flex: 1,
  },

  stepContent: {
    padding: 20,
    paddingTop: 40,
  },

  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },

  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  inputContainer: {
    marginBottom: 40,
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },

  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.cardBackground,
    fontFamily: 'monospace',
  },

  textInputError: {
    borderColor: '#ff6b6b',
  },

  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginTop: 8,
  },

  warningBox: {
    backgroundColor: '#2a1810',
    borderWidth: 1,
    borderColor: '#ffd43b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    alignItems: 'center',
  },

  warningIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  warningText: {
    fontSize: 14,
    color: '#ffd43b',
    textAlign: 'center',
    lineHeight: 20,
  },

  stepActions: {
    gap: 16,
  },

  primaryButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
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
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  skipButton: {
    padding: 12,
    alignItems: 'center',
  },

  skipButtonText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});
