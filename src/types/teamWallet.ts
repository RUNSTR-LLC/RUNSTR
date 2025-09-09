/**
 * Team Wallet Types
 * TypeScript definitions specific to team Bitcoin wallets and operations
 * Extends existing bitcoin.ts types for team-specific functionality
 */

import {
  CoinOSWallet,
  WalletBalance,
  PaymentResult,
} from '../services/coinosService';
import { Transaction } from './bitcoin';

// Team Wallet Core Types
export interface TeamWallet extends Omit<CoinOSWallet, 'userId'> {
  teamId: string;
  captainId: string;
  walletId: string; // CoinOS wallet ID
  status: TeamWalletStatus;
}

export type TeamWalletStatus = 'creating' | 'active' | 'inactive' | 'error';

// Team Wallet Creation Types
export interface TeamWalletCreationData {
  teamId: string;
  captainId: string;
  teamName: string; // For generating wallet username
}

export interface TeamWalletCreationResult {
  success: boolean;
  wallet?: TeamWallet;
  error?: string;
  credentials?: TeamWalletCredentials;
}

export interface TeamWalletCredentials {
  username: string;
  password: string;
  token: string;
  lightningAddress: string; // username@coinos.io
}

// Team Wallet Operations Types
export interface TeamWalletBalance extends WalletBalance {
  teamId: string;
  lastUpdated: Date;
  pendingDistributions: number; // Number of pending reward distributions
  reservedBalance: number; // Balance reserved for upcoming events
}

export interface TeamTransaction extends Transaction {
  teamId: string;
  category: 'funding' | 'distribution' | 'fee' | 'refund';
  competitionId?: string; // Related event/challenge/league ID
  recipientCount?: number; // For distribution transactions
}

// Team Reward Distribution Types
export interface RewardDistribution {
  id: string;
  teamId: string;
  competitionId: string;
  competitionType: 'event' | 'challenge' | 'league';
  totalAmount: number; // Total sats to distribute
  recipients: RewardRecipient[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  transactionIds: string[]; // Individual payment transaction IDs
}

export interface RewardRecipient {
  userId: string;
  userName: string;
  lightningAddress: string;
  amount: number; // sats
  rank?: number; // For competition rankings
  status: 'pending' | 'sent' | 'failed';
  transactionId?: string;
  error?: string;
}

// Team Wallet Access Control
export type TeamWalletPermission = 'view' | 'fund' | 'distribute' | 'manage';

export interface TeamWalletAccessRequest {
  teamId: string;
  userId: string;
  permission: TeamWalletPermission;
}

// Team Wallet UI State Types
export interface TeamWalletUIState {
  balance: TeamWalletBalance | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  pendingDistributions: RewardDistribution[];
}

// Team Wallet Hook Types
export interface UseTeamWalletResult {
  // State
  wallet: TeamWallet | null;
  balance: TeamWalletBalance | null;
  transactions: TeamTransaction[];
  distributions: RewardDistribution[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createWallet: (
    data: TeamWalletCreationData
  ) => Promise<TeamWalletCreationResult>;
  refreshBalance: () => Promise<void>;
  fundWallet: (
    amount: number,
    paymentRequest: string
  ) => Promise<PaymentResult>;
  distributeRewards: (
    distribution: Omit<RewardDistribution, 'id' | 'createdAt' | 'status'>
  ) => Promise<void>;

  // Permissions
  hasPermission: (permission: TeamWalletPermission) => boolean;
  verifyAccess: (userId: string) => Promise<boolean>;
}

// CoinOS Integration Types (Team-specific)
export interface TeamCoinOSCredentials {
  teamId: string;
  username: string;
  password: string;
  token: string;
  createdAt: Date;
  lastUsed: Date;
}

// Storage Keys for Team Wallets
export const TEAM_WALLET_STORAGE_KEYS = {
  CREDENTIALS: (teamId: string) => `@runstr:team_wallet_${teamId}_credentials`,
  BALANCE: (teamId: string) => `@runstr:team_wallet_${teamId}_balance`,
  TRANSACTIONS: (teamId: string) =>
    `@runstr:team_wallet_${teamId}_transactions`,
  DISTRIBUTIONS: (teamId: string) =>
    `@runstr:team_wallet_${teamId}_distributions`,
} as const;

// Error Types
export enum TeamWalletError {
  CREATION_FAILED = 'TEAM_WALLET_CREATION_FAILED',
  ACCESS_DENIED = 'TEAM_WALLET_ACCESS_DENIED',
  INSUFFICIENT_FUNDS = 'TEAM_WALLET_INSUFFICIENT_FUNDS',
  DISTRIBUTION_FAILED = 'TEAM_WALLET_DISTRIBUTION_FAILED',
  INVALID_RECIPIENT = 'TEAM_WALLET_INVALID_RECIPIENT',
  CAPTAIN_REQUIRED = 'TEAM_WALLET_CAPTAIN_REQUIRED',
}
