/**
 * Phase 1 Test Runner
 * Tests the NutZap wallet implementation
 */

// Mock React Native modules for Node.js environment
const mockAsyncStorage = (() => {
  let store = {};
  return {
    getItem: async (key) => store[key] || null,
    setItem: async (key, value) => { store[key] = value; },
    removeItem: async (key) => { delete store[key]; },
    multiRemove: async (keys) => { keys.forEach(key => delete store[key]); },
    clear: async () => { store = {}; }
  };
})();

// Set up module mocks before imports
require('module').Module._extensions['.ts'] = require('module').Module._extensions['.js'];

global.AsyncStorage = mockAsyncStorage;

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock fetch for mint connections
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      nuts: {
        4: { methods: [{ method: 'bolt11', unit: 'sat' }] }
      },
      keysets: [{
        id: '00456a94ab4e1c46',
        unit: 'sat',
        active: true
      }]
    })
  })
);

// Mock WebSocket for NDK
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
  send() {}
  close() {}
};

console.log('Starting NutZap Phase 1 Tests...\n');

// Import and run the actual test
import('./src/services/nutzap/testPhase1.ts')
  .then(module => {
    console.log('Test module loaded successfully');
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });