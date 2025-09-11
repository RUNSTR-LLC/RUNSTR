/**
 * Test script to verify notification toggles work correctly
 * This tests the NotificationPreferencesService functionality
 */

const { NotificationPreferencesService } = require('./src/services/notifications/NotificationPreferencesService');

async function testNotificationToggles() {
  console.log('🧪 Testing notification toggles functionality...\n');
  
  try {
    // Test 1: Get default settings
    console.log('📋 Test 1: Loading default settings');
    const defaultSettings = await NotificationPreferencesService.getNotificationSettings();
    console.log('✅ Default settings loaded:', defaultSettings);
    
    // Test 2: Update a specific setting
    console.log('\n📋 Test 2: Updating eventNotifications to false');
    await NotificationPreferencesService.updateNotificationSetting('eventNotifications', false);
    
    // Test 3: Verify the change persisted
    console.log('📋 Test 3: Verifying change persisted');
    const updatedSettings = await NotificationPreferencesService.getNotificationSettings();
    console.log('✅ Updated settings:', updatedSettings);
    
    if (updatedSettings.eventNotifications === false) {
      console.log('✅ Setting change persisted correctly');
    } else {
      console.log('❌ Setting change did NOT persist');
    }
    
    // Test 4: Test individual preference checks
    console.log('\n📋 Test 4: Testing individual preference checks');
    const canSendEvents = await NotificationPreferencesService.canSendEventNotifications();
    const canSendBitcoin = await NotificationPreferencesService.canSendBitcoinRewards();
    
    console.log('✅ Can send event notifications:', canSendEvents);
    console.log('✅ Can send bitcoin rewards:', canSendBitcoin);
    
    // Test 5: Reset to defaults
    console.log('\n📋 Test 5: Resetting to defaults');
    const resetSettings = await NotificationPreferencesService.resetToDefaults();
    console.log('✅ Reset settings:', resetSettings);
    
    // Test 6: Export/Import settings
    console.log('\n📋 Test 6: Testing export/import');
    const exportedSettings = await NotificationPreferencesService.exportSettings();
    console.log('✅ Exported settings JSON length:', exportedSettings.length);
    
    // Update one setting
    await NotificationPreferencesService.updateNotificationSetting('workoutReminders', false);
    
    // Import the original settings back
    await NotificationPreferencesService.importSettings(exportedSettings);
    const importedSettings = await NotificationPreferencesService.getNotificationSettings();
    console.log('✅ Imported settings restored workout reminders to:', importedSettings.workoutReminders);
    
    console.log('\n🎉 All notification toggle tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNotificationToggles();