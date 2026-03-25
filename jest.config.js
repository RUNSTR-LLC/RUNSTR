module.exports = {
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@react-native|react-native|@nostr-dev-kit|@noble|expo-.*|@expo|@supabase)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
    'expo-intent-launcher': '<rootDir>/__mocks__/expo-intent-launcher.ts',
    'expo-linking': '<rootDir>/__mocks__/expo-linking.ts',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.ts',
    '^react-native-toast-message$': '<rootDir>/__mocks__/react-native-toast-message.ts',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.ts',
    '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/react-native-url-polyfill-auto.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
    '\\.(png|jpe?g|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
