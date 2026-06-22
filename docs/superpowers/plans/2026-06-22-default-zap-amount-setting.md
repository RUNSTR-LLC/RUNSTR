# Default Zap Amount Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let NWC-connected users change their default one-tap zap amount from Settings → Wallet, next to the NWC connection.

**Architecture:** One-tap NWC zapping already works; the feed reads the default amount from AsyncStorage key `@runstr:default_zap_amount` on mount. We add (1) a shared constants module so the key/fallback/presets have one source of truth, (2) a self-contained `DefaultZapAmountSetting` component that reads/writes that key with preset chips + a custom input, and (3) wiring it into `WalletSection`'s connected-NWC branch. Existing consumers are swapped to the shared key constant.

**Tech Stack:** React Native + TypeScript (Expo), AsyncStorage, existing `theme` + `settingsStyles`.

## Global Constraints

- **500-line file limit** — keep new/edited files under 500 lines.
- **Terminology firewall (in-app UI):** user-facing copy uses "zap" only where it already appears in this surface; do NOT introduce "sats" in new prominent labels beyond matching the existing in-context unit. Existing code in this area already shows "sats" as the unit next to amounts — match that local convention, do not expand it. No "Bitcoin"/"Lightning"/"Nostr" in new user-facing strings.
- **No emojis, strict minimalism** — black/orange (`theme.colors.text` / `theme.colors.accent`) only; reuse existing `settingsStyles` patterns.
- **No new dependencies.**
- **Real data only** — no mock data.
- **Do NOT change** the existing `50` feed fallback or `NWCLightningButton`'s own `21` fallback. Behavior of one-tap zap logic stays identical; we only expose the value in Settings.
- Run `npm run typecheck` before every commit (it currently passes clean).

---

### Task 1: Shared zap constants module

**Files:**
- Create: `src/constants/zap.ts`
- Test: `scripts/verify/verify-default-zap-constants.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `DEFAULT_ZAP_AMOUNT_KEY: string` = `'@runstr:default_zap_amount'`
  - `DEFAULT_ZAP_AMOUNT_FALLBACK: number` = `50`
  - `ZAP_AMOUNT_PRESETS: number[]` = `[21, 50, 100, 500, 1000]`
  - `parseStoredZapAmount(stored: string | null): number` — returns a positive integer parsed from `stored`, or `DEFAULT_ZAP_AMOUNT_FALLBACK` when `stored` is null/empty/non-numeric/≤ 0.

- [ ] **Step 1: Write the verification script (expect it to fail — module missing)**

Create `scripts/verify/verify-default-zap-constants.ts`:

```ts
/**
 * Verifies the shared zap constants and parseStoredZapAmount behavior.
 * Run: npx tsx scripts/verify/verify-default-zap-constants.ts
 */
import {
  DEFAULT_ZAP_AMOUNT_KEY,
  DEFAULT_ZAP_AMOUNT_FALLBACK,
  ZAP_AMOUNT_PRESETS,
  parseStoredZapAmount,
} from '../../src/constants/zap';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); }
  else console.log(`ok: ${name}`);
}

check('key unchanged', DEFAULT_ZAP_AMOUNT_KEY === '@runstr:default_zap_amount');
check('fallback is 50', DEFAULT_ZAP_AMOUNT_FALLBACK === 50);
check('presets', JSON.stringify(ZAP_AMOUNT_PRESETS) === JSON.stringify([21, 50, 100, 500, 1000]));

check('null -> fallback', parseStoredZapAmount(null) === 50);
check('empty -> fallback', parseStoredZapAmount('') === 50);
check('non-numeric -> fallback', parseStoredZapAmount('abc') === 50);
check('zero -> fallback', parseStoredZapAmount('0') === 50);
check('negative -> fallback', parseStoredZapAmount('-5') === 50);
check('valid 500', parseStoredZapAmount('500') === 500);
check('valid with text suffix', parseStoredZapAmount('500sats') === 500); // parseInt tolerates trailing text
check('decimal floors', parseStoredZapAmount('21.9') === 21);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nAll checks passed');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/verify/verify-default-zap-constants.ts`
Expected: FAIL — cannot resolve `../../src/constants/zap`.

- [ ] **Step 3: Create the constants module**

Create `src/constants/zap.ts`:

