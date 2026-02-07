# Charity Lightning Address Routing Issues

**Date**: January 18, 2026
**Status**: Critical - Requires Immediate Action

## Executive Summary

Investigation revealed that the RUNSTR NWC wallet (Coinos) cannot route payments to certain Lightning node types. This causes charity donations to fail silently.

## Affected Charities

| Charity | Current Address | Provider | Status | Action Required |
|---------|-----------------|----------|--------|-----------------|
| Human Rights Foundation | `nostr@btcpay.hrf.org` | BTCPay Server | FAILS | Need alternative address |
| Bitcoin Bay | `sats@donate.bitcoinbay.foundation` | Geyser Fund | FAILS | Need alternative address |
| Bitcoin Yucatan | `bitcoinyucatancommunity@geyser.fund` | Geyser Fund | LIKELY FAILS | Need alternative address |
| Central PA Bitcoiners | `businesscat@getalby.com` | Alby | NEEDS TESTING | Test and update if needed |

## Working Providers

These Lightning address providers work with the Coinos NWC wallet:

- **Primal** (`@primal.net`)
- **Strike** (`@strike.me`)
- **Wallet of Satoshi** (`@walletofsatoshi.com`)
- **Blink** (`@blink.sv`)

## Root Cause

The Coinos NWC wallet doesn't have payment channels to reach:
- BTCPay Server nodes (like `btcpay.hrf.org`)
- Geyser Fund nodes (like `geyser.fund`)

This is a Lightning Network routing limitation, not a bug in the app code.

## Action Items

### Immediate (Contact Charities)

1. **HRF (Human Rights Foundation)**
   - Current: `nostr@btcpay.hrf.org`
   - Contact: Request alternative Lightning address using Primal, Strike, or WoS
   - Website: https://hrf.org

2. **Bitcoin Bay**
   - Current: `sats@donate.bitcoinbay.foundation`
   - Contact: Request alternative Lightning address
   - Website: https://geyser.fund/project/bitcoinbayfoundation

3. **Bitcoin Yucatan**
   - Current: `bitcoinyucatancommunity@geyser.fund`
   - Contact: Request Primal or Strike address
   - Website: https://geyser.fund/project/bitcoinyucatancommunity

4. **Central PA Bitcoiners**
   - Current: `businesscat@getalby.com`
   - Action: Test if payments succeed, update if needed

### Technical Improvements (Completed)

- [x] Added `lnurl_response` column to `charity_reward_payments` for debugging
- [x] Created `charity_payment_failures` view for monitoring
- [x] Added `log_charity_payment_failure` operation to edge function
- [x] Added payment verification columns (`workout_preimage`, `step_preimage`)

## Monitoring Queries

### Check Failed Charity Payments
```sql
SELECT
  charity_id,
  charity_name,
  charity_lightning_address,
  COUNT(*) as failure_count,
  MAX(created_at) as last_failure
FROM charity_payment_failures
GROUP BY charity_id, charity_name, charity_lightning_address
ORDER BY failure_count DESC;
```

### Check All Charity Payment Health
```sql
SELECT
  charity_id,
  charity_name,
  status,
  COUNT(*) as count,
  SUM(amount_sats) as total_sats
FROM charity_reward_payments
GROUP BY charity_id, charity_name, status
ORDER BY charity_name, status;
```

## File Locations

- Charity definitions: `src/constants/charities.ts`
- Edge function: `supabase/functions/claim-reward/index.ts`
- Migration (failures): `supabase/migrations/118_charity_payment_failures.sql`
- Migration (verification): `supabase/migrations/119_payment_verification.sql`
