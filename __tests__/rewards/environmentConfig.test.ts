/**
 * Environment Configuration Tests
 * Verifies that REWARD_CONFIG values are properly set
 * 
 * Note: NWC credential tests are skipped in CI (no real credentials)
 */

import { REWARD_CONFIG } from '../../src/config/rewards';

const isCI = process.env.CI === 'true';
const hasRealNWC = REWARD_CONFIG.SENDER_NWC !== 'nostr+walletconnect://YOUR_NWC_STRING_HERE';

describe('Environment Configuration', () => {
  describe('REWARD_SENDER_NWC', () => {
    it('should be defined in environment', () => {
      expect(REWARD_CONFIG.SENDER_NWC).toBeDefined();
    });

    // Skip NWC validation tests in CI or when using placeholder
    const nwcTest = hasRealNWC && !isCI ? it : it.skip;

    nwcTest('should not be the placeholder value', () => {
      expect(REWARD_CONFIG.SENDER_NWC).not.toBe('nostr+walletconnect://YOUR_NWC_STRING_HERE');
    });

    it('should start with nostr+walletconnect://', () => {
      expect(REWARD_CONFIG.SENDER_NWC).toMatch(/^nostr\+walletconnect:\/\//);
    });

    nwcTest('should contain relay parameter', () => {
      expect(REWARD_CONFIG.SENDER_NWC).toContain('relay=');
    });

    nwcTest('should contain secret parameter', () => {
      expect(REWARD_CONFIG.SENDER_NWC).toContain('secret=');
    });

    nwcTest('should have valid NWC URL structure', () => {
      // Extract components
      const url = REWARD_CONFIG.SENDER_NWC;
      const [protocol, rest] = url.split('://');

      expect(protocol).toBe('nostr+walletconnect');
      expect(rest).toBeTruthy();

      // Should have pubkey and query params
      const [pubkey, queryString] = rest.split('?');
      expect(pubkey).toBeTruthy();
      expect(pubkey.length).toBeGreaterThan(32); // hex pubkey
      expect(queryString).toBeTruthy();
    });
  });

  describe('Reward Configuration', () => {
    it('should have daily workout reward amount of 50 sats', () => {
      expect(REWARD_CONFIG.DAILY_WORKOUT_REWARD).toBe(50);
    });

    it('should have minimum workout distance of 1km', () => {
      expect(REWARD_CONFIG.MIN_WORKOUT_DISTANCE_METERS).toBe(1000);
    });

    it('should have max rewards per day limit', () => {
      expect(REWARD_CONFIG.MAX_REWARDS_PER_DAY).toBe(1);
    });

    it('should have minimum workout duration', () => {
      expect(REWARD_CONFIG.MIN_WORKOUT_DURATION).toBe(60);
    });

    it('should have retry configuration', () => {
      expect(REWARD_CONFIG.MAX_RETRY_ATTEMPTS).toBe(0);
      expect(REWARD_CONFIG.RETRY_DELAY_MS).toBe(0);
    });
  });

  describe('Security', () => {
    it('should not log NWC secret in console', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      // Access the config
      const config = REWARD_CONFIG;

      // Should not have logged the secret
      const logs = consoleSpy.mock.calls.flat().join(' ');
      expect(logs).not.toContain(config.SENDER_NWC);

      consoleSpy.mockRestore();
    });

    it('should export config as const', () => {
      // Verify config object exists and has required fields
      expect(REWARD_CONFIG).toBeDefined();
      expect(REWARD_CONFIG.SENDER_NWC).toBeDefined();
      expect(REWARD_CONFIG.DAILY_WORKOUT_REWARD).toBeDefined();
      expect(REWARD_CONFIG.MIN_WORKOUT_DISTANCE_METERS).toBeDefined();
    });
  });
});