```ts
/**
 * Shared constants for the default one-tap zap amount.
 * Single source of truth for the AsyncStorage key, fallback, and presets
 * used by the feed zap button, the external zap modal, the lightning button,
 * and the Wallet settings editor.
 */

/** AsyncStorage key holding the user's default zap amount (in sats). */
export const DEFAULT_ZAP_AMOUNT_KEY = '@runstr:default_zap_amount';

/** Fallback used when no value is stored (sats). */
export const DEFAULT_ZAP_AMOUNT_FALLBACK = 50;

/** Quick-pick presets shown in the settings editor (sats). */
export const ZAP_AMOUNT_PRESETS = [21, 50, 100, 500, 1000];

/**
 * Parse a stored zap amount into a positive integer.
 * Returns DEFAULT_ZAP_AMOUNT_FALLBACK for null/empty/non-numeric/non-positive input.
 */
export function parseStoredZapAmount(stored: string | null): number {
  if (!stored) return DEFAULT_ZAP_AMOUNT_FALLBACK;
  const parsed = parseInt(stored, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ZAP_AMOUNT_FALLBACK;
  return parsed;
}
```

- [ ] **Step 4: Run the verification script to verify it passes**

Run: `npx tsx scripts/verify/verify-default-zap-constants.ts`
Expected: PASS — "All checks passed".

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/constants/zap.ts scripts/verify/verify-default-zap-constants.ts
git commit -m "Feature: shared zap amount constants + parser

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: DefaultZapAmountSetting component

**Files:**
- Create: `src/components/settings/DefaultZapAmountSetting.tsx`

**Interfaces:**
- Consumes: `DEFAULT_ZAP_AMOUNT_KEY`, `DEFAULT_ZAP_AMOUNT_FALLBACK`, `ZAP_AMOUNT_PRESETS`, `parseStoredZapAmount` from `src/constants/zap`.
- Produces: default export React component `DefaultZapAmountSetting` (no required props). Self-manages AsyncStorage state.

- [ ] **Step 1: Create the component**

Create `src/components/settings/DefaultZapAmountSetting.tsx`:

