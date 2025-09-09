/**
 * CoinOS Service - React Native Implementation
 * Lightning Network wallet integration via CoinOS API
 * Based on Level Fitness iOS implementation patterns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// CoinOS API Configuration
const COINOS_API_BASE =
  process.env.EXPO_PUBLIC_COINOS_API_BASE || 'https://coinos.io/api';
const RUNSTR_LIGHTNING_ADDRESS =
  process.env.EXPO_PUBLIC_RUNSTR_LIGHTNING_ADDRESS || 'RUNSTR@coinos.io';
const EXIT_FEE_AMOUNT = 2000; // sats

// Storage keys for CoinOS credentials (following Level Fitness pattern)
const STORAGE_KEYS = {
  COINOS_USERNAME: '@runstr:coinos_username',
  COINOS_PASSWORD: '@runstr:coinos_password',
  COINOS_AUTH_TOKEN: '@runstr:coinos_auth_token',
  TEAM_WALLET_PREFIX: '@runstr:team_wallet_',
} as const;

// Types matching Level Fitness patterns exactly
export interface CoinOSWallet {
  id: string;
  userId: string;
  provider: 'coinos';
  balance: number;
  lightningAddress: string; // username@coinos.io
  createdAt: Date;
}

export interface WalletBalance {
  lightning: number;
  onchain: number;
  liquid: number;
  total: number;
}

export interface LightningInvoice {
  id: string;
  paymentRequest: string;
  amount: number;
  memo: string;
  status: 'pending' | 'paid' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface PaymentResult {
  success: boolean;
  paymentHash: string;
  transactionId?: string;
  preimage?: string;
  feePaid: number;
  timestamp: Date;
  error?: string;
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: CoinOSWallet;
  error?: string;
}

export interface TeamWalletCredentials {
  username: string;
  password: string;
  token: string;
}

export interface PaymentCoordinationInfo {
  userId: string;
  lightningAddress: string;
  currentBalance: number;
  coinOSUsername: string;
  lastUpdated: Date;
}

export interface CoinOSTransaction {
  id: string;
  amount: number;
  type: string;
  memo: string;
  confirmed: boolean;
  createdAt: Date;
  hash: string;
}

// CoinOS API Request/Response Types
interface CoinOSAuthResponse {
  token: string;
  id?: string;
}

interface CoinOSUserInfo {
  id?: string;
  username?: string;
  balance?: number;
  currency?: string;
}

interface CoinOSInvoiceResponse {
  amount?: number;
  hash?: string;
  text?: string; // Payment request
  uid?: string;
  received?: number;
  created?: number;
}

interface CoinOSPaymentResponse {
  confirmed?: boolean;
  hash?: string;
  preimage?: string;
  fee?: number;
}

interface CoinOSRegisterRequest {
  user: {
    username: string;
    password: string;
  };
}

interface CoinOSInvoiceRequest {
  invoice: {
    amount: number;
    type: string;
  };
}

interface CoinOSPaymentRequest {
  payreq: string;
}

// CoinOS Error Types
export enum CoinOSError {
  NotAuthenticated = 'COINOS_NOT_AUTHENTICATED',
  InvalidResponse = 'COINOS_INVALID_RESPONSE',
  ApiError = 'COINOS_API_ERROR',
  NetworkError = 'COINOS_NETWORK_ERROR',
  WalletCreationFailed = 'COINOS_WALLET_CREATION_FAILED',
  ServiceUnavailable = 'COINOS_SERVICE_UNAVAILABLE',
  InsufficientBalance = 'COINOS_INSUFFICIENT_BALANCE',
  PaymentTimeout = 'COINOS_PAYMENT_TIMEOUT',
  InvoiceExpired = 'COINOS_INVOICE_EXPIRED',
  PaymentVerificationFailed = 'COINOS_PAYMENT_VERIFICATION_FAILED',
}

class CoinOSService {
  private static instance: CoinOSService;
  private authToken?: string;

  private constructor() {
    this.loadAuthToken();
  }

  static getInstance(): CoinOSService {
    if (!CoinOSService.instance) {
      CoinOSService.instance = new CoinOSService();
    }
    return CoinOSService.instance;
  }

  // MARK: - Authentication Management

  private async loadAuthToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.COINOS_AUTH_TOKEN);
      if (token) {
        this.authToken = token;
        console.log('CoinOSService: Initialized with existing auth token');
      } else {
        console.log(
          'CoinOSService: Initialized without auth token - user needs to create wallet'
        );
      }
    } catch (error) {
      console.error('CoinOSService: Error loading auth token:', error);
    }
  }

  private async setAuthToken(token: string): Promise<void> {
    this.authToken = token;
    await AsyncStorage.setItem(STORAGE_KEYS.COINOS_AUTH_TOKEN, token);
    console.log('CoinOSService: Auth token set successfully');
  }

  async clearAuthToken(): Promise<void> {
    this.authToken = undefined;
    await AsyncStorage.removeItem(STORAGE_KEYS.COINOS_AUTH_TOKEN);
    console.log('CoinOSService: Auth token cleared');
  }

  private getCurrentAuthToken(): string | undefined {
    return this.authToken;
  }

  // MARK: - Service Availability

  async checkServiceAvailability(): Promise<void> {
    try {
      const response = await fetch(`${COINOS_API_BASE}/ping`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`CoinOS service returned status ${response.status}`);
      }

      console.log('CoinOSService: Service availability check passed');
    } catch (error) {
      console.error('CoinOSService: Service availability check failed:', error);
      throw CoinOSError.ServiceUnavailable;
    }
  }

  // MARK: - User Registration and Login (Level Fitness Pattern)

  private async registerUser(
    username: string,
    password: string
  ): Promise<CoinOSAuthResponse> {
    console.log(`CoinOSService: Registering user with username: ${username}`);

    const requestBody: CoinOSRegisterRequest = {
      user: { username, password },
    };

    try {
      const response = await fetch(`${COINOS_API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `CoinOSService: Registration failed with status ${response.status}: ${errorText}`
        );
        throw CoinOSError.ApiError;
      }

      const authResponse: CoinOSAuthResponse = await response.json();
      await this.setAuthToken(authResponse.token);

      console.log('CoinOSService: User registered successfully');
      return authResponse;
    } catch (error) {
      console.error('CoinOSService: Registration error:', error);
      throw CoinOSError.WalletCreationFailed;
    }
  }

  private async loginUser(
    username: string,
    password: string
  ): Promise<CoinOSAuthResponse> {
    try {
      const response = await fetch(`${COINOS_API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw CoinOSError.ApiError;
      }

      const authResponse: CoinOSAuthResponse = await response.json();
      await this.setAuthToken(authResponse.token);

      console.log('CoinOSService: User logged in successfully');
      return authResponse;
    } catch (error) {
      console.error('CoinOSService: Login error:', error);
      throw CoinOSError.NotAuthenticated;
    }
  }

  // MARK: - Wallet Creation for New Users (Level Fitness Pattern)

  async createPersonalWallet(userId: string): Promise<WalletCreationResult> {
    try {
      console.log(`CoinOSService: Creating personal wallet for user ${userId}`);

      // Generate unique CoinOS credentials (Level Fitness pattern)
      const timestamp = String(Date.now()).slice(-8);
      const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
      const cleanUserId = userId.replace(/-/g, '').slice(0, 6);
      const username = `rs${cleanUserId}${timestamp}${randomSuffix}`;
      const password = this.generateSecurePassword();

      console.log(`CoinOSService: Generated username: ${username}`);

      // Register new user with CoinOS
      const authResponse = await this.registerUser(username, password);

      // Get user info
      const userInfo = await this.getCurrentUser();

      const wallet: CoinOSWallet = {
        id: authResponse.id || userId,
        userId,
        provider: 'coinos',
        balance: userInfo?.balance || 0,
        lightningAddress: `${username}@coinos.io`,
        createdAt: new Date(),
      };

      // Store credentials securely
      await AsyncStorage.setItem(STORAGE_KEYS.COINOS_USERNAME, username);
      await AsyncStorage.setItem(STORAGE_KEYS.COINOS_PASSWORD, password);

      console.log(
        `CoinOSService: Successfully created personal wallet: ${wallet.lightningAddress}`
      );

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error(
        `CoinOSService: Failed to create personal wallet for user ${userId}:`,
        error
      );
      return {
        success: false,
        error: 'Failed to create Lightning wallet',
      };
    }
  }

  private generateSecurePassword(): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(
      { length: 16 },
      () => charset[Math.floor(Math.random() * charset.length)]
    ).join('');
  }

  /**
   * Get the next available runstr number (runstr1, runstr2, etc.)
   */
  private async getNextRunstrNumber(): Promise<number> {
    try {
      // Try to get the current counter from AsyncStorage
      const currentCounterStr = await AsyncStorage.getItem(
        '@runstr:runstr_counter'
      );
      let nextNumber = 1;

      if (currentCounterStr) {
        nextNumber = parseInt(currentCounterStr, 10) + 1;
      }

      // Store the updated counter
      await AsyncStorage.setItem(
        '@runstr:runstr_counter',
        nextNumber.toString()
      );

      console.log(
        `CoinOSService: Generated runstr${nextNumber} lightning address`
      );
      return nextNumber;
    } catch (error) {
      console.error('CoinOSService: Error getting runstr number:', error);
      // Fallback to timestamp-based number
      return Date.now() % 10000;
    }
  }

  // MARK: - Lightning Network Operations

  async getCurrentUser(): Promise<CoinOSUserInfo | null> {
    const token = this.getCurrentAuthToken();
    if (!token) {
      throw CoinOSError.NotAuthenticated;
    }

    try {
      const response = await fetch(`${COINOS_API_BASE}/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw CoinOSError.ApiError;
      }

      return await response.json();
    } catch (error) {
      console.error('CoinOSService: Error getting current user:', error);
      throw error;
    }
  }

  async getWalletBalance(): Promise<WalletBalance> {
    const userInfo = await this.getCurrentUser();
    const totalBalance = userInfo?.balance || 0;

    return {
      lightning: totalBalance,
      onchain: 0,
      liquid: 0,
      total: totalBalance,
    };
  }

  async createInvoice(
    amount: number,
    memo: string = ''
  ): Promise<LightningInvoice> {
    const token = this.getCurrentAuthToken();
    if (!token) {
      throw CoinOSError.NotAuthenticated;
    }

    const requestBody: CoinOSInvoiceRequest = {
      invoice: {
        amount,
        type: 'lightning',
      },
    };

    try {
      const response = await fetch(`${COINOS_API_BASE}/invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw CoinOSError.ApiError;
      }

      const invoiceResponse: CoinOSInvoiceResponse = await response.json();

      return {
        id: invoiceResponse.hash || invoiceResponse.uid || '',
        paymentRequest: invoiceResponse.text || '',
        amount,
        memo,
        status:
          invoiceResponse.received && invoiceResponse.received > 0
            ? 'paid'
            : 'pending',
        createdAt: new Date((invoiceResponse.created || Date.now()) * 1000),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      };
    } catch (error) {
      console.error('CoinOSService: Error creating invoice:', error);
      throw error;
    }
  }

  async payInvoice(paymentRequest: string): Promise<PaymentResult> {
    const token = this.getCurrentAuthToken();
    if (!token) {
      throw CoinOSError.NotAuthenticated;
    }

    const requestBody: CoinOSPaymentRequest = {
      payreq: paymentRequest,
    };

    try {
      const response = await fetch(`${COINOS_API_BASE}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw CoinOSError.ApiError;
      }

      const paymentResponse: CoinOSPaymentResponse = await response.json();

      return {
        success: paymentResponse.confirmed || false,
        paymentHash: paymentResponse.hash || '',
        preimage: paymentResponse.preimage,
        feePaid: paymentResponse.fee || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('CoinOSService: Error paying invoice:', error);
      throw error;
    }
  }

  // MARK: - Wallet Credentials Management

  async hasWalletCredentials(): Promise<boolean> {
    try {
      const username = await AsyncStorage.getItem(STORAGE_KEYS.COINOS_USERNAME);
      const token = this.getCurrentAuthToken();
      return !!(username && token);
    } catch (error) {
      return false;
    }
  }

  async getLightningAddress(): Promise<string | null> {
    try {
      const username = await AsyncStorage.getItem(STORAGE_KEYS.COINOS_USERNAME);
      return username ? `${username}@coinos.io` : null;
    } catch (error) {
      return null;
    }
  }

  async initialize(): Promise<void> {
    await this.loadAuthToken();
    console.log('CoinOSService: Service initialized');
  }

  async signOut(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.COINOS_USERNAME,
      STORAGE_KEYS.COINOS_PASSWORD,
      STORAGE_KEYS.COINOS_AUTH_TOKEN,
    ]);
    this.authToken = undefined;
    console.log('CoinOSService: Signed out and cleared credentials');
  }

  // MARK: - Team Wallet Operations (Level Fitness Pattern)

  async createTeamWallet(teamId: string): Promise<WalletCreationResult> {
    try {
      console.log(`CoinOSService: Creating team wallet for team ${teamId}`);

      // Generate runstr1, runstr2, runstr3... pattern
      const runstrNumber = await this.getNextRunstrNumber();
      const username = `runstr${runstrNumber}`;
      const password = this.generateSecurePassword();

      // Register team wallet
      const authResponse = await this.registerUser(username, password);
      const userInfo = await this.getCurrentUser();

      const wallet: CoinOSWallet = {
        id: authResponse.id || teamId,
        userId: teamId, // Using teamId for team wallets
        provider: 'coinos',
        balance: userInfo?.balance || 0,
        lightningAddress: `${username}@coinos.io`,
        createdAt: new Date(),
      };

      // Store team wallet credentials with team prefix
      const teamKey = `${STORAGE_KEYS.TEAM_WALLET_PREFIX}${teamId}`;
      await AsyncStorage.setItem(`${teamKey}_username`, username);
      await AsyncStorage.setItem(`${teamKey}_password`, password);
      await AsyncStorage.setItem(`${teamKey}_token`, authResponse.token);

      console.log(
        `CoinOSService: Successfully created team wallet: ${wallet.lightningAddress}`
      );

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error(
        `CoinOSService: Failed to create team wallet for team ${teamId}:`,
        error
      );
      return {
        success: false,
        error: 'Failed to create team wallet',
      };
    }
  }

  async sendPayment(
    lightningAddress: string,
    amount: number,
    memo: string = '',
    senderWalletId?: string
  ): Promise<PaymentResult> {
    console.log(
      `CoinOSService: Sending ${amount} sats to ${lightningAddress} from wallet ${senderWalletId}`
    );

    try {
      // In production, this would resolve the Lightning address to a payment request
      // and pay it using the CoinOS API. For now, return a mock successful result
      const transactionId = `txn_${Date.now()}`;
      const result: PaymentResult = {
        success: true,
        paymentHash: `payment_${Date.now()}`,
        transactionId,
        preimage: undefined,
        feePaid: Math.max(1, Math.floor(amount * 0.001)), // 0.1% fee, minimum 1 sat
        timestamp: new Date(),
      };

      console.log(
        `CoinOSService: Payment sent successfully: ${result.paymentHash}`
      );
      return result;
    } catch (error) {
      console.error('CoinOSService: Payment failed:', error);
      return {
        success: false,
        paymentHash: '',
        transactionId: undefined,
        preimage: undefined,
        feePaid: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  // MARK: - Credential Management for Team Operations

  /**
   * Get current user credentials for restoration later
   */
  async getCurrentCredentials(): Promise<TeamWalletCredentials | null> {
    try {
      const username = await AsyncStorage.getItem(STORAGE_KEYS.COINOS_USERNAME);
      const password = await AsyncStorage.getItem(STORAGE_KEYS.COINOS_PASSWORD);
      const token = this.getCurrentAuthToken();

      if (username && password && token) {
        return { username, password, token };
      }
      return null;
    } catch (error) {
      console.error('CoinOSService: Error getting current credentials:', error);
      return null;
    }
  }

  /**
   * Switch to team wallet credentials temporarily
   */
  async switchToTeamWallet(teamId: string): Promise<void> {
    try {
      const teamKey = `${STORAGE_KEYS.TEAM_WALLET_PREFIX}${teamId}`;
      const username = await AsyncStorage.getItem(`${teamKey}_username`);
      const password = await AsyncStorage.getItem(`${teamKey}_password`);
      const token = await AsyncStorage.getItem(`${teamKey}_token`);

      if (!username || !password || !token) {
        throw new Error(`Team wallet credentials not found for team ${teamId}`);
      }

      // Switch to team wallet credentials
      await this.setAuthToken(token);
      console.log(`CoinOSService: Switched to team wallet for team ${teamId}`);
    } catch (error) {
      console.error(
        `CoinOSService: Error switching to team wallet ${teamId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get detailed wallet information
   */
  async getWalletInfo(): Promise<
    CoinOSUserInfo & { lightningAddress?: string }
  > {
    const userInfo = await this.getCurrentUser();
    const lightningAddress = await this.getLightningAddress();

    return {
      ...userInfo,
      lightningAddress: lightningAddress || undefined,
    };
  }

  /**
   * Restore previous credentials after team wallet operations
   */
  async restoreCredentials(credentials: TeamWalletCredentials): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.COINOS_USERNAME,
        credentials.username
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.COINOS_PASSWORD,
        credentials.password
      );
      await this.setAuthToken(credentials.token);
      console.log('CoinOSService: Credentials restored successfully');
    } catch (error) {
      console.error('CoinOSService: Error restoring credentials:', error);
      throw error;
    }
  }

  // MARK: - Team Wallet Operations

  /**
   * Get team wallet balance by temporarily switching to team credentials
   */
  async getTeamWalletBalance(teamId: string): Promise<WalletBalance | null> {
    try {
      // Check if team wallet credentials exist
      const teamCredentialsKey = `${STORAGE_KEYS.TEAM_WALLET_PREFIX}${teamId}_credentials`;
      const credentialsData = await AsyncStorage.getItem(teamCredentialsKey);

      if (!credentialsData) {
        console.warn(
          `CoinOSService: No wallet credentials found for team ${teamId}`
        );
        return null;
      }

      const credentials = JSON.parse(credentialsData);

      // Store current user credentials temporarily
      const currentToken = this.getCurrentAuthToken();

      try {
        // Switch to team wallet credentials
        this.setAuthToken(credentials.token);

        // Fetch team wallet balance
        const balance = await this.getWalletBalance();

        // Restore user credentials
        if (currentToken) {
          this.setAuthToken(currentToken);
        }

        return balance;
      } catch (error) {
        // Ensure we restore user credentials on error
        if (currentToken) {
          this.setAuthToken(currentToken);
        }
        throw error;
      }
    } catch (error) {
      console.error(
        `CoinOSService: Failed to get team wallet balance for ${teamId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Check if team has wallet credentials stored
   */
  async hasTeamWallet(teamId: string): Promise<boolean> {
    try {
      const teamCredentialsKey = `${STORAGE_KEYS.TEAM_WALLET_PREFIX}${teamId}_credentials`;
      const credentialsData = await AsyncStorage.getItem(teamCredentialsKey);
      return !!credentialsData;
    } catch (error) {
      console.error(
        `CoinOSService: Error checking team wallet for ${teamId}:`,
        error
      );
      return false;
    }
  }

  // MARK: - Exit Fee Operations

  async processExitFee(
    amount: number = EXIT_FEE_AMOUNT
  ): Promise<PaymentResult> {
    console.log(
      `CoinOSService: Processing exit fee payment of ${amount} sats to ${RUNSTR_LIGHTNING_ADDRESS}`
    );

    try {
      // In production, this would create an invoice to RUNSTR@coinos.io and pay it
      // For now, return a mock successful result
      const transactionId = `exit_txn_${Date.now()}`;
      const result: PaymentResult = {
        success: true,
        paymentHash: `exit_fee_${Date.now()}`,
        transactionId,
        preimage: undefined,
        feePaid: 1, // 1 sat fee
        timestamp: new Date(),
      };

      console.log(
        `CoinOSService: Exit fee payment completed: ${result.paymentHash}`
      );
      return result;
    } catch (error) {
      console.error('CoinOSService: Exit fee payment failed:', error);
      return {
        success: false,
        paymentHash: '',
        transactionId: undefined,
        preimage: undefined,
        feePaid: 0,
        timestamp: new Date(),
        error:
          error instanceof Error ? error.message : 'Exit fee payment failed',
      };
    }
  }
}

// Export singleton instance
const coinosService = CoinOSService.getInstance();
export default coinosService;
