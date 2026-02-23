# Development Workflow & Testing Protocol

**CRITICAL: React Native/Expo requires TWO components running simultaneously:**

## Metro Bundler (JavaScript Engine)
- **Purpose**: Transforms and serves your React Native code to the app
- **Start Command**: `npx expo start` (starts on port 8081)
- **NEVER use `--ios` flag** — this launches Expo Go (wrong app, missing native modules)
- **Role**: Watches `src/` files, compiles TypeScript/React Native to JavaScript bundles
- **Logs**: Shows app's `console.log()`, React Native errors, service initializations
- **Hot Reload**: Changes to `src/` files appear instantly via Fast Refresh
- **Must stay running** as a persistent background process

## Xcode (Native iOS Shell)
- **Purpose**: Builds and runs the native RUNSTR app
- **Start Command**: `open ios/RUNSTR.xcworkspace`
- **Bundle ID**: `com.anonymous.runstr.project`
- **Role**: Compiles native iOS code, installs app on device/simulator
- **The App Logic**: Native shell downloads JavaScript from Metro at `http://localhost:8081`
- **Logs**: Shows native iOS system events, less useful for app logic debugging

## Standard Testing Protocol

**When user says "let's test" or requests testing, Claude should use the `runstr-simulator` skill, or follow these steps:**

1. **Check Metro Status**: Verify Metro bundler is running on port 8081
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status
   ```
   - If not running: `lsof -ti:8081 | xargs kill -9 2>/dev/null; sleep 1; npx expo start &`
   - If running on wrong port: Kill and restart on 8081
   - Only use `--clear` flag when debugging asset/cache issues

2. **Open Xcode Workspace**: `open ios/RUNSTR.xcworkspace`
   - Select iOS Simulator (not physical device unless specified)
   - Click Play button or Cmd+R

3. **Reload App** (without rebuilding in Xcode):
   ```bash
   DEVICE_ID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; devices=json.load(sys.stdin)['devices']; print([d['udid'] for devs in devices.values() for d in devs if d['state']=='Booted'][0])")
   xcrun simctl terminate "$DEVICE_ID" com.anonymous.runstr.project
   sleep 1
   xcrun simctl launch "$DEVICE_ID" com.anonymous.runstr.project
   ```

4. **Monitor Metro Logs**: Use BashOutput tool to check Metro's console output
   - Metro logs show actual app behavior and JavaScript execution
   - Look for authentication flows, service initialization, errors
   - Ignore Xcode native system logs unless investigating native issues

## Development Commands
- `npm install` — Install dependencies
- `npx expo start` — **REQUIRED**: Start Metro bundler on port 8081 (NEVER use `--ios` flag)
- `npx expo start --clear` — Clear Metro cache and restart (only for asset/cache issues)
- `open ios/RUNSTR.xcworkspace` — Open Xcode, then Cmd+R to build and run
- `npm run typecheck` — TypeScript validation
- `npm run lint` — Code linting

## Android APK Build System
For complete Android build instructions: [ANDROID_BUILD.md](./ANDROID_BUILD.md)

## Change Types & Required Actions

**JavaScript/TypeScript Changes (src/ files):**
- Auto-reload via Fast Refresh, no Xcode rebuild needed
- If not appearing: Press Cmd+R in simulator or restart Metro with `--clear`

**Native Configuration Changes:**
- Requires Xcode rebuild: Changes to `app.json`, iOS permissions, new dependencies
- Process: Stop Metro → Make changes → Rebuild in Xcode → Restart Metro

## Common Issues & Solutions
- **"No script URL provided"**: Metro not running or wrong port → Start Metro on 8081
- **"Connection refused [61]"**: App can't reach Metro → Check Metro is on localhost:8081
- **Changes not appearing**: Fast Refresh failed → Press Cmd+R or restart Metro with `--clear`
- **App crashes on startup**: Check Metro logs for JavaScript errors, not Xcode logs
