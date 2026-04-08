/**
 * resolve-season3-matchup — Nightly cron-triggered edge function
 *
 * 1. Find today's live matchup
 * 2. Tally final step counts from workout_submissions
 * 3. Determine winner (steps → active members → seed)
 * 4. Advance winner/loser through the bracket
 * 5. Set next day's matchup to 'live'
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Bracket map (duplicated from client constants for edge function isolation) ──

interface Dest {
  bracket: string;
  round: number;
  match_number: number;
  slot: 'a' | 'b';
}

const BRACKET_MAP: Record<string, { winner_to: Dest | null; loser_to: Dest | null }> = {
  'winners:1:1': { winner_to: { bracket: 'winners', round: 2, match_number: 1, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 1, slot: 'a' } },
  'winners:1:2': { winner_to: { bracket: 'winners', round: 2, match_number: 1, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 2, slot: 'a' } },
  'winners:1:3': { winner_to: { bracket: 'winners', round: 2, match_number: 2, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 3, slot: 'a' } },
  'winners:1:4': { winner_to: { bracket: 'winners', round: 2, match_number: 2, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 4, slot: 'a' } },
  'winners:1:5': { winner_to: { bracket: 'winners', round: 2, match_number: 3, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 4, slot: 'b' } },
  'winners:1:6': { winner_to: { bracket: 'winners', round: 2, match_number: 3, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 3, slot: 'b' } },
  'winners:1:7': { winner_to: { bracket: 'winners', round: 2, match_number: 4, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 2, slot: 'b' } },
  'winners:1:8': { winner_to: { bracket: 'winners', round: 2, match_number: 4, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 1, slot: 'b' } },
  'winners:2:1': { winner_to: { bracket: 'winners', round: 3, match_number: 1, slot: 'a' }, loser_to: { bracket: 'losers', round: 2, match_number: 4, slot: 'b' } },
  'winners:2:2': { winner_to: { bracket: 'winners', round: 3, match_number: 1, slot: 'b' }, loser_to: { bracket: 'losers', round: 2, match_number: 3, slot: 'b' } },
  'winners:2:3': { winner_to: { bracket: 'winners', round: 3, match_number: 2, slot: 'a' }, loser_to: { bracket: 'losers', round: 2, match_number: 2, slot: 'b' } },
  'winners:2:4': { winner_to: { bracket: 'winners', round: 3, match_number: 2, slot: 'b' }, loser_to: { bracket: 'losers', round: 2, match_number: 1, slot: 'b' } },
  'winners:3:1': { winner_to: { bracket: 'winners', round: 4, match_number: 1, slot: 'a' }, loser_to: { bracket: 'losers', round: 4, match_number: 2, slot: 'b' } },
  'winners:3:2': { winner_to: { bracket: 'winners', round: 4, match_number: 1, slot: 'b' }, loser_to: { bracket: 'losers', round: 4, match_number: 1, slot: 'b' } },
  'winners:4:1': { winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:1:1': { winner_to: { bracket: 'losers', round: 2, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:1:2': { winner_to: { bracket: 'losers', round: 2, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:1:3': { winner_to: { bracket: 'losers', round: 2, match_number: 3, slot: 'a' }, loser_to: null },
  'losers:1:4': { winner_to: { bracket: 'losers', round: 2, match_number: 4, slot: 'a' }, loser_to: null },
  'losers:2:1': { winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:2:2': { winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'b' }, loser_to: null },
  'losers:2:3': { winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:2:4': { winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'b' }, loser_to: null },
  'losers:3:1': { winner_to: { bracket: 'losers', round: 4, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:3:2': { winner_to: { bracket: 'losers', round: 4, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:4:1': { winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:4:2': { winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'b' }, loser_to: null },
  'losers:5:1': { winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'b' }, loser_to: null },
  'grand_finals:1:1': { winner_to: null, loser_to: null },
  'grand_finals:2:1': { winner_to: null, loser_to: null },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    console.log('[resolve-season3] Starting nightly resolution...');

    // 1. Find today's live matchup
    const today = new Date().toISOString().split('T')[0];
    const { data: liveMatches, error: liveErr } = await supabase
      .from('season3_matchups')
      .select('*')
      .eq('status', 'live');

    if (liveErr) throw liveErr;
    if (!liveMatches || liveMatches.length === 0) {
      console.log('[resolve-season3] No live matchup found. Exiting.');
      return new Response(JSON.stringify({ message: 'No live matchup today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matchup = liveMatches[0];
    console.log(`[resolve-season3] Resolving matchup: ${matchup.bracket} R${matchup.round} M${matchup.match_number}`);

    // 2. Handle bye (one club is NULL)
    if (!matchup.club_a_id || !matchup.club_b_id) {
      const winnerId = matchup.club_a_id ?? matchup.club_b_id;
      const loserId = null;

      await supabase.from('season3_matchups').update({
        winner_id: winnerId,
        loser_id: loserId,
        status: 'completed',
      }).eq('id', matchup.id);

      if (winnerId) {
        await advanceTeam(supabase, matchup, winnerId, 'winner');
      }

      await activateNextMatch(supabase);
      console.log(`[resolve-season3] Bye resolved. Winner: ${winnerId}`);
      return new Response(JSON.stringify({ message: 'Bye resolved', winner: winnerId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Tally final step counts
    const { data: steps, error: stepErr } = await supabase
      .from('workout_submissions')
      .select('club_id, step_count, npub')
      .in('club_id', [matchup.club_a_id, matchup.club_b_id])
      .eq('leaderboard_date', matchup.match_date);

    if (stepErr) throw stepErr;

    let clubASteps = 0;
    let clubBSteps = 0;
    const clubAMembers = new Set<string>();
    const clubBMembers = new Set<string>();

    for (const row of steps ?? []) {
      if (row.club_id === matchup.club_a_id) {
        clubASteps += row.step_count ?? 0;
        if (row.npub) clubAMembers.add(row.npub);
      } else {
        clubBSteps += row.step_count ?? 0;
        if (row.npub) clubBMembers.add(row.npub);
      }
    }

    // 4. Determine winner
    let winnerSide: 'a' | 'b';
    if (clubASteps > clubBSteps) {
      winnerSide = 'a';
    } else if (clubBSteps > clubASteps) {
      winnerSide = 'b';
    } else if (clubAMembers.size > clubBMembers.size) {
      winnerSide = 'a';
    } else if (clubBMembers.size > clubAMembers.size) {
      winnerSide = 'b';
    } else {
      // Seed tiebreaker
      winnerSide = (matchup.seed_a ?? 99) <= (matchup.seed_b ?? 99) ? 'a' : 'b';
    }

    const winnerId = winnerSide === 'a' ? matchup.club_a_id : matchup.club_b_id;
    const loserId = winnerSide === 'a' ? matchup.club_b_id : matchup.club_a_id;

    console.log(`[resolve-season3] Club A: ${clubASteps} steps (${clubAMembers.size} active), Club B: ${clubBSteps} steps (${clubBMembers.size} active)`);
    console.log(`[resolve-season3] Winner: ${winnerSide} (${winnerId})`);

    // 5. Update matchup
    await supabase.from('season3_matchups').update({
      club_a_steps: clubASteps,
      club_b_steps: clubBSteps,
      club_a_active: clubAMembers.size,
      club_b_active: clubBMembers.size,
      winner_id: winnerId,
      loser_id: loserId,
      status: 'completed',
    }).eq('id', matchup.id);

    // 6. Advance teams
    await advanceTeam(supabase, matchup, winnerId, 'winner');
    if (loserId) {
      await advanceTeam(supabase, matchup, loserId, 'loser');
    }

    // 7. Handle grand finals reset
    if (matchup.bracket === 'grand_finals' && matchup.round === 1 && winnerSide === 'b') {
      // Losers bracket champ beat winners bracket champ — activate reset match
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await supabase.from('season3_matchups').update({
        match_date: tomorrowStr,
        club_a_id: matchup.club_b_id, // GF1 winner (losers champ) goes to slot A
        club_b_id: matchup.club_a_id, // GF1 loser (winners champ) goes to slot B
        status: 'scheduled',
      }).eq('bracket', 'grand_finals').eq('round', 2).eq('match_number', 1);
    }

    // 8. Check if tournament is complete
    const { data: allMatchups } = await supabase
      .from('season3_matchups')
      .select('bracket, round, status, winner_id, club_a_id')
      .order('match_date');

    const gf1 = allMatchups?.find((m: any) => m.bracket === 'grand_finals' && m.round === 1);
    const gf2 = allMatchups?.find((m: any) => m.bracket === 'grand_finals' && m.round === 2);
    const isComplete = (gf1?.status === 'completed' && gf1.winner_id === gf1.club_a_id)
      || (gf2?.status === 'completed');

    if (isComplete) {
      await supabase.from('season3_config').update({ value: 'completed' }).eq('key', 'status');
      console.log('[resolve-season3] Tournament complete!');
    } else {
      // Activate next match
      await activateNextMatch(supabase);
      // Update config status to active if not already
      await supabase.from('season3_config').update({ value: 'active' }).eq('key', 'status');
    }

    return new Response(JSON.stringify({
      message: 'Matchup resolved',
      winner: winnerId,
      club_a_steps: clubASteps,
      club_b_steps: clubBSteps,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[resolve-season3] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Advance a team to their next matchup slot based on the bracket map */
