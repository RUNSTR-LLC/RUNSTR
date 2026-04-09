/**
 * Supabase Edge Function: check-leaderboard-positions
 *
 * Detects leaderboard position changes in active competitions and sends
 * targeted push notifications to users who moved UP in the rankings.
 *
 * Called by pg_cron every 5 minutes during active hours (6 AM - 10 PM UTC).
 *
 * Logic:
 * 1. Query all active competitions (start_date <= now AND end_date >= now)
 * 2. For each competition, call compute_competition_leaderboard()
 * 3. Compare current positions against leaderboard_position_cache
 * 4. For users who moved UP: call notify-user with position change details
 * 5. Throttle: skip if last_notified_at was less than 1 hour ago
 * 6. Upsert all current positions into cache
 *
 * Only notifies on UPWARD movements (lower position number = higher rank).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Throttle window: only notify a user once per hour per competition */
const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

interface Competition {
  id: string
  external_id: string
  name: string
  activity_type: string
  start_date: string
  end_date: string
}

interface LeaderboardRow {
  npub: string
  position: number
  total_distance_meters: number
}

interface CachedPosition {
  competition_id: string
  npub: string
  position: number
  total_distance_meters: number
  last_notified_at: string | null
  updated_at: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    console.log(`[check-leaderboard-positions] Starting check at ${now}`)

    // =========================================================
    // 1. Query all active competitions
    // =========================================================
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('id, external_id, name, activity_type, start_date, end_date')
      .lte('start_date', now)
      .gte('end_date', now)

    if (compError) {
      console.error('[check-leaderboard-positions] Competition query error:', compError)
      return new Response(
        JSON.stringify({ error: compError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!competitions || competitions.length === 0) {
      console.log('[check-leaderboard-positions] No active competitions')
      return new Response(
        JSON.stringify({ message: 'No active competitions', notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[check-leaderboard-positions] Found ${competitions.length} active competition(s)`)

    let totalNotified = 0
    let totalSkipped = 0
    let totalErrors = 0

    // =========================================================
    // 2. Process each competition
    // =========================================================
    for (const comp of competitions as Competition[]) {
      console.log(`[check-leaderboard-positions] Processing: ${comp.name} (${comp.external_id})`)

      // 2a. Compute current leaderboard via SQL function
      const { data: leaderboard, error: lbError } = await supabase.rpc(
        'compute_competition_leaderboard',
        {
          p_competition_id: comp.id,
          p_activity_type: comp.activity_type,
          p_start: comp.start_date,
          p_end: comp.end_date,
        }
      )

      if (lbError) {
        console.error(`[check-leaderboard-positions] Leaderboard error for ${comp.external_id}:`, lbError)
        totalErrors++
        continue
      }

      if (!leaderboard || leaderboard.length === 0) {
        console.log(`[check-leaderboard-positions] No participants in ${comp.external_id}`)
        continue
      }

      const currentLeaderboard = leaderboard as LeaderboardRow[]
      console.log(`[check-leaderboard-positions] ${comp.external_id}: ${currentLeaderboard.length} participants`)

      // 2b. Get cached positions for this competition
      const { data: cachedPositions, error: cacheError } = await supabase
        .from('leaderboard_position_cache')
        .select('*')
        .eq('competition_id', comp.id)

      if (cacheError) {
        console.error(`[check-leaderboard-positions] Cache read error for ${comp.external_id}:`, cacheError)
        totalErrors++
        continue
      }

      // Build lookup map: npub -> cached position data
      const cacheMap = new Map<string, CachedPosition>()
      if (cachedPositions) {
        for (const cached of cachedPositions as CachedPosition[]) {
          cacheMap.set(cached.npub, cached)
        }
      }

      const nowMs = Date.now()

      // 2c. Compare and notify on upward movements
      for (const entry of currentLeaderboard) {
        const cached = cacheMap.get(entry.npub)

        // Skip if no previous cache entry (first time seeing this user -- no movement to report)
        if (!cached) continue

        const oldPosition = cached.position
        const newPosition = entry.position

        // Only notify on UPWARD movement (lower number = better rank)
        if (newPosition >= oldPosition) continue

        // Throttle: skip if notified less than 1 hour ago
        if (cached.last_notified_at) {
          const lastNotified = new Date(cached.last_notified_at).getTime()
          if (nowMs - lastNotified < NOTIFY_COOLDOWN_MS) {
            console.log(
              `[check-leaderboard-positions] Throttled: ${entry.npub.slice(0, 12)}... ` +
              `(notified ${Math.round((nowMs - lastNotified) / 60000)}min ago)`
            )
            totalSkipped++
            continue
          }
        }

        // Calculate how many places they moved up
        const placesUp = oldPosition - newPosition

        console.log(
          `[check-leaderboard-positions] ${entry.npub.slice(0, 12)}... moved up ${placesUp} ` +
          `place(s) to #${newPosition} in ${comp.name}`
        )

        // Send notification via notify-user Edge Function
        try {
          const notifyPayload = {
            npub: entry.npub,
            title: 'Leaderboard Update!',
            body: `You moved up ${placesUp} place${placesUp > 1 ? 's' : ''} to #${newPosition} in ${comp.name}!`,
            data: {
              type: 'leaderboard_change',
              competition_id: comp.id,
              screen: 'CompeteScreen',
            },
            channelId: 'live_competition',
          }

          const notifyResponse = await fetch(
            `${supabaseUrl}/functions/v1/notify-user`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(notifyPayload),
            }
          )

          if (notifyResponse.ok) {
            const result = await notifyResponse.json()
            if (result.sent) {
              console.log(`[check-leaderboard-positions] Notification sent to ${entry.npub.slice(0, 12)}...`)
              totalNotified++
            } else {
              console.log(
                `[check-leaderboard-positions] Notification not sent (${result.error || 'unknown'}) ` +
                `for ${entry.npub.slice(0, 12)}...`
              )
            }
          } else {
            console.error(
              `[check-leaderboard-positions] notify-user HTTP ${notifyResponse.status} ` +
              `for ${entry.npub.slice(0, 12)}...`
            )
            totalErrors++
          }
        } catch (notifyErr) {
          console.error(`[check-leaderboard-positions] notify-user call failed:`, notifyErr)
          totalErrors++
        }
      }

      // 2d. Upsert ALL current positions into cache (including new entries and unchanged ones)
      const upsertRows = currentLeaderboard.map((entry) => {
        const cached = cacheMap.get(entry.npub)
        const movedUp = cached && entry.position < cached.position

        return {
          competition_id: comp.id,
          npub: entry.npub,
          position: entry.position,
          total_distance_meters: entry.total_distance_meters,
          // Update last_notified_at only if we actually sent (or attempted) a notification
          last_notified_at: movedUp
            ? new Date().toISOString()
            : cached?.last_notified_at || null,
          updated_at: new Date().toISOString(),
        }
      })

      const { error: upsertError } = await supabase
        .from('leaderboard_position_cache')
        .upsert(upsertRows, { onConflict: 'competition_id,npub' })

      if (upsertError) {
        console.error(`[check-leaderboard-positions] Cache upsert error for ${comp.external_id}:`, upsertError)
        totalErrors++
      } else {
        console.log(`[check-leaderboard-positions] Cached ${upsertRows.length} positions for ${comp.external_id}`)
      }
    }

    // =========================================================
    // 3. Summary
    // =========================================================
    const summary = {
      competitions: competitions.length,
      notified: totalNotified,
      skipped: totalSkipped,
      errors: totalErrors,
    }
    console.log('[check-leaderboard-positions] Complete:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[check-leaderboard-positions] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
