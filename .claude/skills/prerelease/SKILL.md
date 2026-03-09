---
name: prerelease
description: Create a RUNSTR pre-release. Use when the user says "prerelease", "pre-release", "create a release", "build release", "release the app", or "ship it". Handles changelog, version bumps, APK build, and GitHub release creation.
version: 1.0.0
metadata:
  tags: release, build, apk, github, changelog, version
---

# RUNSTR Pre-Release Skill

Creates a pre-release for RUNSTR: updates changelog, bumps version numbers across all config files, builds the Android APK, and creates a GitHub pre-release with the APK attached.

## Pre-Release Workflow

When invoked, execute these steps in order:

### Step 1: Determine Version

Check the current branch name and version numbers:
```bash
git branch --show-current
```
The branch name IS the version (e.g., `v1.7.0`). Extract the version string (without the `v` prefix for files that need it).

### Step 2: Gather Changes

Get all commits since the last release tag to build the changelog:
```bash
# Find the previous release tag
git tag --list --sort=-v:refname | head -5

# List commits since last release
git log <last-tag>..HEAD --oneline
```

Group commits by type using their prefix (`Fix:`, `Feature:`, `Refactor:`, `Chore:`, `Docs:`).

### Step 3: Update CHANGELOG.md

Read `/Users/dakotabrown/runstr.project/CHANGELOG.md` and update (or create) the entry for the current version at the top of the file.

**Format:**
```markdown
## [VERSION] - YYYY-MM-DD - Short Title

### Features
- Feature description (from Feature: commits)

### Bug Fixes
- Fix description (from Fix: commits)

### Improvements
- Improvement description (from Refactor:/Chore: commits)
```

Use today's date. Write concise, user-facing descriptions (not raw commit messages). Group related changes together.

### Step 4: Sync Version Numbers

Update ALL of these files to match the release version. **Missing even one causes build failures.**

| File | Fields | Example |
|------|--------|---------|
| `package.json` | `version` | `"1.7.0"` |
| `app.json` | `expo.version` | `"1.7.0"` |
| `app.json` | `expo.android.versionCode` | `170` (increment by 1 from previous) |
| `ios/RUNSTR/Info.plist` | `CFBundleShortVersionString` | `1.7.0` |
| `ios/RUNSTR/Info.plist` | `CFBundleVersion` | `170` (match versionCode) |
| `android/app/build.gradle` | `versionCode` | `170` |
| `android/app/build.gradle` | `versionName` | `"1.7.0"` |

**Version code strategy:** Use the version without dots as an integer. Example: 1.7.0 = 170, 1.7.1 = 171, 1.8.0 = 180.

**IMPORTANT:** `app.json` versionCode and `build.gradle` versionCode MUST match. `Info.plist` CFBundleVersion should also match.

### Step 5: Run Typecheck

```bash
npm run typecheck
```

Verify no new errors introduced. Pre-existing errors are OK.

### Step 6: Commit Version Bump

```bash
# Stage only the version/changelog files
git add package.json app.json ios/RUNSTR/Info.plist android/app/build.gradle CHANGELOG.md

# Commit
git commit -m "Chore: Bump version to VERSION and update changelog"

# Push
git push -u origin BRANCH_NAME
```

### Step 7: Build Android APK

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Clean and build (takes 3-5 minutes)
cd /Users/dakotabrown/runstr.project/android && ./gradlew clean && ./gradlew assembleRelease && cd /Users/dakotabrown/runstr.project
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

Verify the APK was built:
```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

### Step 8: Create GitHub Pre-Release

Copy the APK with a versioned name and create the release:
```bash
# Copy APK with version name
cp android/app/build/outputs/apk/release/app-release.apk /tmp/RUNSTR-vVERSION.apk

# Create pre-release with APK attached
gh release create vVERSION \
  --title "RUNSTR vVERSION - SHORT_TITLE" \
  --prerelease \
  --notes-file - \
  /tmp/RUNSTR-vVERSION.apk <<'EOF'
## What's New in VERSION

CHANGELOG_CONTENT_HERE

---

### Install
Download the APK below and install on Android. iOS builds available via TestFlight.

### Report Issues
https://github.com/RUNSTR-LLC/RUNSTR/issues
EOF
```

### Step 9: Verify

```bash
# Confirm release exists
gh release view vVERSION

# Confirm APK is attached
gh release view vVERSION --json assets --jq '.assets[].name'
```

Report the release URL to the user.

## Important Notes

- **Always build from the version branch**, not main. Main gets the code via PR merge after testing.
- **Pre-releases** use the `--prerelease` flag. Only remove it for production releases.
- **APK signing** uses the debug keystore (fine for direct distribution, not Play Store).
- **iOS builds** are handled separately via Xcode/TestFlight — this skill only builds Android APK.
- **If the APK build fails**, check that JAVA_HOME is set correctly and Android SDK is installed.
- **The versionCode must always increase** — Google Play and Android both reject downgrades.