```tsx
/**
 * DefaultZapAmountSetting — lets NWC users set their default one-tap zap amount.
 * Reads/writes the shared DEFAULT_ZAP_AMOUNT_KEY consumed by the feed zap button.
 * Rendered inside WalletSection's connected-NWC branch.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { settingsStyles } from '../../screens/settingsStyles';
import {
  DEFAULT_ZAP_AMOUNT_KEY,
  DEFAULT_ZAP_AMOUNT_FALLBACK,
  ZAP_AMOUNT_PRESETS,
  parseStoredZapAmount,
} from '../../constants/zap';

export const DefaultZapAmountSetting: React.FC = () => {
  const [amount, setAmount] = useState<number>(DEFAULT_ZAP_AMOUNT_FALLBACK);
  const [expanded, setExpanded] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY)
      .then((stored) => setAmount(parseStoredZapAmount(stored)))
      .catch(() => setAmount(DEFAULT_ZAP_AMOUNT_FALLBACK));
  }, []);

  const persist = useCallback((value: number) => {
    setAmount(value);
    AsyncStorage.setItem(DEFAULT_ZAP_AMOUNT_KEY, String(value)).catch((err) =>
      console.error('Failed to save default zap amount:', err)
    );
  }, []);

  const onPreset = useCallback((value: number) => {
    setCustomText('');
    persist(value);
  }, [persist]);

  const onCustomCommit = useCallback(() => {
    const parsed = parseInt(customText, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      persist(parsed);
    }
    setCustomText('');
  }, [customText, persist]);

  return (
    <View style={localStyles.container}>
      <TouchableOpacity
        style={settingsStyles.rewardSettingRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={settingsStyles.rewardSettingInfo}>
          <Text style={settingsStyles.rewardSettingTitle}>Default zap amount</Text>
          <Text style={settingsStyles.rewardSettingSubtitle}>
            Used when you tap to zap a post
          </Text>
        </View>
        <Text style={localStyles.value}>{amount} sats</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={localStyles.editor}>
          <View style={localStyles.chipRow}>
            {ZAP_AMOUNT_PRESETS.map((preset) => {
              const selected = preset === amount;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[localStyles.chip, selected && localStyles.chipSelected]}
                  onPress={() => onPreset(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[localStyles.chipText, selected && localStyles.chipTextSelected]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={localStyles.customRow}>
            <Text style={localStyles.customLabel}>Custom</Text>
            <TextInput
              style={localStyles.customInput}
              value={customText}
              onChangeText={setCustomText}
              onBlur={onCustomCommit}
              onSubmitEditing={onCustomCommit}
              keyboardType="number-pad"
              placeholder="amount"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
            />
            <Text style={localStyles.customLabel}>sats</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  editor: {
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  chipTextSelected: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  customLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  customInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Verify theme tokens exist (avoid referencing undefined colors)**

Run: `grep -nE "border:|textMuted:|accent:|background:|text:" src/styles/theme.ts | head`
Expected: confirms `border`, `textMuted`, `accent`, `background`, `text` exist on `theme.colors`. If `border` is absent, substitute the token the file actually uses for hairline borders (e.g. `theme.colors.divider` or `theme.colors.textMuted`) in `localStyles.chip` and `localStyles.customInput`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/DefaultZapAmountSetting.tsx
git commit -m "Feature: DefaultZapAmountSetting editor (chips + custom)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire the setting into WalletSection

**Files:**
- Modify: `src/components/settings/WalletSection.tsx`

**Interfaces:**
- Consumes: `DefaultZapAmountSetting` (default-area) from Task 2.
- Produces: no new props; renders the setting inside the existing `hasNWCWallet` branch.

- [ ] **Step 1: Add the import**

In `src/components/settings/WalletSection.tsx`, after the existing import block (after the `settingsStyles` import on line 13), add:

```tsx
import { DefaultZapAmountSetting } from './DefaultZapAmountSetting';
```

- [ ] **Step 2: Render it in the connected-NWC branch**

In the `hasNWCWallet ? ( ... )` branch, insert `<DefaultZapAmountSetting />` between the connection-status `View` (the block ending `</View>` at line 69) and the "Disconnect Wallet" `TouchableOpacity` (starting line 70). The branch becomes:

```tsx
          {hasNWCWallet ? (
            <>
              <View style={styles.rewardSettingRow}>
                <View style={styles.rewardSettingInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.statusConnected,
                      }}
                    />
                    <Text style={styles.rewardSettingTitle}>NWC Wallet Connected</Text>
                  </View>
                  <Text style={styles.rewardSettingSubtitle}>
                    Your wallet is connected for in-app payments
                  </Text>
                </View>
              </View>
              <DefaultZapAmountSetting />
              <TouchableOpacity
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.error,
                  alignItems: 'center',
                  marginTop: 8,
                }}
                onPress={onDisconnectWallet}
              >
                <Text style={{ fontSize: 14, color: theme.colors.error, fontWeight: '600' }}>
                  Disconnect Wallet
                </Text>
              </TouchableOpacity>
            </>
          ) : (
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/WalletSection.tsx
git commit -m "Feature: show default zap amount setting under connected NWC

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Swap existing consumers to the shared key constant

Swap the duplicated `@runstr:default_zap_amount` magic string (and, in the feed, the duplicated parse/fallback) to the shared constants. Leave each component's own fallback NUMBER behavior unchanged except the feed, which already uses `50` and will now use `parseStoredZapAmount` + `DEFAULT_ZAP_AMOUNT_FALLBACK` (same value, no behavior change). Do NOT change `NWCLightningButton`'s `21` fallback — only its key string.

**Files:**
- Modify: `src/components/social/SocialInteractionRow.tsx` (lines 14–15 imports, 42, 44–48)
- Modify: `src/components/nutzap/ExternalZapModal.tsx:36`
- Modify: `src/components/lightning/NWCLightningButton.tsx:103,290`

**Interfaces:**
- Consumes: `DEFAULT_ZAP_AMOUNT_KEY`, `DEFAULT_ZAP_AMOUNT_FALLBACK`, `parseStoredZapAmount` from `src/constants/zap`.
- Produces: nothing new.

- [ ] **Step 1: SocialInteractionRow — add import**

After the existing `useNWCZap` import (line 15) add:

```tsx
import {
  DEFAULT_ZAP_AMOUNT_KEY,
  DEFAULT_ZAP_AMOUNT_FALLBACK,
  parseStoredZapAmount,
} from '../../constants/zap';
```

- [ ] **Step 2: SocialInteractionRow — use the fallback constant in state init**

Change line 42 from:

```tsx
  const [defaultZapAmount, setDefaultZapAmount] = useState(50);
```

to:

```tsx
  const [defaultZapAmount, setDefaultZapAmount] = useState(DEFAULT_ZAP_AMOUNT_FALLBACK);
```

- [ ] **Step 3: SocialInteractionRow — use the key + parser in the effect**

Change the effect (lines 44–48) from:

```tsx
  useEffect(() => {
    AsyncStorage.getItem('@runstr:default_zap_amount').then((stored) => {
      if (stored) setDefaultZapAmount(parseInt(stored, 10) || 50);
    });
  }, []);
```

to:

```tsx
  useEffect(() => {
    AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY)
      .then((stored) => setDefaultZapAmount(parseStoredZapAmount(stored)))
      .catch(() => {});
  }, []);
```

- [ ] **Step 4: ExternalZapModal — replace the local key constant**

Add to the import block (after line 21 `AsyncStorage` import is fine, or with other constants), then replace the local declaration. Change line 36 from:

```tsx
const DEFAULT_AMOUNT_KEY = '@runstr:default_zap_amount';
```

to:

```tsx
import { DEFAULT_ZAP_AMOUNT_KEY } from '../../constants/zap';
```

…placed in the import section at top (not mid-file). Then update every in-file reference of `DEFAULT_AMOUNT_KEY` to `DEFAULT_ZAP_AMOUNT_KEY`.

- [ ] **Step 5: ExternalZapModal — confirm all references swapped**

Run: `grep -n "DEFAULT_AMOUNT_KEY" src/components/nutzap/ExternalZapModal.tsx`
Expected: no output (all replaced). If any remain, replace them with `DEFAULT_ZAP_AMOUNT_KEY`.

- [ ] **Step 6: NWCLightningButton — import and swap the key string only**

Add to the import block (after line 27):

```tsx
import { DEFAULT_ZAP_AMOUNT_KEY } from '../../constants/zap';
```

Change line 103 from:

```tsx
      const stored = await AsyncStorage.getItem('@runstr:default_zap_amount');
```

to:

```tsx
      const stored = await AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY);
```

And change lines 289–292 from:

```tsx
      await AsyncStorage.setItem(
        '@runstr:default_zap_amount',
        newDefault.toString()
      );
```

to:

```tsx
      await AsyncStorage.setItem(DEFAULT_ZAP_AMOUNT_KEY, newDefault.toString());
```

(Leave the `const DEFAULT_ZAP_AMOUNT = 21;` on line 28 untouched — it is this component's own fallback, not the storage key.)

- [ ] **Step 7: Confirm no raw key strings remain outside the constants module**

Run: `grep -rn "'@runstr:default_zap_amount'" src`
Expected: no output (every consumer now references the constant). The only remaining definition is in `src/constants/zap.ts`.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/social/SocialInteractionRow.tsx src/components/nutzap/ExternalZapModal.tsx src/components/lightning/NWCLightningButton.tsx
git commit -m "Refactor: use shared zap amount key constant across consumers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Re-run the constants verification script**

Run: `npx tsx scripts/verify/verify-default-zap-constants.ts`
Expected: "All checks passed".

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no new errors versus baseline.

- [ ] **Step 3: Confirm single source of truth**

Run: `grep -rn "default_zap_amount" src`
Expected: the raw string appears only in `src/constants/zap.ts`; all other hits reference `DEFAULT_ZAP_AMOUNT_KEY`.

- [ ] **Step 4: Manual simulator verification (per CLAUDE.md sim workflow — erase + reinstall)**

  1. Launch app, connect an NWC wallet (Settings → Wallet → Paste NWC / Scan QR).
  2. Settings → Wallet → "Connected Wallet": confirm "Default zap amount" row appears showing "50 sats".
  3. Tap it → tap the `500` chip → row updates to "500 sats".
  4. Enter `250` in Custom, blur → row updates to "250 sats".
  5. Go to the Social feed, single-tap the ⚡ on a post → confirm the success toast and that the zap used 250 sats (check recipient/wallet or logs).
  6. Force-quit + relaunch → Settings → Wallet → confirm "Default zap amount" still shows "250 sats".
  7. Disconnect the wallet → confirm the "Default zap amount" row disappears (only shown when NWC connected).

Report results. If a step fails, debug before claiming completion.

---

## Self-Review

**Spec coverage:**
- Shared constant (key/fallback/presets) → Task 1. ✓
- `DefaultZapAmountSetting` component (chips + custom, own AsyncStorage state, immediate persist, validation) → Task 2. ✓
- Shown only when NWC connected, under status row → Task 3. ✓
- Swap existing consumers to shared constant (user explicitly approved) → Task 4 (covers the third consumer `NWCLightningButton` found during planning). ✓
- 50 fallback unchanged; feed logic unchanged → enforced in Global Constraints + Task 4 notes. ✓
- Testing: tsx verify script + typecheck + manual sim → Tasks 1, 5. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; validation is concrete (`parseStoredZapAmount`, custom-input guard). ✓

**Type consistency:** `DEFAULT_ZAP_AMOUNT_KEY`, `DEFAULT_ZAP_AMOUNT_FALLBACK`, `ZAP_AMOUNT_PRESETS`, `parseStoredZapAmount` used identically across Tasks 1–4. Component name `DefaultZapAmountSetting` consistent across Tasks 2–3. ✓

**Note on theme tokens:** Task 2 Step 2 guards against a missing `theme.colors.border` by verifying tokens before commit and giving a substitution rule — the one place the plan can't fully pre-verify without reading `theme.ts` at execution time.
