# Privacy Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make anonymous signup the default UX and add a Private Mode toggle that prevents workout data from being sent to Supabase.

**Architecture:** Two independent features. (1) LoginScreen UI rearrangement — "Start" stays prominent, "Login" hides behind expandable "Advanced" section. (2) Private Mode — a single early-return check in `SupabaseCompetitionService.submitWorkoutSimple()` + a toggle in SettingsScreen.

**Tech Stack:** React Native, TypeScript, AsyncStorage, Expo

---

### Task 1: Private Mode — Gate at submitWorkoutSimple

The cleanest approach: add a single private mode check at the top of `submitWorkoutSimple()` in `SupabaseCompetitionService.ts`. This gates all 10 call sites with one change.

**Files:**
- Modify: `src/services/backend/SupabaseCompetitionService.ts:305-320`

**Step 1: Add private mode check at top of submitWorkoutSimple**

Add this immediately after the existing `isSupabaseConfigured()` check (line 311), before any other logic:

```typescript
    // Private Mode: skip all Supabase submissions when enabled
    try {
      const privateMode = await AsyncStorage.getItem('@runstr:private_mode');
      if (privateMode === 'true') {
        console.log('[SupabaseCompetitionService] Private mode enabled, skipping Supabase submission');
        return { success: false, error: 'Private mode enabled' };
      }
    } catch {
      // Non-critical — proceed with submission if check fails
    }
```

Add `import AsyncStorage from '@react-native-async-storage/async-storage';` if not already imported.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no new type errors)

**Step 3: Commit**

```bash
git add src/services/backend/SupabaseCompetitionService.ts
git commit -m "Feature: Add Private Mode gate to submitWorkoutSimple"
```

---

### Task 2: Private Mode — Settings toggle UI

Add a "Private Mode" toggle to SettingsScreen, placed prominently near the top (before the Language accordion).

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

**Step 1: Add state and load/save logic**

Add to state declarations (around line 143):
```typescript
const [privateModeEnabled, setPrivateModeEnabled] = useState(false);
```

Add to `loadSettings()` (around line 250, after the autoCompete load):
```typescript
      // Load private mode setting
      const privateMode = await AsyncStorage.getItem('@runstr:private_mode');
      setPrivateModeEnabled(privateMode === 'true');
```

Add handler function (near the other toggle handlers):
```typescript
  const handlePrivateModeToggle = async (value: boolean) => {
    setPrivateModeEnabled(value);
    await AsyncStorage.setItem('@runstr:private_mode', value ? 'true' : 'false');
  };
```

**Step 2: Add toggle UI**

Insert a new `SettingsAccordion` section **before** the Language accordion (before line 797). This creates a "Privacy" section:

```tsx
        {/* Privacy Settings */}
        <View style={styles.section}>
          <SettingsAccordion title="Privacy" defaultExpanded={false}>
            <Card style={styles.accordionCard}>
              <SettingItem
                title="Private Mode"
                subtitle="Workouts stay on your device. Competitions and rewards require this to be off."
                rightElement={
                  <Switch
                    value={privateModeEnabled}
                    onValueChange={handlePrivateModeToggle}
                    trackColor={{
                      false: theme.colors.warning,
                      true: theme.colors.accent,
                    }}
                    thumbColor={theme.colors.orangeBright}
                  />
                }
              />
            </Card>
          </SettingsAccordion>
        </View>
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "Feature: Add Private Mode toggle to Settings"
```

---

### Task 3: LoginScreen — Anonymous-first UX

Rearrange the LoginScreen so "Start" is the hero action and "Login" is behind an "Advanced" dropdown.

**Files:**
- Modify: `src/screens/LoginScreen.tsx:239-280`

**Step 1: Add showAdvanced state**

Add to state declarations (line 46):
```typescript
const [showAdvanced, setShowAdvanced] = useState(false);
```

**Step 2: Replace the button container (lines 241-280)**

Replace the current `{!showInput ? (` block's `buttonContainer` with:

```tsx
                <View style={styles.buttonContainer}>
                  {/* Start button - hero action, generates anonymous npub */}
                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={handleSignUp}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.background}
                      />
                    ) : (
                      <Text style={styles.signupButtonText}>Start</Text>
                    )}
                  </TouchableOpacity>

                  {/* Advanced toggle */}
                  <TouchableOpacity
                    onPress={() => setShowAdvanced(!showAdvanced)}
                    activeOpacity={0.7}
                    style={styles.advancedToggle}
                  >
                    <Text style={styles.advancedToggleText}>
                      Advanced {showAdvanced ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Advanced options (Login) - hidden by default */}
                  {showAdvanced && (
                    <TouchableOpacity
                      style={styles.loginButton}
                      onPress={handleShowInput}
                      activeOpacity={0.8}
                      disabled={isLoading}
                    >
                      <Text style={styles.loginButtonText}>Login</Text>
                    </TouchableOpacity>
                  )}

                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>
```

**Step 3: Also show Amber in the Advanced section**

Move the Amber login button. Currently Amber only shows in the `showInput` (nsec form) section. It should also appear in the Advanced section on Android. Add after the Login button inside the `{showAdvanced && (` block:

```tsx
                  {showAdvanced && Platform.OS === 'android' && (
                    <TouchableOpacity
                      style={styles.amberButton}
                      onPress={handleAmberLogin}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.amberButtonText}>Login with Amber</Text>
                    </TouchableOpacity>
                  )}
```

**Step 4: Add styles for the Advanced toggle**

Add to the StyleSheet:
```typescript
  advancedToggle: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "Feature: Anonymous-first login UX — Start hero, Login behind Advanced"
```

---

### Task 4: Verify in simulator

**Step 1: Reload app in simulator**

Use the runstr-simulator skill or manually:
```bash
DEVICE_ID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; devices=json.load(sys.stdin)['devices']; print([d['udid'] for devs in devices.values() for d in devs if d['state']=='Booted'][0])")
xcrun simctl terminate "$DEVICE_ID" com.anonymous.runstr.project
sleep 1
xcrun simctl launch "$DEVICE_ID" com.anonymous.runstr.project
```

**Step 2: Test login screen**

- Verify "Start" is the prominent button
- Verify "Advanced" text is visible below it
- Tap "Advanced" — verify "Login" button appears
- On Android: verify "Login with Amber" also appears in Advanced section

**Step 3: Test private mode**

- Go to Settings
- Find "Privacy" accordion
- Toggle "Private Mode" ON
- Do a test workout
- Verify workout saves locally but does NOT appear on leaderboard
- Toggle OFF and verify normal behavior resumes

**Step 4: Final commit and push**

```bash
git push -u origin v1.7.0
```
