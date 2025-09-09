/**
 * Team Wallet Permissions Service
 * Manages access control and permissions for team Bitcoin wallet operations
 * Ensures only authorized users can perform wallet transactions
 */

import { supabase } from '../supabase';
import coinosService from '../coinosService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletPermissions {
  canView: boolean;
  canSend: boolean;
  canReceive: boolean;
  canDistribute: boolean;
  canManage: boolean;
  isCaptain: boolean;
  teamId: string;
  userId: string;
}

export interface TeamWalletAccess {
  hasAccess: boolean;
  walletId?: string;
  walletAddress?: string;
  balance?: number;
  error?: string;
}

export interface PermissionValidation {
  isValid: boolean;
  error?: string;
  permissions?: WalletPermissions;
}

export class TeamWalletPermissionsService {
  private static instance: TeamWalletPermissionsService;
  private permissionCache = new Map<
    string,
    { permissions: WalletPermissions; expires: number }
  >();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): TeamWalletPermissionsService {
    if (!TeamWalletPermissionsService.instance) {
      TeamWalletPermissionsService.instance =
        new TeamWalletPermissionsService();
    }
    return TeamWalletPermissionsService.instance;
  }

  /**
   * Get comprehensive wallet permissions for user and team
   */
  async getWalletPermissions(
    userId: string,
    teamId: string
  ): Promise<WalletPermissions> {
    try {
      // Check cache first
      const cacheKey = `${userId}_${teamId}`;
      const cached = this.permissionCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.permissions;
      }

      // Get team and membership information
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('captain_id, is_active')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return this.createDeniedPermissions(userId, teamId);
      }

      const isCaptain = team.captain_id === userId;

      // Get team membership
      const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('role, is_active, joined_at')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .single();

      const isMember = !memberError && membership?.is_active;

      // Calculate permissions
      const permissions: WalletPermissions = {
        canView: isCaptain || isMember,
        canSend: isCaptain, // Only captains can send from team wallet
        canReceive: isCaptain, // Only captains can generate receive addresses
        canDistribute: isCaptain, // Only captains can distribute rewards
        canManage: isCaptain, // Only captains can manage wallet settings
        isCaptain,
        teamId,
        userId,
      };

      // Cache the permissions
      this.permissionCache.set(cacheKey, {
        permissions,
        expires: Date.now() + this.CACHE_DURATION,
      });

      return permissions;
    } catch (error) {
      console.error('Error getting wallet permissions:', error);
      return this.createDeniedPermissions(userId, teamId);
    }
  }

  /**
   * Validate specific wallet operation permission
   */
  async validateOperation(
    userId: string,
    teamId: string,
    operation: 'view' | 'send' | 'receive' | 'distribute' | 'manage'
  ): Promise<PermissionValidation> {
    try {
      const permissions = await this.getWalletPermissions(userId, teamId);

      let isValid = false;
      switch (operation) {
        case 'view':
          isValid = permissions.canView;
          break;
        case 'send':
          isValid = permissions.canSend;
          break;
        case 'receive':
          isValid = permissions.canReceive;
          break;
        case 'distribute':
          isValid = permissions.canDistribute;
          break;
        case 'manage':
          isValid = permissions.canManage;
          break;
      }

      if (!isValid) {
        const errorMessages = {
          view: 'You must be a team member to view wallet information',
          send: 'Only team captains can send Bitcoin from the team wallet',
          receive:
            'Only team captains can generate receive addresses for the team wallet',
          distribute:
            'Only team captains can distribute rewards to team members',
          manage: 'Only team captains can manage team wallet settings',
        };

        return {
          isValid: false,
          error: errorMessages[operation],
        };
      }

      return {
        isValid: true,
        permissions,
      };
    } catch (error) {
      console.error(`Error validating ${operation} operation:`, error);
      return {
        isValid: false,
        error: 'Permission validation failed. Please try again.',
      };
    }
  }

  /**
   * Get team wallet access with proper credential switching
   */
  async getTeamWalletAccess(
    userId: string,
    teamId: string
  ): Promise<TeamWalletAccess> {
    try {
      // Validate permissions first
      const validation = await this.validateOperation(userId, teamId, 'view');
      if (!validation.isValid) {
        return {
          hasAccess: false,
          error: validation.error,
        };
      }

      // Get team wallet credentials
      const walletCredentials = await this.getTeamWalletCredentials(teamId);
      if (!walletCredentials) {
        return {
          hasAccess: false,
          error: 'Team wallet not found. Please create a team wallet first.',
        };
      }

      // Temporarily switch to team wallet credentials
      const originalCredentials = await coinosService.getCurrentCredentials();
      await coinosService.switchToTeamWallet(teamId);

      try {
        // Get wallet info
        const balance = await coinosService.getWalletBalance();
        const walletInfo = await coinosService.getWalletInfo();

        return {
          hasAccess: true,
          walletId: walletCredentials.walletId,
          walletAddress: walletInfo?.lightningAddress,
          balance: balance.total,
        };
      } finally {
        // Always restore original credentials
        if (originalCredentials) {
          await coinosService.restoreCredentials(originalCredentials);
        }
      }
    } catch (error) {
      console.error('Error getting team wallet access:', error);
      return {
        hasAccess: false,
        error: 'Failed to access team wallet. Please try again.',
      };
    }
  }

  /**
   * Check if user can perform distribution to specific recipient
   */
  async canDistributeTo(
    captainId: string,
    teamId: string,
    recipientId: string
  ): Promise<{ canDistribute: boolean; error?: string }> {
    try {
      // Validate captain permissions
      const validation = await this.validateOperation(
        captainId,
        teamId,
        'distribute'
      );
      if (!validation.isValid) {
        return { canDistribute: false, error: validation.error };
      }

      // Check if recipient is team member
      const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('is_active')
        .eq('user_id', recipientId)
        .eq('team_id', teamId)
        .single();

      if (memberError || !membership?.is_active) {
        return {
          canDistribute: false,
          error: 'Recipient is not an active team member',
        };
      }

      // Check if recipient has a personal wallet to receive funds
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('personal_wallet_address')
        .eq('id', recipientId)
        .single();

      if (userError || !user?.personal_wallet_address) {
        return {
          canDistribute: false,
          error: 'Recipient does not have a personal wallet to receive rewards',
        };
      }

      return { canDistribute: true };
    } catch (error) {
      console.error('Error validating distribution permission:', error);
      return {
        canDistribute: false,
        error: 'Failed to validate distribution permissions',
      };
    }
  }

  /**
   * Validate batch distribution permissions
   */
  async validateBatchDistribution(
    captainId: string,
    teamId: string,
    recipientIds: string[]
  ): Promise<{
    isValid: boolean;
    validRecipients: string[];
    invalidRecipients: { id: string; reason: string }[];
    error?: string;
  }> {
    try {
      // Validate captain permissions
      const validation = await this.validateOperation(
        captainId,
        teamId,
        'distribute'
      );
      if (!validation.isValid) {
        return {
          isValid: false,
          validRecipients: [],
          invalidRecipients: recipientIds.map((id) => ({
            id,
            reason: validation.error || 'Permission denied',
          })),
          error: validation.error,
        };
      }

      const validRecipients: string[] = [];
      const invalidRecipients: { id: string; reason: string }[] = [];

      // Check each recipient
      for (const recipientId of recipientIds) {
        const canDistribute = await this.canDistributeTo(
          captainId,
          teamId,
          recipientId
        );
        if (canDistribute.canDistribute) {
          validRecipients.push(recipientId);
        } else {
          invalidRecipients.push({
            id: recipientId,
            reason: canDistribute.error || 'Distribution not allowed',
          });
        }
      }

      return {
        isValid: validRecipients.length > 0,
        validRecipients,
        invalidRecipients,
      };
    } catch (error) {
      console.error('Error validating batch distribution:', error);
      return {
        isValid: false,
        validRecipients: [],
        invalidRecipients: recipientIds.map((id) => ({
          id,
          reason: 'Validation failed',
        })),
        error: 'Failed to validate batch distribution permissions',
      };
    }
  }

  /**
   * Clear permissions cache for user/team
   */
  clearPermissionsCache(userId?: string, teamId?: string): void {
    if (userId && teamId) {
      this.permissionCache.delete(`${userId}_${teamId}`);
    } else {
      // Clear entire cache
      this.permissionCache.clear();
    }
  }

  /**
   * Get team wallet credentials from secure storage
   */
  private async getTeamWalletCredentials(teamId: string): Promise<{
    walletId: string;
    username: string;
    password: string;
  } | null> {
    try {
      // Try to get from database first
      const { data: team, error } = await supabase
        .from('teams')
        .select('wallet_id, wallet_username, wallet_password')
        .eq('id', teamId)
        .single();

      if (error || !team?.wallet_id) {
        // Fallback to AsyncStorage
        const stored = await AsyncStorage.getItem(`team_wallet_${teamId}`);
        if (stored) {
          return JSON.parse(stored);
        }
        return null;
      }

      return {
        walletId: team.wallet_id,
        username: team.wallet_username,
        password: team.wallet_password,
      };
    } catch (error) {
      console.error('Error getting team wallet credentials:', error);
      return null;
    }
  }

  /**
   * Create denied permissions object
   */
  private createDeniedPermissions(
    userId: string,
    teamId: string
  ): WalletPermissions {
    return {
      canView: false,
      canSend: false,
      canReceive: false,
      canDistribute: false,
      canManage: false,
      isCaptain: false,
      teamId,
      userId,
    };
  }

  /**
   * Check if team has a wallet configured
   */
  async teamHasWallet(teamId: string): Promise<boolean> {
    try {
      const credentials = await this.getTeamWalletCredentials(teamId);
      return credentials !== null;
    } catch (error) {
      console.error('Error checking team wallet:', error);
      return false;
    }
  }

  /**
   * Get team wallet balance (requires view permissions)
   */
  async getTeamWalletBalance(
    userId: string,
    teamId: string
  ): Promise<number | null> {
    try {
      const validation = await this.validateOperation(userId, teamId, 'view');
      if (!validation.isValid) {
        console.log(
          `User ${userId} denied wallet balance access for team ${teamId}`
        );
        return null;
      }

      const walletAccess = await this.getTeamWalletAccess(userId, teamId);
      return walletAccess.hasAccess ? walletAccess.balance || 0 : null;
    } catch (error) {
      console.error('Error getting team wallet balance:', error);
      return null;
    }
  }
}

export default TeamWalletPermissionsService.getInstance();
