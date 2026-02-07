# Config

Application-level configuration constants for rewards, features, charity payments, and encrypted secrets.

## Files

- **rewards.ts** - Rewards configuration including NWC connection string (fallback), daily workout reward amount, and step reward thresholds.
- **features.ts** - Feature flags controlling which features are enabled (NWC wallet, daily rewards, charity zaps, event tickets, and internal experiment flags).
- **charityPayments.ts** - Configuration for charities with known payment routing issues. Defines retry-eligible charities (intermittent failures) and batch-payment charities (minimum amount requirements).
- **encryptedSecrets.ts** - Auto-generated placeholder file for encrypted secrets (reward NWC, attestation nsec). Actual values are decrypted at runtime via secretDecryptor.ts.
