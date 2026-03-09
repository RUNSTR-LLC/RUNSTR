---
name: runstr-simulator
description: Manage the RUNSTR iOS simulator workflow. Use when the user says "run the app", "start the simulator", "reload", "restart metro", or needs help with the iOS development environment. Handles Metro bundler, Xcode builds, and simulator control.
metadata:
  tags: ios, simulator, metro, xcode, react-native, development
---

# RUNSTR iOS Simulator Skill

Automates the RUNSTR iOS development workflow: Metro bundler + Xcode simulator.

## Critical Rules

1. **NEVER use `npx expo start --ios`** - This launches Expo Go (wrong app, missing native modules, wrong icon). RUNSTR is a bare/custom native build that must run through Xcode.
2. **NEVER use `--clear` flag** unless specifically debugging asset issues - it causes Metro to rebuild from scratch and can exit prematurely.
3. **Metro must stay running** as a persistent background process for the Xcode-built app to load JS.
4. **Bundle identifier**: `com.anonymous.runstr.project`
5. **Xcode workspace**: `ios/RUNSTR.xcworkspace`

## Commands Reference

### Start Metro Bundler (must run first)
```bash
# Kill any existing Metro, then start fresh in background
lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1
npx expo start &
```
Wait for Metro to be ready:
```bash
# Poll until Metro responds (usually 5-10 seconds)
sleep 8 && curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status
# Should return 200
```

### Check Metro Status
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status
# 200 = running, 000 = not running
```

### Open Xcode (for building)
```bash
open /Users/dakotabrown/runstr.project/ios/RUNSTR.xcworkspace
```
Then user hits Cmd+R in Xcode to build and run.

### Find Booted Simulator
```bash
xcrun simctl list devices booted
```

### Reload App (terminate and relaunch)
```bash
# Get the booted device ID first
DEVICE_ID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; devices=json.load(sys.stdin)['devices']; print([d['udid'] for devs in devices.values() for d in devs if d['state']=='Booted'][0])")
xcrun simctl terminate "$DEVICE_ID" com.anonymous.runstr.project
sleep 1
xcrun simctl launch "$DEVICE_ID" com.anonymous.runstr.project
```

### Full Restart (Metro + App)
```bash
# 1. Kill Metro
lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# 2. Restart Metro in background
npx expo start &
sleep 8

# 3. Verify Metro is ready
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status

# 4. Relaunch app on simulator
DEVICE_ID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; devices=json.load(sys.stdin)['devices']; print([d['udid'] for devs in devices.values() for d in devs if d['state']=='Booted'][0])")
xcrun simctl terminate "$DEVICE_ID" com.anonymous.runstr.project 2>/dev/null
sleep 1
xcrun simctl launch "$DEVICE_ID" com.anonymous.runstr.project
```

### Clear Metro Cache (only when needed)
Only use this when new image assets aren't appearing or Metro has stale state:
```bash
lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1
npx expo start --clear &
sleep 12
```

## Workflow: When User Says...

| User says | Action |
|-----------|--------|
| "run the app" / "start the app" | Start Metro (if not running) + open Xcode workspace |
| "reload" / "refresh" | Terminate + relaunch app on booted simulator |
| "restart metro" | Kill port 8081, start `npx expo start &`, wait for 200 |
| "it's not loading" / "no script URL" | Check Metro status, restart if needed, relaunch app |
| "images are broken" / "assets missing" | Restart Metro with `--clear`, then relaunch app |
| "let's test" | Check Metro status, relaunch app, monitor Metro logs |

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "No script URL provided" | Metro not running | Start Metro on 8081, relaunch app |
| "RNCSafeAreaProvider" duplicate | Stale native cache | Clean Xcode build (Product > Clean Build Folder), rebuild |
| Wrong app icon / Expo Go UI | Used `--ios` flag | Kill Expo Go, start Metro without `--ios`, build from Xcode |
| "Port 8081 already in use" | Stale Metro process | `lsof -ti:8081 \| xargs kill -9` then restart |
| Changes not appearing | Metro Fast Refresh stale | Terminate and relaunch app, or restart Metro |
