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
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/node_modules/react-native',
    'expo-intent-launcher': '<rootDir>/__mocks__/expo-intent-launcher.ts',
    'expo-linking': '<rootDir>/__mocks__/expo-linking.ts',
  },
};
