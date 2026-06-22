# Default Zap Amount Setting — Design

**Date:** 2026-06-22
**Status:** Approved (design)

## Problem

NWC-connected users can already one-tap zap posts on the social feed — connecting an
NWC makes the feed's ⚡ button send an immediate zap for a default amount (no modal,
no copy-invoice). That path is live (`SocialInteractionRow` → `useNWCZap` →
`NWCWalletService.payLightningAddress`).

The gap: the **default zap amount** can currently only be changed via a "set as default"
checkbox buried inside the `ExternalZapModal`. There is no way to set it from Settings,
and nothing near the NWC connection. We want NWC users to change their default zap amount
right where they manage their wallet connection.

**Out of scope (explicitly decided):**
- No change to the existing `50` sats fallback (the original "make it 500" idea was dropped).
- No change to feed zap logic — it already reads the stored value on mount.
- No migration of existing stored values.

## How it works today

- Stored value: AsyncStorage key `@runstr:default_zap_amount`.
- `SocialInteractionRow.tsx:42` reads this key on mount, falling back to `50` if unset.
- `ExternalZapModal` reads the same key and writes it via its "set as default" checkbox.
- The key string and `50` fallback are duplicated as magic values across these files.

## Design

### 1. Shared constant (small cleanup of code we're touching)

Add `src/constants/zap.ts`:

```ts
export const DEFAULT_ZAP_AMOUNT_KEY = '@runstr:default_zap_amount';
export const DEFAULT_ZAP_AMOUNT_FALLBACK = 50; // sats
export const ZAP_AMOUNT_PRESETS = [21, 50, 100, 500, 1000]; // sats
```

Use it in the new setting. Optionally (low risk) replace the duplicated magic string/number
in `SocialInteractionRow` and `ExternalZapModal` with these constants so the value has a
single source of truth. This is in-scope-because-we're-here, not an unrelated refactor.

### 2. New component: `DefaultZapAmountSetting`

`src/components/settings/DefaultZapAmountSetting.tsx` — a self-contained settings row that
owns its own AsyncStorage state. Keeps `WalletSection` from accreting state/logic and stays
well under the 500-line limit.

Responsibilities:
- On mount, read `DEFAULT_ZAP_AMOUNT_KEY` (fallback `DEFAULT_ZAP_AMOUNT_FALLBACK`).
- Render a row: label "Default zap amount" + current value (e.g. "50 sats").
- Tapping the row reveals the editor inline:
  - Preset chips: `21 / 50 / 100 / 500 / 1000` (from `ZAP_AMOUNT_PRESETS`). The chip
    matching the current value is highlighted (accent).
  - A numeric "Custom" input (keyboardType numeric) for any other value.
- Persist immediately on selection/valid custom entry: write the integer sat value back to
  `DEFAULT_ZAP_AMOUNT_KEY` and update the displayed value.
- Validation: positive integer, sane upper bound (e.g. reject ≤ 0; clamp/ignore non-numeric).
  Custom input commits on blur or chip tap.

Styling: reuse `settingsStyles` patterns from `WalletSection` (rewardSettingRow / titles /
subtitles). Black + orange/accent only, no emojis, minimal — consistent with house style.

### 3. Wire into `WalletSection`

In `WalletSection.tsx`, render `<DefaultZapAmountSetting />` inside the "Connected Wallet"
subsection, in the `hasNWCWallet` branch, directly below the connection-status row and above
(or below) the "Disconnect Wallet" button. It is **only shown when an NWC is connected**,
since one-tap zap only applies to NWC users.

`WalletSection` stays a presentational component; the new child manages its own storage, so
no new props need to thread through `SettingsScreen`.

## Data flow

```
DefaultZapAmountSetting  --writes-->  AsyncStorage[@runstr:default_zap_amount]
                                              |
SocialInteractionRow (on next mount) --reads--+--> one-tap zap amount
ExternalZapModal (set-as-default)    --reads/writes--^
```

Feed picks up the new value the next time `SocialInteractionRow` mounts (returning to the
feed re-mounts it). No event bus / live propagation needed — acceptable per YAGNI.

## Error handling

- AsyncStorage read failure → fall back to `DEFAULT_ZAP_AMOUNT_FALLBACK`, no crash.
- AsyncStorage write failure → keep the in-memory selection, log; non-fatal (worst case the
  value reverts next launch).
- Invalid custom input (empty / non-numeric / ≤ 0) → ignore, retain previous value.

## Testing / verification

- `npm run typecheck`.
- Verification script in `scripts/verify/` exercising the read/write contract against the
  constant key (e.g. write 500 via the same key, assert read-back parses to 500, assert
  unset → fallback 50).
- Manual (simulator): connect NWC → Settings → Wallet → set default to 500 → return to feed
  → single-tap zap sends 500. Set custom value → confirm persisted across app relaunch.

## Files touched

| File | Change |
|------|--------|
| `src/constants/zap.ts` | New — key, fallback, presets |
| `src/components/settings/DefaultZapAmountSetting.tsx` | New — the editor row |
| `src/components/settings/WalletSection.tsx` | Render the setting in the connected-NWC branch |
| `src/components/social/SocialInteractionRow.tsx` | (optional) use shared constants |
| `src/components/nutzap/ExternalZapModal.tsx` | (optional) use shared constants |
