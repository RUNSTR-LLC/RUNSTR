# Dead Code Audit Prompt for RUNSTR

Use this prompt with Claude Code (Opus 4.6, medium thinking) to find dead code across the RUNSTR codebase. Copy everything below the line.

---

## Prompt

I need you to find all dead code in this React Native codebase. Dead code means code that is **impossible for a user to trigger** — not code that "might" be unused or "looks" unused. I need 100% certainty before flagging anything.

**Do NOT guess. Do NOT use heuristic-based audit scripts.** The existing `audit-dead-imports.ts` script has proven unreliable — it flags type imports as unused when they are actually used as type annotations. Do not trust it.

### Phase 1: Dead Screens

React Native apps have a known dead code pattern: screens registered in the navigator but never navigated to.

For EVERY screen registered in `src/App.tsx` and `src/navigation/AppNavigator.tsx`:

1. Extract the route name from the `<Stack.Screen name="RouteName"` registration
2. Search the ENTIRE `src/` directory for `navigate('RouteName'` and `navigate("RouteName"` 
3. Also search for `navigation.push('RouteName'` and `navigation.replace('RouteName'`
4. Also check if the route name appears in deep link configuration or URL handling
5. If ZERO navigation calls exist, mark it as a dead screen candidate

For each dead screen candidate, do a second-level check:
- Is it the initial route of any navigator? (Then it's not dead)
- Is it loaded via `require()` from another screen? Check that the calling screen is itself reachable
- Is it referenced in any `onPress`, `onNavigate`, or callback prop that IS wired to a touchable?

Report format for each dead screen:
```
FILE: src/screens/ExampleScreen.tsx
ROUTE: 'ExampleRoute'  
LINES: 450
REGISTERED IN: App.tsx:523
NAVIGATE CALLS FOUND: 0
SECOND-LEVEL CHECK: [pass/fail and why]
VERDICT: DEAD / LIVE
```

### Phase 2: Dead Services

For every file in `src/services/`:

1. Search for imports of this service across all of `src/`
2. Filter out imports that ONLY come from files already identified as dead in Phase 1
3. Filter out imports that are type-only (`import type { X }`) — a service with only type imports may still be dead, but the type needs to be relocated before deletion
4. If the service has ZERO live importers, mark it as dead

**Important edge case:** A service may be imported by another service that is itself only imported by dead screens. Trace the full dependency chain. If every path from a service leads only to dead screens, the service is dead.

Report format:
```
FILE: src/services/example/ExampleService.ts
LINES: 300
IMPORTERS (live): [list files that import it and ARE reachable]
IMPORTERS (dead): [list files that import it but are dead screens/services]
TYPE-ONLY IMPORTERS: [list files that only import types from it]
VERDICT: DEAD / LIVE
```

### Phase 3: Dead Components

For every file in `src/components/`:

1. Search for imports/usage across `src/`
2. Exclude importers that are themselves dead (from Phase 1 & 2)
3. A component rendered only by dead screens is dead

Same report format as Phase 2.

### Phase 4: Dead Exports Within Live Files

This is the trickiest category. For live files, check for exported functions/classes/types that are never imported anywhere:

1. For each `export function`, `export class`, `export const`, `export type`, `export interface` in live service and utility files
2. Search for that exact symbol name being imported in other files
3. If a named export has zero importers, it's a dead export

**Be careful:** Some exports are used via the singleton pattern (`export default ServiceClass.getInstance()`) — the class methods are called on the instance, not imported by name. Only flag exports where you're certain they have no callers.

Report format:
```
FILE: src/services/example/ExampleService.ts (LIVE file)
DEAD EXPORT: exportedFunctionName (line 245)
EVIDENCE: grep for 'exportedFunctionName' returns 0 results outside the defining file
```

### Phase 5: Summary

Provide a final summary table:
```
| Category | Files | Lines | Safe to Delete? |
|----------|-------|-------|----------------|
| Dead screens | N | N | Yes — remove registration + file |
| Dead services | N | N | Yes — but check type re-exports |
| Dead components | N | N | Yes |
| Dead exports | N | N | No — requires editing live files |
| TOTAL | N | N | |
```

### Rules

- **Never flag something as dead if you aren't sure.** False positives are worse than false negatives because they lead to deleting code that's actually used.
- **Run `npm run typecheck` at the end** to list any TypeScript errors — this is the ultimate verification. If typecheck passes after your deletions, the code was truly dead.
- **Do not delete anything.** Only report findings. I will review and decide what to remove.
- **Trace navigation paths from the user's perspective.** The three bottom tabs are Profile, Social, Events. Every screen must be reachable from one of those tabs through a chain of `navigate()` calls.
- **Check for dynamic navigation patterns.** Some screens may be navigated to via `navigation.navigate(variableName)` where the route is computed. Search for the route name as a string literal anywhere, not just in navigate calls.
- The app uses deep links (`eventDeepLink.ts`) — check if any "dead" screens are reachable via deep link.
- Background services that run on app init (registered in `AppInitializationService` or `App.tsx` useEffect) are NOT dead even if no screen imports them.
