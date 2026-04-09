/**
 * Expo Config Plugin: withKspVersion
 *
 * Adds kspVersion to the root build.gradle ext block so that
 * expo-android-pedometer (and any other modules using KSP) pick up
 * a KSP version compatible with the project's Kotlin version.
 *
 * Without this, expo-android-pedometer defaults to KSP 2.1.20-2.0.1
 * which is incompatible with Kotlin 2.0.21.
 */

const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const KSP_VERSIONS = {
  '1.9.23': '1.9.23-1.0.20',
  '1.9.24': '1.9.24-1.0.20',
  '1.9.25': '1.9.25-1.0.20',
  '2.0.21': '2.0.21-1.0.28',
};

/**
 * Find the kotlinVersion from the expo-build-properties plugin config
 */
function findKotlinVersion(config) {
  const plugins = config.plugins || [];
  for (const plugin of plugins) {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      const props = plugin[1];
      if (props?.android?.kotlinVersion) {
        return props.android.kotlinVersion;
      }
    }
  }
  return '1.9.25'; // Expo SDK 52 default
}

const withKspVersion = (config) => {
  const kotlinVersion = findKotlinVersion(config);
  const kspVersion = KSP_VERSIONS[kotlinVersion] || '2.0.21-1.0.28';

  // Step 1: Add kspVersion to root build.gradle ext block
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('kspVersion')) {
      contents = contents.replace(
        /ndkVersion\s*=\s*"[^"]+"/,
        (match) => `${match}\n        kspVersion = '${kspVersion}'`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // Step 2: Also add to gradle.properties for findProperty fallback
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Remove existing kspVersion if present
    const filtered = props.filter(
      (p) => !(p.type === 'property' && p.key === 'android.kspVersion')
    );

    filtered.push({
      type: 'property',
      key: 'android.kspVersion',
      value: kspVersion,
    });

    config.modResults = filtered;
    return config;
  });

  return config;
};

module.exports = withKspVersion;