async function advanceTeam(
  supabase: any,
  matchup: any,
  teamId: string,
  role: 'winner' | 'loser',
) {
  const key = `${matchup.bracket}:${matchup.round}:${matchup.match_number}`;
  const advancement = BRACKET_MAP[key];
  if (!advancement) {
    console.log(`[resolve-season3] No advancement found for ${key}`);
    return;
  }

  const dest = role === 'winner' ? advancement.winner_to : advancement.loser_to;
  if (!dest) {
    console.log(`[resolve-season3] No ${role} destination for ${key} (eliminated or champion)`);
    return;
  }

  // Find the seed of the advancing team
  const seed = (matchup.club_a_id === teamId) ? matchup.seed_a : matchup.seed_b;

  const column = dest.slot === 'a' ? 'club_a_id' : 'club_b_id';
  const seedColumn = dest.slot === 'a' ? 'seed_a' : 'seed_b';

  const { error } = await supabase
    .from('season3_matchups')
    .update({ [column]: teamId, [seedColumn]: seed })
    .eq('bracket', dest.bracket)
    .eq('round', dest.round)
    .eq('match_number', dest.match_number);

  if (error) {
    console.error(`[resolve-season3] Failed to advance ${role} to ${dest.bracket}:${dest.round}:${dest.match_number}: ${error.message}`);
  } else {
    console.log(`[resolve-season3] Advanced ${role} ${teamId} to ${dest.bracket} R${dest.round} M${dest.match_number} slot ${dest.slot}`);
  }
}

/** Find and activate the next scheduled/pending matchup that has both clubs assigned */
async function activateNextMatch(supabase: any) {
  const { data, error } = await supabase
    .from('season3_matchups')
    .select('*')
    .in('status', ['scheduled', 'pending'])
    .not('club_a_id', 'is', null)
    .order('match_date', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.log('[resolve-season3] No next match to activate');
    return;
  }

  const next = data[0];

  // If the match has both clubs OR is a bye (only one club), activate it
  // Byes with NULL club_b are also valid to activate
  await supabase.from('season3_matchups')
    .update({ status: 'live' })
    .eq('id', next.id);

  console.log(`[resolve-season3] Activated next match: ${next.bracket} R${next.round} M${next.match_number} on ${next.match_date}`);
}
