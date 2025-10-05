/**
 * Clear App Data Script
 * Clears all AsyncStorage to force fresh login state
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearAllData() {
  try {
    console.log('🧹 Clearing all AsyncStorage data...');

    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📦 Found ${keys.length} storage keys`);

    // Clear all keys
    await AsyncStorage.multiRemove(keys);

    console.log('✅ All data cleared!');
    console.log('🔓 App will now show login screen on next reload');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearAllData();
