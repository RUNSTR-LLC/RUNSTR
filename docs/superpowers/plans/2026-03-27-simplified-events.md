# Simplified Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify event creation to template + duration + recurring, add XP bonuses for competition placement, and create a daily cron for finalization and recurring event creation.

**Architecture:** Migration adds recurring/finalization columns + XP awards table. Simplified creation modal replaces the complex 830-line version. Edge Function `manage-competition` updated to accept recurring_interval. New `finalize-and-recur-events` Edge Function runs daily to finalize competitions (award XP) and create recurring instances. `WorkoutLevelService` extended to include competition XP via caller-provided parameter.

**Tech Stack:** React Native, TypeScript, Supabase (migrations, Edge Functions, pg_cron)

**Spec:** `docs/superpowers/specs/2026-03-27-simplified-events-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/162_simplified_events.sql` | Add recurring/finalization columns, XP awards table, backfill |
| `supabase/migrations/163_event_cron.sql` | Schedule daily finalize-and-recur cron |
| `supabase/functions/finalize-and-recur-events/index.ts` | Daily cron: finalize competitions + create recurring instances |

### Modified Files
| File | Change |
|------|--------|
| `src/components/subscription/SimpleEventCreationModal.tsx` | Simplify to template + duration + recurring only |
| `supabase/functions/manage-competition/index.ts` | Accept recurring_interval, default pledge to 0, use club banner |
| `src/services/fitness/WorkoutLevelService.ts` | Accept optional competitionXP parameter |
| `src/components/compete/DynamicEventCard.tsx` | Add club name badge for club events |

---

## Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/162_simplified_events.sql`

- [ ] **Step 1: Create migration**

```sql
-- Migration 162: Simplified events — recurring, finalization, XP awards

-- Add recurring and finalization columns to competitions
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS recurring_interval TEXT DEFAULT 'none';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES competitions(id);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;

-- XP awards for competition placement
CREATE TABLE IF NOT EXISTS competition_xp_awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  npub TEXT NOT NULL,
  placement INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, npub)
);

CREATE INDEX IF NOT EXISTS idx_competition_xp_awards_npub ON competition_xp_awards(npub);
CREATE INDEX IF NOT EXISTS idx_competition_xp_awards_competition ON competition_xp_awards(competition_id);

ALTER TABLE competition_xp_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read xp awards" ON competition_xp_awards;
CREATE POLICY "Anyone can read xp awards" ON competition_xp_awards
  FOR SELECT USING (true);
-- INSERT only via service role (cron Edge Function)

-- Backfill: mark existing ended competitions as finalized
-- so the cron doesn't try to finalize old competitions on first run
UPDATE competitions SET is_finalized = true WHERE end_date < NOW();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/162_simplified_events.sql
git commit -m "Feature: Add recurring events, finalization, and XP awards migration"
```

---

## Task 2: Update manage-competition Edge Function

**Files:**
- Modify: `supabase/functions/manage-competition/index.ts`

- [ ] **Step 1: Read the file first**

Read the `handleCreate` function to find:
- The `insertData` object construction (~line 186-201)
- The parameter destructuring at the top of handleCreate
- The `handleUpdate` allowed fields whitelist (~line 295)

- [ ] **Step 2: Add recurring_interval to create**

In the parameter destructuring, add `recurring_interval`:
```typescript
const { npub, name, description, activity_type, scoring_method, start_date, end_date, template, club_id, config, image_url, recurring_interval } = body;
```

In the `insertData` object, add:
```typescript
recurring_interval: recurring_interval || 'none',
```

Also, if `club_id` is provided and `image_url` is not, auto-fetch the club's banner:
```typescript
// Auto-use club banner if no image provided
let finalImageUrl = image_url || null;
if (club_id && !finalImageUrl) {
  const { data: club } = await supabase.from('user_teams').select('banner_url').eq('id', club_id).single();
  if (club?.banner_url) finalImageUrl = club.banner_url;
}
```
Then use `finalImageUrl` in insertData instead of `image_url`.

- [ ] **Step 3: Add recurring_interval to update whitelist**

Find the `handleUpdate` function's allowed fields array and add `'recurring_interval'`:
```typescript
const allowedFields = ['name', 'description', 'image_url', 'recurring_interval'];
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/manage-competition/index.ts
git commit -m "Feature: Accept recurring_interval in manage-competition, auto-use club banner"
```

---

## Task 3: Finalize-and-Recur Edge Function

