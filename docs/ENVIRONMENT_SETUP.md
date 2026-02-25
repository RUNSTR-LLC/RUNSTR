# Environment Setup Guide

## Overview

RUNSTR uses environment variables to securely store sensitive configuration like Lightning wallet connection strings and API keys. These values are stored in a `.env` file that is **never committed to version control**.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values** in the `.env` file

3. **Never commit `.env`** - it's already in `.gitignore`

## Required Variables

### REWARD_SENDER_NWC (Required for Automated Rewards)

The NWC (Nostr Wallet Connect) connection string for the wallet that sends automated workout rewards to users.

**Format:**
```
REWARD_SENDER_NWC=nostr+walletconnect://pubkey?relay=wss://...&secret=...
```

**How to get this:**
1. Open your Lightning wallet (Alby, etc.)
2. Go to Settings → Nostr Wallet Connect
3. Create a new connection with permissions:
   - `pay_invoice` (required for sending rewards)
   - `get_balance` (optional, for monitoring)
4. Copy the connection string (starts with `nostr+walletconnect://`)
5. Paste into your `.env` file

**Security Note:**
- This connection string has spending power - treat it like a password
- Never share it or commit it to git
- Use a dedicated wallet with limited balance for rewards
- Consider setting spending limits in your wallet app

## Optional Variables

### EXPO_PUBLIC_COINOS_API_BASE
CoinOS Lightning API base URL (legacy, may not be needed)

### EXPO_PUBLIC_RUNSTR_LIGHTNING_ADDRESS
Lightning address for RUNSTR operations

### EXPO_PUBLIC_OPENWEATHER_API_KEY
OpenWeather API key used for weather-based activity context (client-side key, expected by current weather service).

### OAuth Configuration (Future Use)
- `EXPO_PUBLIC_APPLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`

## Environment Variable Types

### Client-Side Variables (`EXPO_PUBLIC_` prefix)
Variables prefixed with `EXPO_PUBLIC_` are bundled into the app and accessible on the client side. Only use this prefix for non-sensitive, public configuration.

**Example:**
```bash
EXPO_PUBLIC_API_BASE=https://api.example.com
```

### Build-Time Variables (no prefix)
Variables without the prefix are only available during build time and should be used for sensitive secrets like `REWARD_SENDER_NWC`.

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use `.env.example`** - Template with placeholder values (safe to commit)
3. **Limit wallet permissions** - Only grant necessary NWC permissions
4. **Use dedicated wallets** - Don't use personal wallets for app operations
5. **Monitor spending** - Regularly check reward wallet balance
6. **Rotate secrets** - Update connection strings if compromised

## Troubleshooting

### "Cannot read environment variable"
- Verify `.env` file exists in project root
- Check variable names match exactly (case-sensitive)
- Rebuild app after changing `.env`: `npx expo start --clear`

### "Reward payments failing"
- Verify `REWARD_SENDER_NWC` connection string is valid
- Check wallet has sufficient balance
- Confirm NWC permissions include `pay_invoice`
- Test connection string in wallet app

### "Environment variables not updating"
- Clear Metro cache: `npx expo start --clear`
- Restart development server
- For iOS: Clean build folder in Xcode

## Architecture Notes

### Alby MCP Integration
The reward system uses Alby MCP (Model Context Protocol) tools for Lightning operations. The `REWARD_SENDER_NWC` variable is currently defined but not yet fully integrated.

**TODO: Implementation needed**
- Configure Alby MCP to use `REWARD_SENDER_NWC` for reward payments
- Currently, `DailyRewardService.sendReward()` uses the user's wallet
- Need to modify `NWCWalletService` to support multiple NWC connections (user's wallet + reward sender wallet)

**See:** `src/services/rewards/DailyRewardService.ts` lines 182-184

## References

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Nostr Wallet Connect (NIP-47)](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [Alby NWC Guide](https://guides.getalby.com/user-guide/alby-account-and-browser-extension/alby-hub/nwc)
