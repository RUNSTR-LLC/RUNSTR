/**
 * Supabase Edge Function: finalize-ticketed-event
 *
 * Handles finalization of ticketed events by querying workout submissions
 * for qualifying finishers.
 *
 * Accepts { action, competition_id, qualifying_distance_km } in the request body.
 * Returns { success, data?, error? }.
 *
 * Actions:
 *   get_finishers - Get participants who met the qualifying distance
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// Helpers
// =============================================

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status)
}

// =============================================
// Action Handlers
// =============================================

type SupabaseClient = ReturnType<typeof createClient>

async function handleGetFinishers(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, qualifying_distance_km } = params

  if (!competition_id) {
    return errorResponse('Missing required field: competition_id')
  }
  if (qualifying_distance_km === undefined || qualifying_distance_km === null) {
    return errorResponse('Missing required field: qualifying_distance_km')
  }

  // 1. Get competition date range
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('start_date, end_date, config')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }

  // 2. Get participant npubs
  const { data: participants, error: partErr } = await supabase
    .from('competition_participants')
    .select('npub, name')
    .eq('competition_id', competition_id)

  if (partErr) {
    console.error('Fetch participants error:', partErr)
    return errorResponse(partErr.message, 500)
  }

  if (!participants || participants.length === 0) {
    return jsonResponse({ success: true, data: { finishers: [] } })
  }

  const npubs = participants.map((p: { npub: string }) => p.npub)

  // 3. Call the get_competition_finishers RPC
  const { data: submissions, error: subErr } = await supabase
    .rpc('get_competition_finishers', {
      p_competition_id: competition_id,
      p_npubs: npubs,
      p_start_date: comp.start_date,
      p_end_date: comp.end_date,
      p_qualifying_distance_meters: (qualifying_distance_km as number) * 1000,
    })

  if (subErr) {
    console.error('Finisher query error:', subErr)
    return errorResponse(subErr.message, 500)
  }

  // 4. Map results with participant names
  const finishers = (submissions || []).map(
    (s: {
      npub: string;
      total_distance_meters: number;
      workout_count: number;
      lightning_address: string | null;
    }) => ({
      npub: s.npub,
      totalDistanceKm: s.total_distance_meters / 1000,
      workoutCount: s.workout_count,
      name:
        participants.find(
          (p: { npub: string; name: string | null }) => p.npub === s.npub,
        )?.name || null,
      lightningAddress: s.lightning_address || null,
    }),
  )

  console.log(`Finishers for competition ${competition_id}: ${finishers.length} qualifying out of ${participants.length} participants`)
  return jsonResponse({ success: true, data: { finishers } })
}

// =============================================
// Main Handler
// =============================================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    const { action, ...params } = body

    if (!action) {
      return errorResponse('Missing required field: action')
    }

    switch (action) {
      case 'get_finishers':
        return await handleGetFinishers(supabase, params)
      default:
        return errorResponse(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return jsonResponse(
      { success: false, error: (error as Error).message || 'Internal server error' },
      500,
    )
  }
})
