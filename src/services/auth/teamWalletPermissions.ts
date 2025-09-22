/**
 * Team Wallet Permissions Service - DEPRECATED
 * Team wallets are no longer used - replaced with P2P NIP-60/61 payments
 * This stub remains for compatibility but returns empty values
 */

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

export class TeamWalletPermissionsService {
  private static instance: TeamWalletPermissionsService;

  static getInstance(): TeamWalletPermissionsService {
    if (!TeamWalletPermissionsService.instance) {
      TeamWalletPermissionsService.instance = new TeamWalletPermissionsService();
    }
    return TeamWalletPermissionsService.instance;
  }

  async checkPermissions(userId: string, teamId: string): Promise<WalletPermissions> {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
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

  async verifyCaptainPermission(userId: string, teamId: string): Promise<boolean> {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
    return false;
  }
}

export default TeamWalletPermissionsService.getInstance();