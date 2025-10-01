# HealthKit Xcode Configuration Guide
**Critical Setup Required for HealthKit to Work**

## ⚠️ Important: Manual Xcode Configuration Required

While we've updated the Info.plist and service code automatically, **Xcode requires manual configuration** to enable HealthKit entitlements. Without this step, all HealthKit API calls will fail even though permissions are requested correctly.

---

## 🎯 Required Steps (5-10 minutes)

### **Step 1: Open Your Project in Xcode**

```bash
cd /Users/dakotabrown/runstr.project
open ios/Teams.xcworkspace
```

**Important**: You MUST open the `.xcworkspace` file, NOT the `.xcodeproj` file (because this project uses CocoaPods).

---

### **Step 2: Add HealthKit Capability**

1. In Xcode's left sidebar (Project Navigator), click on the **Teams** project (blue icon at top)
2. In the main editor area, select the **Teams** target (under TARGETS, not PROJECTS)
3. Click the **"Signing & Capabilities"** tab at the top
4. Click the **"+ Capability"** button (top left of the capabilities section)
5. Search for **"HealthKit"** in the popup
6. Double-click **"HealthKit"** to add it

You should now see a "HealthKit" section in your capabilities with:
- ☑️ Background Delivery
- ☑️ Clinical Health Records (optional)

**Visual Reference:**
```
Signing & Capabilities
├── Signing
│   └── Team: Your Team
│   └── Bundle Identifier: com.anonymous.runstr.project
├── Background Modes
│   ☑️ Location updates
│   ☑️ Background fetch
│   ☑️ Background processing
└── HealthKit (← YOU SHOULD SEE THIS AFTER STEP 5)
    ☑️ Background Delivery
    ☐ Clinical Health Records
```

---

### **Step 3: Verify Entitlements File**

After adding the HealthKit capability, Xcode should automatically:
1. Create or update `ios/Teams/Teams.entitlements` file
2. Add HealthKit entitlements to this file

To verify:
1. In Project Navigator, look for **Teams.entitlements** file (should be in the Teams folder)
2. Click on it to view contents
3. You should see something like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Other entitlements -->
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array>
        <!-- Optional: Clinical records access -->
    </array>
