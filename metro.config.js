const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Exclude iOS build directory from Metro file watcher (contains symlinks that cause EINVAL errors)
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : []),
  /ios\/build\/.*/,
];
config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
};

// Custom resolver to handle nostr-tools subpath imports
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle nostr-tools subpath imports
  if (moduleName.startsWith('nostr-tools/')) {
    const subpath = moduleName.replace('nostr-tools/', '');

    // Build absolute paths to check
    const nostrToolsPath = path.join(__dirname, 'node_modules', 'nostr-tools');
    const possiblePaths = [
      path.join(nostrToolsPath, 'lib', 'esm', `${subpath}.js`),
      path.join(nostrToolsPath, 'lib', 'esm', subpath, 'index.js'),
      path.join(nostrToolsPath, 'lib', 'cjs', `${subpath}.js`),
      path.join(nostrToolsPath, 'lib', 'cjs', subpath, 'index.js'),
    ];

    for (const resolvedPath of possiblePaths) {
      if (fs.existsSync(resolvedPath)) {
        return {
          filePath: resolvedPath,
          type: 'sourceFile',
        };
      }
    }
  }

  // Use original resolution for everything else
  return originalResolveRequest ? originalResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;