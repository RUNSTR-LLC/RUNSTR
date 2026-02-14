module.exports = {
  setupFiles: ['<rootDir>/__mocks__/setupJest.js'],
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
    '/node_modules/(?!(@react-native|react-native|react-native-toast-message|@nostr-dev-kit|@noble|expo-.*|@expo|@supabase|@react-navigation)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testEnvironment: 'node',
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
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
    '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.ts',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.ts',
    '^react-native-toast-message$': '<rootDir>/__mocks__/react-native-toast-message.ts',
    '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/react-native-url-polyfill.ts',
  },
};