</dict>
</plist>
```

**If you don't see `com.apple.developer.healthkit`, the capability wasn't added correctly. Repeat Step 2.**

---

### **Step 4: Clean Build and Rebuild**

Critical: Xcode caches entitlements, so you MUST clean the build:

1. In Xcode menu bar: **Product → Clean Build Folder** (or press **Shift+Command+K**)
2. Wait for "Clean Complete" notification
3. **Product → Build** (or press **Command+B**)
4. Verify build succeeds with no errors

---

### **Step 5: Test on Physical Device**

**⚠️ HealthKit ONLY works on physical iOS devices, NOT simulators.**

1. Connect your iPhone via USB
2. In Xcode's device selector (top left, next to Play button), select your iPhone
3. Click the **Play ▶️** button to build and run on device
4. App should install and launch on your iPhone

---

## ✅ Verification Checklist

After completing the steps above:

- [ ] Opened `.xcworkspace` file (not `.xcodeproj`)
- [ ] Added HealthKit capability in Signing & Capabilities tab
- [ ] Verified `com.apple.developer.healthkit` exists in Teams.entitlements file
- [ ] Cleaned build folder (Shift+Command+K)
- [ ] Rebuilt app successfully (Command+B)
- [ ] Tested on **physical iPhone** (simulators don't support HealthKit)
- [ ] App launches without crashes
- [ ] HealthKit permission dialog appears when tapping "Connect Apple Health"
- [ ] After granting permissions, workouts sync successfully

---

## 🔍 Troubleshooting

### **"HealthKit is not available" error**
- **Cause**: Running in iOS Simulator
- **Solution**: Deploy to physical iPhone

### **Permission dialog doesn't appear**
- **Cause**: Entitlements not properly configured
- **Solution**:
  1. Verify HealthKit capability was added (Step 2)
  2. Check Teams.entitlements file exists and has `com.apple.developer.healthkit` (Step 3)
  3. Clean build folder and rebuild (Step 4)

### **"No bundle URL present" error**
- **Cause**: Metro bundler not running
- **Solution**:
  ```bash
  npx expo start --clear --ios
  ```

### **Build fails with entitlement errors**
- **Cause**: Apple Developer account doesn't have HealthKit enabled
- **Solution**:
  1. Go to https://developer.apple.com/account
  2. Select your app's identifier
  3. Enable HealthKit capability in app ID
  4. Download updated provisioning profiles
  5. Rebuild in Xcode

### **Workouts not syncing even after permissions granted**
- **Cause**: May be authorization check or query issues
- **Solution**:
  1. Check Metro logs for specific error messages
  2. Verify iPhone has workout data in Apple Health app
  3. Try manual sync via "Import Workouts" button

---

## 📱 Testing the Integration

### **Test 1: Permission Request**
1. Launch app on iPhone
2. Navigate to Profile tab
3. Look for "Apple Health" card
4. Tap "Connect Apple Health"
5. **Expected**: iOS native permission dialog appears with list of requested data types
6. Grant all permissions
7. **Expected**: "Apple Health Connected! 🍎" success message

### **Test 2: Workout Sync**
1. Ensure you have workouts in Apple Health (from Apple Fitness, Strava, etc.)
2. After granting permissions, app should automatically sync
3. Navigate to Workouts screen
4. **Expected**: See workouts from Apple Health with "healthkit" source badge
5. **Expected**: No errors or timeout messages

### **Test 3: Pull to Refresh**
1. In Workouts screen, pull down to refresh
2. **Expected**: Loading indicator appears
3. **Expected**: New/updated workouts appear after refresh
4. **Expected**: No duplicate workouts

---

## 🎓 What We Fixed

The following issues were automatically resolved in the codebase:

✅ **Info.plist**: Added `healthkit` to `UIRequiredDeviceCapabilities`
✅ **Authorization**: Fixed logic to actually verify iOS permissions (not just assume success)
✅ **Persistence**: Authorization status now saved to AsyncStorage (persists across app restarts)
✅ **Timeouts**: Increased from 30s to 60s for large workout libraries
✅ **Error Feedback**: User-friendly error messages now displayed in UI
✅ **Error Storage**: Recent errors stored and displayed to help troubleshooting

---

## 🚨 What You MUST Do Manually

⚠️ **Add HealthKit capability in Xcode** (Steps 1-5 above)
⚠️ **Test on physical iPhone** (not simulator)

**These steps cannot be automated** - Xcode requires manual configuration for security-sensitive capabilities like HealthKit.

---

## 💡 Additional Notes

### **Background Sync (Future Enhancement)**
Currently, HealthKit syncs when:
- App launches
- User manually refreshes
- User pulls to refresh in Workouts screen

For automatic background sync every 30 minutes:
1. Implement TaskManager background task
2. Register background task in app startup
3. Configure iOS background refresh permissions

This is a future enhancement and not required for core functionality.

### **Data Privacy**
- HealthKit data stays on device (never sent to servers)
- Workouts are only published to Nostr when user explicitly posts them
- Users control which workouts to share with competitions
- Apple Health permission can be revoked anytime in Settings

---

## 📞 Need Help?

If you encounter issues:

1. Check Metro logs for specific error messages:
   ```bash
   npx expo start --ios
   ```
   Look for lines starting with `❌` or `⚠️`

2. Verify setup with checklist above

3. Try the "Test on Physical Device" steps

4. If still stuck, share:
   - Xcode build errors (if any)
   - Metro console logs
   - Whether HealthKit capability appears in Xcode
   - iOS version of test device

---

**Good luck! 🚀 Your HealthKit integration is now properly configured in code - just needs the Xcode capability added.**
