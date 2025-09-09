// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*', 
      'reference/*',  // Ignore reference code that has external dependencies
      '__tests__/competitions/*',  // Ignore test files with type issues
    ],
    rules: {
      // Allow console for development
      "no-console": "off",
      // Disable some strict rules for development
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
