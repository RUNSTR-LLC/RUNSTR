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
