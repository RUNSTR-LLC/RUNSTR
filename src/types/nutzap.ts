/**
 * NutZap Type Definitions
 * NIP-60/61 ecash wallet types for RUNSTR
 */

import { Proof } from '@cashu/cashu-ts';

// Wallet state returned by service
export interface NutzapWalletState {
  balance: number;
  mint: string;
  proofs: Proof[];
  pubkey: string;
  created: boolean;
}

// Result of sending a nutzap
export interface NutzapSendResult {
  success: boolean;
  error?: string;
  txId?: string;
  amount?: number;
}

// Result of claiming nutzaps
export interface NutzapClaimResult {
  claimed: number;
  total: number;
  errors?: string[];
}

// NIP-60 wallet info event content
export interface WalletInfoContent {
  mints: string[];
  name: string;
  unit: string;
  balance: number;
  description?: string;
}

// NIP-61 nutzap event
export interface NutzapEvent {
  kind: 9321;
  pubkey: string;
  content: string; // memo
  tags: Array<[string, string]>;
  created_at: number;
  id: string;
  sig: string;
}

// Decoded nutzap data
export interface DecodedNutzap {
  amount: number;
  unit: string;
  memo: string;
  token: string;
  mint: string;
  fromPubkey: string;
  toPubkey: string;
  timestamp: number;
}

// Mint info
export interface MintInfo {
  url: string;
  name?: string;
  pubkey?: string;
  units: string[];
  nuts: string[]; // Supported NUTs (features)
  contact?: string[];
}

// Transaction history item
export interface NutzapTransaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  pubkey: string; // Other party's pubkey
  memo: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

// Wallet backup data
export interface WalletBackup {
  version: number;
  mint: string;
  proofs: Proof[];
  created: number;
  encrypted?: boolean;
}

// Captain reward payment
export interface CaptainReward {
  teamId: string;
  memberPubkey: string;
  amount: number;
  reason: string;
  competitionId?: string;
}

// Competition prize distribution
export interface PrizeDistribution {
  competitionId: string;
  winners: Array<{
    pubkey: string;
    amount: number;
    place: number;
  }>;
  totalPrizePool: number;
  distributedAt?: Date;
}

// Wallet statistics
export interface WalletStats {
  totalSent: number;
  totalReceived: number;
  transactionCount: number;
  uniqueContacts: number;
  averageTransactionSize: number;
}

// Error types
export enum NutzapError {
  WALLET_NOT_INITIALIZED = 'WALLET_NOT_INITIALIZED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  MINT_UNAVAILABLE = 'MINT_UNAVAILABLE',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RELAY_CONNECTION_FAILED = 'RELAY_CONNECTION_FAILED',
  EVENT_PUBLISH_FAILED = 'EVENT_PUBLISH_FAILED',
  CLAIM_FAILED = 'CLAIM_FAILED',
  ALREADY_CLAIMED = 'ALREADY_CLAIMED',
}

// Service configuration
export interface NutzapConfig {
  defaultMint: string;
  autoClaimInterval: number; // milliseconds
  relays: string[];
  maxRetries: number;
  timeout: number; // milliseconds
}