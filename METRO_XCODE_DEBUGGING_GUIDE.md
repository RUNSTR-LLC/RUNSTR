# Metro & Xcode Debugging Guide

## Problem: "No script URL provided" Error

This error occurs when the iOS app cannot connect to the Metro bundler, usually due to:
1. Multiple conflicting Metro servers running on different ports
2. iOS app cached with wrong Metro URL 
3. Network connectivity issues between iPhone and Mac

## The Working Solution

### Step 1: Complete Metro Cleanup
```bash
# Kill ALL Metro/Node/Expo processes
killall -9 node
killall -9 expo
sleep 3

# Verify port 8081 is completely clear
lsof -i :8081 || echo "Port 8081 is clear"
```

### Step 2: Start Single Clean Metro Server
```bash
# Start ONE Metro server with correct IP configuration
EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo start --clear --port 8081
```

**Key Points:**
- Use your Mac's actual IP address (check with `ifconfig | grep "inet " | grep -v 127.0.0.1`)
- Only start ONE Metro server
- Use `--clear` flag to reset cache
- Use `--port 8081` to ensure correct port

### Step 3: Verify Metro Network Access
```bash
# Test that Metro is accessible from network
curl -I http://192.168.0.171:8081 2>/dev/null | head -1
# Should return: HTTP/1.1 200 OK
```

### Step 4: Clear iOS Cache
```bash
# Remove iOS build cache and Xcode DerivedData
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/runstrproject-*
```

### Step 5: Fresh Xcode Build
```bash
# Open Xcode workspace
open ios/runstrproject.xcworkspace
```

**In Xcode:**
1. Clean Build Folder: `Cmd+Shift+K`
2. Select iPhone device from dropdown
3. Build & Run: `▶️` button or `Cmd+R`

## What NOT to Do

❌ **Never run multiple Metro servers simultaneously**
- Creates port conflicts and confuses iOS app discovery

❌ **Don't use complex flags without understanding**  
- Avoid `--tunnel`, `--host lan`, multiple environment variables unless necessary

❌ **Don't skip cache clearing**
- iOS apps cache Metro URLs and can get stuck connecting to wrong servers

## Lessons Learned

### 1. Simplicity Over Complexity
- The working solution uses the simplest possible Metro configuration
- Complex network configurations often create more problems than they solve

### 2. Clean State is Critical
- Multiple Metro processes running = guaranteed connection issues
- iOS cache must be cleared when Metro configuration changes

### 3. Network Discovery Process
The iOS app tries to find Metro in this order:
1. Cached Metro URL from previous session
2. Auto-discovery on local network
3. Manual configuration (if available)

**Problem:** If step 1 has wrong URL, steps 2-3 never execute.
**Solution:** Clear cache to force fresh discovery.

### 4. IP Address Consistency  
- Always use Mac's actual network IP, not localhost
- Verify IP hasn't changed: `ifconfig | grep "inet " | grep -v 127.0.0.1`

### 5. Single Source of Truth
- ONE Metro server on ONE port (8081)
- ONE IP address configuration
- Clear everything else to eliminate conflicts

## Troubleshooting Quick Reference

### If you get "No script URL provided":
1. Check how many Metro processes are running: `ps aux | grep "expo start"`
2. Kill all processes: `killall -9 node; killall -9 expo`
3. Clear iOS cache: `rm -rf ios/build; rm -rf ~/Library/Developer/Xcode/DerivedData/runstrproject-*`
4. Start ONE Metro server with correct IP
5. Fresh Xcode build

### If Metro shows "localhost" but you set network IP:
- This is normal - Metro console shows localhost but still serves on network IP
- Verify with: `curl -I http://YOUR_IP:8081`

### If iPhone still can't connect:
- Check iPhone Settings → Privacy & Security → Local Network
- Ensure both devices on same WiFi network
- Try shaking iPhone in app → "Configure Bundler" → Enter `192.168.0.171:8081`

## Commands Summary

```bash
# Complete reset and restart (copy-paste friendly)
killall -9 node; killall -9 expo; sleep 3
lsof -i :8081 || echo "Port 8081 is clear"
EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo start --clear --port 8081 &
rm -rf ios/build; rm -rf ~/Library/Developer/Xcode/DerivedData/runstrproject-*
open ios/runstrproject.xcworkspace
```

## Success Indicators

✅ Metro server shows "Waiting on http://localhost:8081" in console
✅ `curl -I http://192.168.0.171:8081` returns "HTTP/1.1 200 OK"  
✅ Only ONE Metro process in `ps aux | grep expo`
✅ Fresh Xcode build completes successfully
✅ iOS app connects without "No script URL provided" error

## Failed Troubleshooting Session #1: September 12, 2025

### Systematic Failure Analysis

**Step 1: Following the Documented Solution**
- Executed: `killall -9 node; killall -9 expo; sleep 3`
- Executed: `lsof -i :8081 || echo "Port 8081 is clear"`
- Executed: `rm -rf ios/build; rm -rf ~/Library/Developer/Xcode/DerivedData/runstrproject-*`
- Executed: `EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo start --clear --port 8081`
- Verified: `curl -I http://192.168.0.171:8081` returned `HTTP/1.1 200 OK`
- Opened: `ios/runstrproject.xcworkspace` in Xcode
- **Result**: iPhone still showed "No script URL provided" error

**Step 2: Multiple Metro Configuration Attempts**
- Tried: `EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo start --clear --port 8081 --host lan`
- Tried: `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.171 npx expo start --clear --host 192.168.0.171`
- Tried: `npx expo start --clear --host lan`
- Tried: `npx expo start --tunnel --clear` (failed - missing ngrok)
- **Result**: All variations showed Metro running on localhost:8081 instead of network IP

