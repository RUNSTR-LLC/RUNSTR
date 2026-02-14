/**
 * Mock for expo-constants
 * Used in tests to simulate Expo constants
 */

export default {
  expoConfig: {
    name: 'runstr',
    slug: 'runstr',
    version: '1.0.0',
    extra: {},
  },
  manifest: null,
  manifest2: null,
  executionEnvironment: 'standalone',
  appOwnership: null,
  isHeadless: false,
  sessionId: 'test-session-id',
  installationId: 'test-installation-id',
  isDevice: true,
  platform: {
    ios: {},
    android: {},
  },
  getWebViewUserAgentAsync: jest.fn().mockResolvedValue('test-user-agent'),
};
