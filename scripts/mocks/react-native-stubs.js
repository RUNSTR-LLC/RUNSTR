/**
 * Stubs react-native and react-native-url-polyfill so tsx verify scripts
 * can import app services that transitively depend on those packages.
 * Usage: npx tsx --require ./scripts/mocks/react-native-stubs.js <script>
 */
const Module = require('module');
const originalResolve = Module._resolveFilename.bind(Module);
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native-url-polyfill/auto') {
    // Return path to this file itself — we'll export nothing
    return __filename;
  }
  if (request === 'react-native') {
    return __filename;
  }
  return originalResolve(request, parent, isMain, options);
};
// Export nothing — the polyfill just needs to not crash on import
module.exports = {};
