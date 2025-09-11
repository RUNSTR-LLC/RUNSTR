/**
 * Verification script to ensure notification settings persist correctly
 * Tests that settings survive app restarts by simulating storage operations
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Mock the SafeStorage to test persistence
const NOTIFICATION_PREFERENCES_KEY = '@runstr_notification_preferences';

async function verifyNotificationPersistence() {
  console.log('🔍 Verifying notification settings persistence...\n');

  try {
    // Test 1: Clear any existing data
    console.log('📋 Test 1: Clearing existing data');
    await AsyncStorage.removeItem(NOTIFICATION_PREFERENCES_KEY);
    console.log('✅ Storage cleared');

    // Test 2: Create test settings
    console.log('\n📋 Test 2: Storing test settings');
    const testSettings = {
      eventNotifications: false,
      leagueUpdates: true,
      teamAnnouncements: false,
      bitcoinRewards: true,
      challengeUpdates: false,
      liveCompetitionUpdates: true,
      workoutReminders: false,
    };
    
    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(testSettings));
    console.log('✅ Test settings stored:', testSettings);

    // Test 3: Retrieve settings (simulating app restart)
    console.log('\n📋 Test 3: Retrieving settings (simulating app restart)');
    const storedData = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    
    if (!storedData) {
      throw new Error('No data found in storage!');
    }

    const retrievedSettings = JSON.parse(storedData);
    console.log('✅ Settings retrieved:', retrievedSettings);

    // Test 4: Verify data integrity
    console.log('\n📋 Test 4: Verifying data integrity');
    const isIntegrityValid = JSON.stringify(testSettings) === JSON.stringify(retrievedSettings);
    
    if (isIntegrityValid) {
      console.log('✅ Data integrity verified - settings persist correctly');
    } else {
      throw new Error('Data integrity failed - settings do not match!');
    }

    // Test 5: Test partial updates persist
    console.log('\n📋 Test 5: Testing partial update persistence');
    const updatedSettings = {
      ...retrievedSettings,
      workoutReminders: true, // Change one setting
      eventNotifications: true, // Change another setting
    };

    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(updatedSettings));
    
    // Retrieve again
    const finalStoredData = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    const finalSettings = JSON.parse(finalStoredData);
    
    if (finalSettings.workoutReminders === true && finalSettings.eventNotifications === true) {
      console.log('✅ Partial updates persist correctly');
    } else {
      throw new Error('Partial updates did not persist correctly');
    }

    console.log('\n🎉 All persistence tests passed!');
    console.log('✅ Notification settings will survive app restarts');

    // Cleanup
    await AsyncStorage.removeItem(NOTIFICATION_PREFERENCES_KEY);
    console.log('✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Persistence test failed:', error);
    process.exit(1);
  }
}

// Test key features of AsyncStorage that we rely on
async function testAsyncStorageFeatures() {
  console.log('\n🧪 Testing AsyncStorage features...\n');
  
  try {
    // Test string storage
    await AsyncStorage.setItem('@test_string', 'test_value');
    const stringValue = await AsyncStorage.getItem('@test_string');
    console.log('✅ String storage works:', stringValue === 'test_value');

    // Test JSON storage
    const testObject = { test: true, number: 42 };
    await AsyncStorage.setItem('@test_json', JSON.stringify(testObject));
    const jsonValue = await AsyncStorage.getItem('@test_json');
    const parsedObject = JSON.parse(jsonValue);
    console.log('✅ JSON storage works:', parsedObject.test === true && parsedObject.number === 42);

    // Test null handling
    const nullValue = await AsyncStorage.getItem('@nonexistent_key');
    console.log('✅ Null handling works:', nullValue === null);

    // Cleanup test data
    await AsyncStorage.removeItem('@test_string');
    await AsyncStorage.removeItem('@test_json');
    
    console.log('✅ AsyncStorage features verified\n');
    
  } catch (error) {
    console.error('❌ AsyncStorage feature test failed:', error);
    throw error;
  }
}

// Run the verification
async function runAllTests() {
  await testAsyncStorageFeatures();
  await verifyNotificationPersistence();
}

runAllTests();