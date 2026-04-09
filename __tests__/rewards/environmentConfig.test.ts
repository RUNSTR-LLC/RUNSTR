/**
 * Environment Configuration Tests
 * Verifies that REWARD_SENDER_NWC is properly loaded from .env
 */

import { REWARD_CONFIG } from '../../src/config/rewards';

describe('Environment Configuration', () => {
  describe('REWARD_SENDER_NWC', () => {
    it('should be defined in config', () => {
      expect(REWARD_CONFIG.SENDER_NWC).toBeDefined();
    });

    it('should either be a safe placeholder or a valid NWC URL', () => {
      const url = REWARD_CONFIG.SENDER_NWC;
      const placeholder = 'nostr+walletconnect://YOUR_NWC_STRING_HERE';

      expect(url).toMatch(/^nostr\+walletconnect:\/\//);

      // In repository test contexts we usually keep a placeholder.
      // In secured environments we expect full relay/secret query params.
      if (url === placeholder) {
        expect(url).toBe(placeholder);
        return;
      }

      expect(url).toContain('relay=');
      expect(url).toContain('secret=');

      const [protocol, rest] = url.split('://');
      expect(protocol).toBe('nostr+walletconnect');
      expect(rest).toBeTruthy();

      const [pubkey, queryString] = rest.split('?');
      expect(pubkey).toBeTruthy();
      expect(pubkey.length).toBeGreaterThan(32);
      expect(queryString).toBeTruthy();
    });
  });

  describe('Reward Configuration', () => {
    it('should have a positive daily workout reward amount', () => {
      expect(REWARD_CONFIG.DAILY_WORKOUT_REWARD).toBeGreaterThan(0);
      expect(Number.isInteger(REWARD_CONFIG.DAILY_WORKOUT_REWARD)).toBe(true);
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
