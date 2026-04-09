Security review for RUNSTR. Dispatches parallel agents to find secret exposure, input validation gaps, auth edge cases, permission issues, and dependency risks. Report-only, scoped to src/.

## Phase 1: Quick Metrics (run in parallel)

```bash
grep -rn 'nsec1\|sk1[a-z0-9]\{58\}\|AKIA[A-Z0-9]\{16\}\|Bearer \|api[_-]key\|apiKey\|secret[_-]key\|secretKey' src/ --include='*.ts' --include='*.tsx' | grep -v '//\|test\|mock\|example\|placeholder' | head -20
```

```bash
grep -rn 'console\.log.*key\|console\.log.*secret\|console\.log.*nsec\|console\.log.*token\|console\.log.*password' src/ --include='*.ts' --include='*.tsx' | head -20
```

```bash
grep -rn '\.insert(\|\.update(\|\.upsert(' src/services/ --include='*.ts' | wc -l
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Secret & Key Exposure Scanner
Prompt: "Audit RUNSTR for exposed secrets, keys, and sensitive data in source code. Scope: src/ only.

Search for:

1. **Hardcoded private keys**: Any nsec (Nostr private key), hex private key, or signing material hardcoded in source files. Search for patterns: 'nsec1', 64-character hex strings assigned to key/secret variables, any string that looks like a private key.

2. **API keys in source**: Supabase anon keys are OK (they're public), but check for: Supabase service_role keys, external API keys (OpenAI, Anthropic, etc.), webhook secrets, NWC connection strings with secrets.

3. **Secrets in console.log**: Any console.log/warn/error that outputs private keys, tokens, passwords, nsecs, or connection strings. Even in debug mode, these can leak to crash reporters.

4. **Sensitive data in AsyncStorage**: Check what's stored in AsyncStorage — are private keys stored? Are they encrypted? Read src/services/auth/SecureNsecStorage.ts to verify nsec handling. Check if any other service stores sensitive data in plain AsyncStorage.

5. **Keys in URLs or query params**: Check for patterns where secrets are passed as URL parameters (which get logged by servers and appear in browser history). Look for: URL strings containing 'key=', 'token=', 'secret='.

6. **Environment variable coverage**: Check if sensitive values come from environment variables (process.env, Constants.expoConfig) rather than hardcoded values. Verify .env is in .gitignore.

For EACH finding: file:line, severity (CRITICAL/HIGH/MEDIUM/LOW), what the exposure is, and remediation."

### Agent 2: Input Validation Auditor
Prompt: "Audit RUNSTR services that accept user input for validation and sanitization. Focus on data paths from UI to Supabase.

Check:

1. **Profile updates**: Read services that update user profile data (name, bio, website, picture URL, lud16). Is there length validation? Are special characters sanitized? Could a user inject HTML/script via their display name that would render unsafely in other users' views?

2. **Chat messages**: Read ClubChatService and chat components. Are messages length-limited? Is there content sanitization? Could a user send extremely long messages, messages with control characters, or messages with malicious URLs?

3. **Workout submissions**: Read workoutPublishingService and SupabaseCompetitionService.submitWorkoutSimple(). Could a user submit impossible workout values (negative distance, 999km run, 0-second marathon)? Are there sanity checks on the data?

4. **Club/team creation**: Read services that create clubs or teams. Are club names, descriptions, and URLs validated? Could someone create a club with an XSS payload in the name?

5. **Search inputs**: Any TextInput that feeds into a Supabase .ilike() or .textSearch() query. Could SQL injection occur through search fields? (Supabase parameterizes queries, but check for raw string interpolation.)

6. **Nostr event parsing**: When parsing kind 1301 or other Nostr events from relays, is the event content validated before use? Could a malformed event crash the parser or inject data?

For EACH finding: file:line, severity, the input path (UI field → service → database), and what validation is missing."

### Agent 3: Auth Flow Edge Case Reviewer
Prompt: "Audit RUNSTR's authentication flow for edge cases and security gaps. Read:
- src/screens/LoginScreen.tsx
- src/services/auth/authService.ts
- src/services/auth/SecureNsecStorage.ts
- src/services/auth/UnifiedSigningService.ts
- src/contexts/AuthContext.tsx
- src/App.tsx (auth routing)

Check:

1. **Anonymous user security**: When a user taps 'Start' without logging in, a key pair is generated. Is the private key stored securely? Can an anonymous user access features they shouldn't? What happens if they never back up their key and lose the device?

2. **Session persistence**: How does the app know the user is still authenticated on app restart? Is there token validation or does it just check for a stored key? Could a stale/revoked key still grant access?

3. **nsec handling**: When a user enters their nsec in 'Advanced' login: is it transmitted over the network? Is it stored securely (Keychain/Keystore, not AsyncStorage)? Is it ever logged? Is it cleared on sign-out?

4. **Amber (external signer) integration**: When the user uses Amber for signing: what happens if Amber rejects a signing request? What happens if Amber is uninstalled? Is there a timeout? Are there fallback paths that could bypass signing?

5. **Route guards**: Can any authenticated-only screen be reached without authentication? Check if AppNavigator properly gates screens behind auth state. Are there deep links that could bypass the auth check?

6. **Sign-out completeness**: When the user signs out, is ALL sensitive data cleared? Check: AsyncStorage keys, in-memory caches, Zustand stores, Nostr subscriptions, NWC connections. Could any data leak between user sessions?

For EACH finding: file:line, severity, the attack scenario, and remediation."

### Agent 4: Permission & Access Control Checker
Prompt: "Audit RUNSTR for authorization and access control issues. Check whether users can perform actions they shouldn't.

Look for:

1. **Captain-only features**: Read CaptainDashboardScreen and related services. Are captain actions (create event, add member, manage team settings) properly gated by checking captain status? Could a non-captain call the underlying service methods directly?

2. **Club membership gates**: Can a non-member access club chat? Can a non-member see private club data? Read ClubChatService and ClubPageScreen to verify membership checks.

3. **ID manipulation**: When Supabase queries use user-provided IDs (club_id, user_id, competition_id), could a user modify these to access other users' data? Check if Supabase RLS policies are the enforcement layer or if the client does access checks.

4. **Destructive action confirmation**: Are dangerous actions (delete account, leave club, remove member) properly confirmed? Is there a double-confirmation for irreversible actions? Could they be triggered accidentally?

5. **Rate limiting awareness**: Are there any client-side rate limits on expensive operations (sending messages, submitting workouts, making payments)? Could a user spam the API by calling service methods in a loop?

6. **Data isolation**: When the app handles multiple user contexts (viewing another user's profile, browsing clubs), is there risk of cross-contamination between the current user's data and the viewed data?

For EACH finding: file:line, severity, the unauthorized action that's possible, and remediation."

### Agent 5: Dependency & Transport Security
Prompt: "Audit RUNSTR for dependency and transport layer security issues.

Check:

1. **HTTPS enforcement**: Are ALL external API calls using HTTPS? Check Supabase client configuration, external API calls (Wavlake, PPQ, sponsors), image URLs. Are there any HTTP URLs that could be intercepted?

2. **WSS for relays**: Are Nostr relay connections using WSS (WebSocket Secure)? Check relay URL lists in GlobalNDKService and WoTService. Flag any ws:// (insecure) relay URLs.

3. **eval() and dynamic execution**: Search for eval(), Function(), new Function(), or any dynamic code execution in src/. These are injection vectors.

4. **Dangerous patterns**: Search for: dangerouslySetInnerHTML, innerHTML assignments, webview URL injection, postMessage without origin checking.

5. **Dependency audit**: Read package.json. Check for:
   - Known problematic packages (outdated crypto libraries, abandoned packages with no maintenance)
   - Packages with known security advisories (check for very old versions of popular packages)
   - Dev dependencies that shouldn't be in production
   - Pinned vs floating versions (floating = supply chain risk)

6. **Data in transit**: When workout data, rewards data, or user profile data is sent to Supabase or Nostr relays, is any of it sensitive enough to need encryption beyond HTTPS/WSS? Is NIP-44 encryption used where appropriate?

For EACH finding: file:line or package name, severity, the risk, and remediation."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Security Review — [date]

## Baseline Metrics
- Potential secret exposures found: X
- Secrets in console.log: X
- Supabase write operations: X

## Summary
- Secret/key exposures: X
- Input validation gaps: X
- Auth edge cases: X
- Permission issues: X
- Dependency concerns: X

## Findings by Severity

### Critical (active exploit risk)
[Issues where an attacker could steal keys, access other users' data, or cause data loss]

### High (data exposure possible)
[Issues where sensitive data could leak under specific conditions]

### Medium (defense-in-depth gap)
[Missing validations or checks that should exist but aren't actively exploitable]

### Low (hardening opportunity)
[Best practices not yet followed, theoretical risks]

## Top 5 Recommendations
[Prioritized by risk reduction — what prevents the most damage for least effort]

## Security Score: X/10
[1 = exposed, 10 = hardened. Brief justification.]
```

Present this report to the user. Lead with Critical findings. For each issue, provide enough detail for a developer to fix it immediately.