**Files:**
- Create: `supabase/functions/finalize-and-recur-events/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
/**
 * Supabase Edge Function: finalize-and-recur-events
 *
 * Runs daily via pg_cron. Two jobs:
 * 1. Finalize ended competitions — calculate rankings, award XP
 * 2. Create recurring instances — spawn next event for recurring competitions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// XP bonus tiers
const XP_TIERS = [
  { minPlace: 1, maxPlace: 1, xp: 500 },
  { minPlace: 2, maxPlace: 2, xp: 250 },
  { minPlace: 3, maxPlace: 3, xp: 100 },
  { minPlace: 4, maxPlace: 10, xp: 50 },
];
const FINISHER_XP = 25;

serve(async (req) => {
  const startTime = Date.now();
  console.log('=== Finalize & Recur Events ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let finalized = 0;
    let recurring = 0;

    // ========================================
    // 1. FINALIZE ENDED COMPETITIONS
    // ========================================
    const { data: endedComps } = await supabase
      .from('competitions')
      .select('id, scoring_method, activity_type, template, config')
      .eq('is_finalized', false)
      .lt('end_date', new Date().toISOString());

    for (const comp of endedComps || []) {
      try {
        // Get participants with their best results
        const { data: entries } = await supabase
          .from('competition_entries')
          .select('npub, value')
          .eq('competition_id', comp.id)
          .order('value', { ascending: comp.scoring_method === 'fastest_time' });

        if (!entries || entries.length === 0) {
          // No participants — just mark finalized
          await supabase
            .from('competitions')
            .update({ is_finalized: true })
            .eq('id', comp.id);
          finalized++;
          continue;
        }

        // Deduplicate by npub (keep best entry)
        const bestByNpub = new Map<string, { npub: string; value: number }>();
        for (const entry of entries) {
          const existing = bestByNpub.get(entry.npub);
          if (!existing) {
            bestByNpub.set(entry.npub, entry);
          } else if (comp.scoring_method === 'fastest_time') {
            if (entry.value < existing.value) bestByNpub.set(entry.npub, entry);
          } else {
            if (entry.value > existing.value) bestByNpub.set(entry.npub, entry);
          }
        }

        // Rank participants
        const ranked = Array.from(bestByNpub.values()).sort((a, b) => {
          if (comp.scoring_method === 'fastest_time') return a.value - b.value;
          return b.value - a.value;
        });

        // Award XP
        const xpAwards = ranked.map((entry, index) => {
          const placement = index + 1;
          let xp = FINISHER_XP; // Default: finisher bonus
          for (const tier of XP_TIERS) {
            if (placement >= tier.minPlace && placement <= tier.maxPlace) {
              xp = tier.xp;
              break;
            }
          }
          return {
            competition_id: comp.id,
            npub: entry.npub,
            placement,
            xp_awarded: xp,
          };
        });

        if (xpAwards.length > 0) {
          await supabase
            .from('competition_xp_awards')
            .upsert(xpAwards, { onConflict: 'competition_id,npub' });
        }

        // Mark finalized
        await supabase
          .from('competitions')
          .update({ is_finalized: true })
          .eq('id', comp.id);

        finalized++;
        console.log(`Finalized ${comp.id}: ${xpAwards.length} participants, top XP: ${xpAwards[0]?.xp_awarded || 0}`);
      } catch (err) {
        console.error(`Failed to finalize ${comp.id}:`, err);
      }
    }

    // ========================================
    // 2. CREATE RECURRING INSTANCES
    // ========================================
    const { data: recurringComps } = await supabase
      .from('competitions')
      .select('id, name, activity_type, scoring_method, template, config, club_id, image_url, start_date, end_date, recurring_interval, recurring_parent_id')
      .eq('is_finalized', true)
      .neq('recurring_interval', 'none')
      .lt('end_date', new Date().toISOString());

    for (const comp of recurringComps || []) {
      try {
        const parentId = comp.recurring_parent_id || comp.id;

        // Check if future instance already exists
        const { data: futureInstances } = await supabase
          .from('competitions')
          .select('id')
          .or(`recurring_parent_id.eq.${parentId},id.eq.${parentId}`)
          .gt('start_date', new Date().toISOString())
          .limit(1);

        if (futureInstances && futureInstances.length > 0) {
          continue; // Already have a future instance
        }

        // Calculate new dates
        const oldEnd = new Date(comp.end_date);
        const oldStart = new Date(comp.start_date);
        const durationMs = oldEnd.getTime() - oldStart.getTime();
        const newStart = oldEnd; // Back-to-back
        const newEnd = new Date(newStart.getTime() + durationMs);

        // Generate external_id
        const slug = comp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        const externalId = `${slug}-${hex}`;

        // Create new competition
        const { data: newComp, error: insertError } = await supabase
          .from('competitions')
          .insert({
            name: comp.name,
            activity_type: comp.activity_type,
            scoring_method: comp.scoring_method,
            template: comp.template,
            config: comp.config,
            club_id: comp.club_id,
            image_url: comp.image_url,
            start_date: newStart.toISOString(),
            end_date: newEnd.toISOString(),
            recurring_interval: comp.recurring_interval,
            recurring_parent_id: parentId,
            is_open: true,
            prize_pool_sats: 0,
            external_id: externalId,
            created_by_npub: 'system',
            is_finalized: false,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Failed to create recurring for ${comp.id}:`, insertError);
          continue;
        }

        // Auto-join club members if club event
        if (comp.club_id && newComp) {
          const { data: members } = await supabase
            .from('club_memberships')
            .select('member_npub')
            .eq('club_id', comp.club_id);

          if (members && members.length > 0) {
            const participants = members.map(m => ({
              competition_id: newComp.id,
              npub: m.member_npub,
            }));
            await supabase
              .from('competition_participants')
              .upsert(participants, { onConflict: 'competition_id,npub', ignoreDuplicates: true });
          }
        }

        recurring++;
        console.log(`Created recurring ${externalId} from ${comp.id}`);
      } catch (err) {
        console.error(`Failed to recur ${comp.id}:`, err);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Done: ${finalized} finalized, ${recurring} recurring created in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      finalized,
      recurring,
      duration_ms: duration,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Finalize & recur error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/finalize-and-recur-events/index.ts
git commit -m "Feature: Add finalize-and-recur-events Edge Function"
```

---

## Task 4: Cron Schedule Migration

**Files:**
- Create: `supabase/migrations/163_event_cron.sql`

- [ ] **Step 1: Create cron migration**

```sql
-- Migration 163: Schedule daily finalize-and-recur-events cron
-- Runs at midnight UTC every day

SELECT cron.schedule(
  'finalize-and-recur-events',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/finalize-and-recur-events',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/163_event_cron.sql
git commit -m "Feature: Schedule daily finalize-and-recur-events cron"
```

---

## Task 5: Simplify Event Creation Modal

**Files:**
- Modify: `src/components/subscription/SimpleEventCreationModal.tsx`

This is the biggest client-side change. The current modal is 830 lines. The simplified version should be under 400.

- [ ] **Step 1: Read the current file**

Read `src/components/subscription/SimpleEventCreationModal.tsx` fully to understand:
- Template selection UI
- All the pledge/ticket/Lightning/winner-selection inputs to remove
- The `handleCreate` function that calls the Edge Function
- The edit mode support

- [ ] **Step 2: Simplify the modal**

Remove these from the modal:
- Pledge/ticket days picker and all pledge-related state
- Image picker and image upload logic
- Lightning address validation
- Winner selection (top_ranked vs random) picker
- Qualifying distance picker
- Custom event name input (auto-generate from club name + template)
- Description input

Add these:
- Duration picker: pills for 1d, 3d, 7d, 30d
- Recurring picker: pills for Off, Weekly, Monthly

The `handleCreate` function should:
- Auto-generate name: `"{ClubName} {TemplateName}"` (need club name passed as prop or fetched)
- Set `start_date = new Date().toISOString()`
- Calculate `end_date` from duration
- Set `ticket_pledge_days = 0`
- Set `winner_selection = 'top_ranked'`
- Pass `recurring_interval` to the Edge Function
- Use club banner as image (passed as prop or fetched)

Keep edit mode but simplify it to only allow changing recurring_interval.

- [ ] **Step 3: Add `clubName` and `clubBannerUrl` to props**

The modal needs the club name for auto-generating the event name and the banner URL for the image. Add these to the props interface:
```typescript
interface SimpleEventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
  clubId?: string;
  clubName?: string;       // NEW
  clubBannerUrl?: string;  // NEW
  existingEvent?: { ... };
}
```

Update the caller (wherever this modal is rendered) to pass these props.

- [ ] **Step 4: Verify compiles and file is under 500 lines**

Run: `npm run typecheck 2>&1 | tail -3`
Run: `wc -l src/components/subscription/SimpleEventCreationModal.tsx` (should be < 500)

- [ ] **Step 5: Commit**

```bash
git add src/components/subscription/SimpleEventCreationModal.tsx
git commit -m "Refactor: Simplify event creation to template + duration + recurring"
```

---

## Task 6: Add Club Badge to DynamicEventCard

**Files:**
- Modify: `src/components/compete/DynamicEventCard.tsx`

- [ ] **Step 1: Read the file first**

Read `DynamicEventCard.tsx` to understand the card layout and what props it receives.

- [ ] **Step 2: Add club name badge**

If the competition has a `club_id`, display a small club name badge on the card. The competition data should include `club_name` (may need to join or include in the fetch query).

Add a small text overlay at the bottom-left of the event image:
```typescript
{comp.club_name && (
  <View style={styles.clubBadge}>
    <Text style={styles.clubBadgeText}>{comp.club_name}</Text>
  </View>
)}
```

Style: `theme.colors.cardBackground` background, `theme.colors.textMuted` text, small font, rounded, absolute positioned.

If `club_name` is not available on the competition object, check `SupabaseCompetitionService.fetchDynamicCompetitions()` and add a join to `user_teams` to get the club name.

- [ ] **Step 3: Commit**

```bash
git add src/components/compete/DynamicEventCard.tsx
git commit -m "Feature: Add club name badge to event cards"
```

---

## Task 7: XP Integration — WorkoutLevelService

**Files:**
- Modify: `src/services/fitness/WorkoutLevelService.ts`

- [ ] **Step 1: Read the file**

Find `calculateLevelStats` and `getLevelStats`. Currently XP = `workouts.length * 300`.

- [ ] **Step 2: Add optional competitionXP parameter**

Modify `calculateLevelStats` to accept optional bonus XP:
```typescript
calculateLevelStats(workouts: LocalWorkout[], competitionXP: number = 0): LevelStats {
  // ...existing calculation...
  const totalXP = (workouts.length * XP_VALUES.WORKOUT_SUBMITTED) + competitionXP;
  // ...rest unchanged...
}
```

Modify `getLevelStats` to accept and pass through `competitionXP`:
```typescript
async getLevelStats(
  pubkey: string,
  workouts: LocalWorkout[],
  forceRefresh = false,
  competitionXP: number = 0
): Promise<LevelStats>
```

Pass `competitionXP` to `calculateLevelStats` inside `getLevelStats`.

- [ ] **Step 3: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 4: Commit**

```bash
git add src/services/fitness/WorkoutLevelService.ts
git commit -m "Feature: WorkoutLevelService accepts competition XP bonus"
```

---

## Task 8: Verification

**Files:** None (testing only)

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-simplified-events.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${name}`); passed++; }
  else { console.log(`  FAIL: ${name}`); failed++; }
}

