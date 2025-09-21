# Publishing RUNSTR to Zapstore

This guide documents the process for publishing RUNSTR to Zapstore, the decentralized Nostr-based app store.

## Overview

Zapstore is a permissionless app store powered by Nostr that allows users to discover, install, and update Android apps without centralized gatekeepers. RUNSTR's Bitcoin and Nostr-native architecture makes it a perfect fit for this distribution channel.

## Prerequisites

### 1. Zapstore CLI Installation
The Zapstore CLI is already installed at `/usr/local/bin/zapstore`

For reference, installation commands:
- **macOS (Apple Silicon)**: Download from `https://cdn.zapstore.dev/88c82772eee5c262a0a2553f85a569004ebee54b1636f080ec930f314ac01b1d`
- **Linux (Intel/AMD)**: Download from `https://cdn.zapstore.dev/6e2c7cf6da53c3f1a78b523a6aacd6316dce3d74ace6f859c2676729ee439990`

### 2. Publisher Whitelist
**REQUIRED**: Contact the Zapstore team via Nostr to get whitelisted as a publisher. Without whitelisting, you cannot publish to `relay.zapstore.dev`.

### 3. Nostr Signing Key
Your publishing nsec is configured in `.env`:
```
SIGN_WITH=nsec1f3s3gxkaxzgg70fp4n9r94gwn5ep0n0e8jcty3wdrjlq76zgnqwqmecgjp
```

## Project Configuration

### Files Created for Zapstore

1. **zapstore.yaml** - Main configuration file containing:
   - App metadata (name, description, tags)
   - Asset paths (APK, icon)
   - Blossom server configuration
   - Repository and homepage links

2. **CHANGELOG.md** - Version history following Keep a Changelog format

3. **.env** - Contains the Nostr signing key (already in .gitignore)

4. **assets/** - Directory structure:
   ```
   assets/
   ├── images/
   │   └── icon.png (1024x1024)
   └── screenshots/
       └── README.md (placeholder for future screenshots)
   ```

## Building the APK

Before publishing, you need to build the Android APK:

### Debug Build (Current)
```bash
cd android
./gradlew assembleDebug
```
- Output: `android/app/build/outputs/apk/debug/app-debug.apk`
- Size: ~195MB
- Status: Ready for testing

### Release Build (Recommended for Production)
```bash
cd android
./gradlew assembleRelease
```
- Output: `android/app/build/outputs/apk/release/app-release.apk`
- Size: Smaller, optimized
- Requires: Signing configuration

## Publishing Commands

### 1. Test Configuration (Dry Run)
Always test first without actually publishing:
```bash
zapstore publish --no-overwrite-app --no-overwrite-release
```

This will:
- Validate your zapstore.yaml
- Check asset files exist
- Show what would be published
- NOT broadcast to relays

### 2. Initial Publish
When ready to publish for the first time:
```bash
zapstore publish
```

### 3. Update Existing Release
To update an already published app:
```bash
zapstore publish --overwrite-release
```

## Publishing Process

### What Happens When You Publish

1. **Local Asset Processing**
   - Reads `zapstore.yaml` configuration
   - Locates APK at `android/app/build/outputs/apk/debug/app-debug.apk`
   - Finds icon at `assets/images/icon.png`

2. **Upload to Blossom Servers**
   - Uploads APK to decentralized CDN
   - Servers configured: cdn.zapstore.dev, blossom.primal.net
   - Returns hash-based URLs for assets

3. **Nostr Event Creation**
   - Creates kind 30063 event with app metadata
   - Signs with your nsec from .env
   - Includes download links, descriptions, version info

4. **Broadcast to Relays**
   - Publishes to relay.zapstore.dev (requires whitelist)
   - Also broadcasts to other Nostr relays
   - App becomes discoverable immediately

## Important Notes

### Source of APK
- **Publishing from**: LOCAL FILES (not GitHub)
- **APK Location**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Must build locally** before each publish

### App Identification
- **Package ID**: `com.anonymous.runstr.project`
- **App Name**: RUNSTR
- **Version**: 0.0.1 (from CHANGELOG.md)

### Security Considerations
- Keep your nsec private (already in .gitignore)
- Never commit .env to git
- Consider using dedicated publishing key

## Updating the App

To release a new version:

1. **Update Code** - Make your changes
2. **Update Version** - In `android/app/build.gradle`
3. **Update Changelog** - Add new version to CHANGELOG.md
4. **Build APK** - `./gradlew assembleDebug` or `assembleRelease`
5. **Test Locally** - Install and verify the APK works
6. **Publish Update** - `zapstore publish --overwrite-release`

## Adding Screenshots

Currently no screenshots are included. To add them:

1. Take screenshots of key features:
   - Teams discovery screen
   - Profile with workout history
   - Captain dashboard
   - Active competition/leaderboard
   - Workout social card

2. Save to `assets/screenshots/` with descriptive names

3. Update `zapstore.yaml`:
   ```yaml
   images:
     - assets/screenshots/teams.png
     - assets/screenshots/profile.png
     - assets/screenshots/captain-dashboard.png
   ```

## Troubleshooting

### "Event rejection" Error
- **Cause**: Not whitelisted on relay.zapstore.dev
- **Solution**: Contact Zapstore team via Nostr for whitelist

### "File not found" Error
- **Cause**: APK not built or wrong path
- **Solution**: Run `./gradlew assembleDebug` first

### Large APK Size Warning
- **Current**: 195MB (debug build)
- **Solution**: Create release build for smaller size

### YAML Parsing Errors
- **Cause**: Incorrect YAML syntax in zapstore.yaml
- **Solution**: Ensure proper indentation and list formatting

## Benefits of Zapstore Distribution

- **Nostr Native**: Perfect for RUNSTR's Nostr-based architecture
- **No Gatekeepers**: Permissionless app distribution
- **Bitcoin Friendly**: Users can zap the app directly
- **Data Sovereignty**: Aligns with RUNSTR's philosophy
- **Direct Updates**: Push updates without app store approval

## Contact & Support

- **Zapstore Team**: Contact via Nostr for whitelisting
- **Documentation**: https://zapstore.dev/docs
- **RUNSTR Repository**: https://github.com/dakotabrown/runstr.project

## Quick Reference

```bash
# Build APK
cd android && ./gradlew assembleDebug

# Test configuration
zapstore publish --no-overwrite-app --no-overwrite-release

# Publish to Zapstore
zapstore publish

# Update existing app
zapstore publish --overwrite-release
```

Remember: Always test with dry run before actual publishing!