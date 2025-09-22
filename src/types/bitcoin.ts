/**
 * Bitcoin and Wallet Types
 * TypeScript definitions for Bitcoin payments, wallets, and Lightning Network
 */

// Wallet Core Types
export interface Wallet {
  id: string;
  userId: string;
  balance: number; // satoshis
  address: string; // Lightning address
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  walletId: string;
  type: 'earn' | 'send' | 'receive';
  amount: number; // satoshis
  description: string;
  fromUserId?: string;
  toUserId?: string;
  challengeId?: string;
  eventId?: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

// Wallet Creation Types
export interface EventCreationData {
  name: string;
  type: 'streaks' | 'distance' | 'speed';
  startDate: string;
  startTime: string;
  prizeAmount: number;
  repeatWeekly: boolean;
}

export interface WalletCreationData {
  email: string;
  country: string;
  age: number;
  termsAccepted: boolean;
  status: 'pending' | 'created' | 'failed';
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Team Analysis Types for Bitcoin Integration
export interface TeamAnalysis {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  memberCount: number;
  avgPace: string;
  competitiveness: number; // 0-1 scale
  expectedEarnings: {
    weekly: number;
    monthly: number;
  };
  competitiveViability: number; // 0-1 how likely to win/place
}