function readFile(p: string) { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }
function fileExists(p: string) { return fs.existsSync(path.join(ROOT, p)); }

console.log('\n--- Files ---');
check('Migration 162', fileExists('supabase/migrations/162_simplified_events.sql'));
check('Migration 163', fileExists('supabase/migrations/163_event_cron.sql'));
check('Finalize Edge Function', fileExists('supabase/functions/finalize-and-recur-events/index.ts'));

console.log('\n--- Schema ---');
const migration = readFile('supabase/migrations/162_simplified_events.sql');
check('recurring_interval column', migration.includes('recurring_interval'));
check('recurring_parent_id column', migration.includes('recurring_parent_id'));
check('is_finalized column', migration.includes('is_finalized'));
check('competition_xp_awards table', migration.includes('competition_xp_awards'));
check('Backfill existing', migration.includes('UPDATE competitions SET is_finalized'));

console.log('\n--- Edge Function ---');
const edgeFn = readFile('supabase/functions/manage-competition/index.ts');
check('recurring_interval in manage-competition', edgeFn.includes('recurring_interval'));

console.log('\n--- Finalize cron ---');
const cron = readFile('supabase/functions/finalize-and-recur-events/index.ts');
check('XP_TIERS defined', cron.includes('XP_TIERS'));
check('FINISHER_XP defined', cron.includes('FINISHER_XP'));
check('Recurring creation', cron.includes('recurring_parent_id'));

