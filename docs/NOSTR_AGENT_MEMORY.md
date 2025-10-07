# Nostr Agent Memory
*Auto-maintained by Nostr Development Expert Agent*

## Purpose
This file stores institutional knowledge, best practices, and lessons learned from successful Nostr implementations in the RUNSTR app. The agent updates this after each successful task.

---

## Successful Patterns

### Global NDK Instance (CRITICAL)
**What**: Single shared NDK instance via `GlobalNDKService`
**Why**: Prevents connection explosion (9 services × 4 relays = 36 connections → 4 connections)
**How**:
```typescript
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';
const ndk = await GlobalNDKService.getInstance();
const events = await ndk.fetchEvents(filter);
```
**Never**: Create new `NDK()` or `NostrRelayManager()` instances

### Event Querying Best Practices
**Pattern**: Use `fetchEvents()` for one-time queries, `subscribe()` for real-time
**Caching**: 5-min for team data, 1-min for competition queries
**Filters**: Always include `kinds` and `limit` to prevent unbounded queries

### Kind 30000 Member Lists (Single Source of Truth)
**What**: Team membership stored in replaceable Nostr lists
**Query Pattern**:
```typescript
const filter: NDKFilter = {
  kinds: [30000],
  authors: [teamCaptainPubkey],
  '#d': [teamId]
};
```
**Access**: `event.tags.filter(tag => tag[0] === 'p').map(tag => tag[1])`

---

## Anti-Patterns to Avoid

### ❌ Never Mix Libraries
- **Problem**: Using `nostr-tools` alongside NDK causes crypto initialization errors
- **Solution**: NDK has everything needed (key generation, nip19, signing)

### ❌ Don't Create NDK Instances Per Service
- **Problem**: Each instance creates new relay connections (performance killer)
- **Solution**: Always use `GlobalNDKService.getInstance()`

### ❌ Unbounded Queries
- **Problem**: Queries without `limit` or time bounds can hang the app
- **Solution**: Always set reasonable limits (default: 100-500 depending on kind)

---

## Performance Optimizations

### Caching Strategy
- **Team Member Lists**: 5-minute cache (infrequent changes)
- **Competition Queries**: 1-minute cache (real-time feel without spam)
- **Profile Data**: Session-length cache (rarely changes)

### Query Optimization
- Use `since`/`until` for time-bounded competitions
- Filter by `authors` array when querying team member workouts
- Batch queries when possible (single NDK call for multiple filters)

---

## Event Kind Reference Quick Guide

| Kind | Purpose | Query Frequency | Cache Duration |
|------|---------|-----------------|----------------|
| 0 | Profile metadata | On-demand | Session |
| 1 | Social posts | Real-time | None |
| 1301 | Workout events | Frequent | 1 min |
| 30000 | Team member lists | Moderate | 5 min |
| 30100 | League definitions | Infrequent | 10 min |
| 30101 | Event definitions | Infrequent | 10 min |
| 33404 | Team metadata | Moderate | 5 min |

---

## Recent Implementations
*Agent will add entries here after successful tasks*

---

## Debug Checklist
When Nostr queries fail, check:
1. ✅ Using `GlobalNDKService.getInstance()`?
2. ✅ Filter includes `kinds` array?
3. ✅ Filter has reasonable `limit`?
4. ✅ Relay connection status checked?
5. ✅ Error handling with try-catch?
6. ✅ Results being cached appropriately?

---

*Last updated: 2025-01-06*