**Step 3: Direct Device Installation Attempts**
- Tried: `EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo run:ios --device --clear` (failed - unknown flag)
- Tried: `EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo run:ios --device` (failed - non-interactive mode)
- **Result**: Interactive device selection required, not possible in command-line mode

**Step 4: Expo Go App Strategy**
- Recommended deleting existing app and using Expo Go
- Attempted to provide QR code/URL: `exp://192.168.0.171:8081`
- Problem: Metro console didn't display expected QR code interface
- Problem: User couldn't locate manual URL entry in Expo Go app
- **Result**: No clear connection method available

**Step 5: Process Management Issues**
- Created 25+ background Metro processes during troubleshooting
- Processes included: `npx expo start --ios`, `npx expo start --clear`, `npx expo run:ios --device`
- Multiple conflicting configurations running simultaneously
- Attempts to kill processes: `pkill -f "expo start"`, `killall -9 node`, `killall -9 expo`
- **Result**: Background process conflicts likely contributed to connection issues

### Root Cause Analysis

Throughout these attempts, a pattern emerged: while I could successfully start Metro servers and verify their network accessibility through technical means, the actual user-facing connection process remained broken. The fundamental issue appeared to be that despite following documented procedures and achieving technical milestones (server running, network accessible, caches cleared), the bridge between your iPhone and the development environment never materialized. Each approach—whether through direct device installation, Xcode integration, or Expo Go connectivity—encountered barriers that prevented the successful deployment of your app, highlighting the complexity of React Native development environment setup and the fragility of the device-to-development-server connection process.

### Key Failures
1. **Metro Network Configuration**: Despite setting `EXPO_DEV_SERVER_HOST=192.168.0.171`, Metro consistently displayed "localhost:8081"
2. **Device Detection**: `npx expo run:ios --device` required interactive device selection incompatible with command-line automation
3. **Cache Clearing Ineffective**: Standard cache clearing procedures didn't resolve cached Metro URL issues
4. **Expo Go Integration**: Missing QR code interface and unclear manual URL entry process
5. **Process Management**: Multiple background Metro instances created conflicts and resource competition

## Failed Troubleshooting Session #2: September 13, 2025

### Advanced Xcode Build & Deploy Approach

**Step 1: Nuclear Metro Reset**
- Executed: `killall -9 node; sleep 3` (eliminated 30+ conflicting Metro processes)
- Verified: `lsof -i :8081 || echo "Port 8081 is clear"` 
- Cleared: `rm -rf ios/build; rm -rf ~/Library/Developer/Xcode/DerivedData/runstrproject-*`

**Step 2: Direct Xcode Build Success**
- Executed: `xcodebuild -workspace runstrproject.xcworkspace -scheme runstrproject -destination "platform=iOS,id=00008110-001830320AEB601E" build -allowProvisioningUpdates`
- **Result**: ✅ Successfully compiled all 124 React Native targets
- **Result**: ✅ Build completed with exit code 0

**Step 3: Direct Device Installation Success**
- Executed: `xcodebuild -workspace runstrproject.xcworkspace -scheme runstrproject -destination "platform=iOS,id=00008110-001830320AEB601E" install -allowProvisioningUpdates`
- **Result**: ✅ Installation completed successfully (exit code 0)
- **Result**: ✅ App installed to iPhone (00008110-001830320AEB601E)

**Step 4: Metro Server Verification**
- Started: `EXPO_DEV_SERVER_HOST=192.168.0.171 npx expo start --port 8081 --clear`
- Verified: `curl -I http://192.168.0.171:8081` returned `HTTP/1.1 200 OK`
- Opened: `ios/runstrproject.xcworkspace` in Xcode successfully

**Step 5: Final Device Launch Attempt**
- Executed: `xcodebuild -workspace runstrproject.xcworkspace -scheme runstrproject -destination "platform=iOS,id=00008110-001830320AEB601E" -allowProvisioningUpdates`
- **Result**: ✅ Build and launch command completed successfully
- **Network Status**: Both devices confirmed on same WiFi network
- **Simulator Status**: ✅ iOS Simulator works perfectly with Metro server
- **Final Result**: ❌ **Physical iPhone failed to connect to Metro server despite all technical milestones achieved**

### Critical System State at Failure

**Technical Success Indicators:**
- ✅ Metro server running and network accessible (192.168.0.171:8081)
- ✅ App successfully built, installed, and launched on physical device
- ✅ Xcode project opened and device properly detected
- ✅ All iOS caches cleared and build artifacts removed
- ✅ Single clean Metro process (no conflicts)
- ✅ Network connectivity verified via curl

**Environment Verification:**
- ✅ Same WiFi network (Mac and iPhone)
- ✅ iOS Simulator connects and works normally
- ✅ Network IP confirmed: 192.168.0.171
- ✅ Metro port confirmed: 8081
- ✅ All background Metro processes eliminated

### Root Cause Assessment

Despite achieving every documented technical milestone - successful Xcode build, device installation, Metro server accessibility, network verification, and app launch - the fundamental Metro-to-physical-device connection remains broken. This represents a systemic issue beyond standard troubleshooting approaches, possibly related to iOS network security policies, device-specific Metro discovery mechanisms, or React Native/Expo framework limitations with physical device connectivity.

The consistent pattern where iOS Simulator works perfectly while physical devices fail suggests the issue lies in the network discovery/connection layer between Metro bundler and iOS devices, rather than in build processes or Metro server functionality.

---

**Last Updated:** September 13, 2025
**Tested Configuration:** macOS, iOS physical device, React Native + Expo