console.log('\n--- XP Service ---');
const levelService = readFile('src/services/fitness/WorkoutLevelService.ts');
check('competitionXP parameter', levelService.includes('competitionXP'));

console.log('\n--- Modal simplified ---');
const modal = readFile('src/components/subscription/SimpleEventCreationModal.tsx');
const lineCount = modal.split('\n').length;
check('Modal under 500 lines', lineCount < 500);
check('Has duration picker', modal.includes('duration') || modal.includes('Duration'));
check('Has recurring picker', modal.includes('recurring') || modal.includes('Recurring'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-simplified-events.ts`

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/verify-simplified-events.ts
git commit -m "Chore: Add simplified events verification script"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Supabase migration | `162_simplified_events.sql` | — |
| 2 | manage-competition update | — | `manage-competition/index.ts` |
| 3 | Finalize-and-recur Edge Function | `finalize-and-recur-events/index.ts` | — |
| 4 | Cron schedule | `163_event_cron.sql` | — |
| 5 | Simplify creation modal | — | `SimpleEventCreationModal.tsx` |
| 6 | Club badge on event cards | — | `DynamicEventCard.tsx` |
| 7 | XP integration | — | `WorkoutLevelService.ts` |
| 8 | Verification | `verify-simplified-events.ts` | — |

**Requires after implementation:**
- `supabase db push` for migrations 162, 163
- `supabase functions deploy manage-competition`
- `supabase functions deploy finalize-and-recur-events`
