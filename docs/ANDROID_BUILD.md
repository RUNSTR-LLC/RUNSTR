# Android APK Build Guide

This document provides complete instructions for building Android APK files for RUNSTR.

## Build Infrastructure

### Installed Tools

- **Android Studio**: `/Applications/Android Studio.app`
- **Android SDK**: `~/Library/Android/sdk`
- **Java Runtime**: Bundled with Android Studio at `/Applications/Android Studio.app/Contents/jbr/Contents/Home`
- **Gradle Wrapper**: Project includes `android/gradlew` for consistent builds
- **Configuration**: Requires `android/local.properties` file pointing to SDK location

### Prerequisites

All build tools come from the Android Studio installation - no separate downloads needed. Gradle wrapper handles dependency downloads automatically.

## Building Android APK

### Step 1: Configure SDK Path

Create `android/local.properties` if it doesn't exist:

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

### Step 2: Set Java Home

Set `JAVA_HOME` to Android Studio's bundled JDK:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

**Tip**: Add this to your `~/.zshrc` or `~/.bash_profile` to make it permanent:

```bash
echo 'export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Clean Previous Builds (Optional)

Clean previous builds to ensure a fresh start:

```bash
cd android
./gradlew clean
cd ..
```

### Step 4: Build Release APK

Build the release APK:

```bash
cd android
./gradlew assembleRelease
cd ..
```

**Expected output location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

### Complete Build Script

Create a convenience script `scripts/build-android.sh`:

```bash
#!/bin/bash

echo "🤖 Building Android APK..."

# 1. Ensure local.properties exists
if [ ! -f "android/local.properties" ]; then
  echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
  echo "✅ Created android/local.properties"
fi

# 2. Set JAVA_HOME
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
echo "✅ Set JAVA_HOME to Android Studio's JDK"

# 3. Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android && ./gradlew clean

# 4. Build release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# 5. Check if build succeeded
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
  echo "✅ Build successful!"
  echo "📦 APK location: android/app/build/outputs/apk/release/app-release.apk"
  ls -lh app/build/outputs/apk/release/app-release.apk
else
  echo "❌ Build failed!"
  exit 1
fi
```

Make it executable:

```bash
chmod +x scripts/build-android.sh
```

## Build Output Details

### APK Information

- **Location**: `android/app/build/outputs/apk/release/app-release.apk`
- **Size**: ~120MB (includes all native libraries and assets)
- **Signing**: Uses debug keystore (for testing/direct distribution, not Play Store)
- **Architecture**: Universal APK (works on all Android devices)

### Version Information

Version is defined in two places:

1. **`app.json`** - User-visible version:
   ```json
   {
     "expo": {
       "version": "0.1.8"
     }
   }
   ```

2. **`android/app/build.gradle`** - Build version:
   ```gradle
   android {
     defaultConfig {
       versionCode 8
       versionName "0.1.8"
     }
   }
   ```

### Package Information

- **Package ID**: `com.anonymous.runstr.project`
- **Target SDK**: API 35 (Android 15)
- **Min SDK**: API 24 (Android 7.0)
- **Compile SDK**: API 35

## Updating Version Numbers

### For New Release

1. Update version in `app.json`:
   ```json
   "version": "0.2.0"
   ```

2. Update version in `android/app/build.gradle`:
   ```gradle
   versionCode 9        // Increment by 1
   versionName "0.2.0"  // Match app.json
   ```

3. Rebuild APK with new version

## Signing for Play Store

The current build uses a **debug keystore**, which is suitable for:
- ✅ Testing on physical devices
- ✅ Direct distribution (email, download link)
- ❌ **NOT** suitable for Play Store

### Creating Release Keystore

For Play Store distribution, create a release keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore runstr-release-key.keystore \
  -alias runstr-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Store the keystore password securely** - losing it means you cannot update your app on Play Store.

### Configure Release Signing

1. Add to `android/gradle.properties`:
   ```properties
   RUNSTR_RELEASE_STORE_FILE=runstr-release-key.keystore
   RUNSTR_RELEASE_KEY_ALIAS=runstr-key-alias
   RUNSTR_RELEASE_STORE_PASSWORD=your_keystore_password
   RUNSTR_RELEASE_KEY_PASSWORD=your_key_password
   ```

2. Update `android/app/build.gradle`:
   ```gradle
   android {
     signingConfigs {
       release {
         storeFile file(RUNSTR_RELEASE_STORE_FILE)
         storePassword RUNSTR_RELEASE_STORE_PASSWORD
         keyAlias RUNSTR_RELEASE_KEY_ALIAS
         keyPassword RUNSTR_RELEASE_KEY_PASSWORD
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
       }
     }
   }
   ```

## Common Issues

### Build Fails with "SDK location not found"

**Solution**: Ensure `android/local.properties` exists with correct SDK path:
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

### Build Fails with Java Version Error

**Solution**: Ensure `JAVA_HOME` points to Android Studio's JDK:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
java -version  # Verify Java is accessible
```

### Gradle Daemon Issues

**Solution**: Kill all Gradle daemons and rebuild:
```bash
cd android
./gradlew --stop
./gradlew clean assembleRelease
```

### Out of Memory During Build

**Solution**: Increase Gradle memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
```

## Build Performance

### First Build
- **Duration**: 5-10 minutes (Gradle downloads dependencies)
- **Network**: Requires internet connection for dependency downloads
- **Disk Space**: ~2GB for dependencies and build artifacts

### Subsequent Builds
- **Duration**: 2-3 minutes (incremental builds)
- **Network**: Not required if dependencies are cached
- **Disk Space**: Only changed files are rebuilt

### Speed Optimization

Enable Gradle daemon and parallel builds in `android/gradle.properties`:

```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
```

## Distribution

### Direct APK Distribution

1. Build the APK: `./gradlew assembleRelease`
2. Upload APK to file hosting (Google Drive, Dropbox, etc.)
3. Share download link with users
4. Users must enable "Install from Unknown Sources" in Android settings

### Testing Build

Install APK on connected device:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### APK Analysis

Analyze APK size breakdown:

```bash
cd android
./gradlew assembleRelease
cd ..

# Analyze APK contents
npx react-native-bundle-visualizer --platform android
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/android-build.yml`:

```yaml
name: Android Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: cd android && ./gradlew assembleRelease
      - uses: actions/upload-artifact@v3
        with:
          name: app-release.apk
          path: android/app/build/outputs/apk/release/app-release.apk
```

## Related Documentation

- 📖 **For iOS builds**: See main CLAUDE.md Development Workflow section
- 📖 **For app distribution**: [ZAPSTORE_PUBLISHING.md](./ZAPSTORE_PUBLISHING.md)
- 📖 **For version management**: See CHANGELOG.md
