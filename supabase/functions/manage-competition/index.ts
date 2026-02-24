/**
 * Supabase Edge Function: manage-competition
 *
 * Handles all competition write operations with server-side authorization.
 * Accepts { action, ...params } in the request body.
 * Returns { success, data?, error? }.
 *
 * Actions:
 *   join             - Join a competition (upsert participant)
 *   leave            - Leave a competition (delete participant)
 *   create           - Create a new competition
 *   update           - Update competition metadata (owner only)
 *   delete           - Delete a competition (owner only)
 *   update-profile   - Update participant display name/picture
 *   auto-join-members - Bulk-join all club members (captain only)
 *   create-challenge  - Create a 1v1 challenge (pending until accepted)
 *   accept-challenge  - Accept a pending challenge (starts the timer)
 *   decline-challenge - Decline a pending challenge
 *   complete-challenge - Finalize an active challenge after end_date
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

function randomHex(length: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

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

const CHALLENGE_SCORING: Record<string, { scoring_method: string; activity_type: string; config_extras?: Record<string, unknown> }> = {
  fastest_5k: { scoring_method: 'fastest_time', activity_type: 'running', config_extras: { target_distance_km: 5, distance_tolerance_km: 0.5 } },
  fastest_10k: { scoring_method: 'fastest_time', activity_type: 'running', config_extras: { target_distance_km: 10, distance_tolerance_km: 1.0 } },
  daily_streak: { scoring_method: 'workout_count', activity_type: 'running' },
  most_distance: { scoring_method: 'total_distance', activity_type: 'running' },
  most_steps: { scoring_method: 'total_steps', activity_type: 'walking' },
}

async function handleJoin(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub, name, picture } = params
  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  // Verify competition exists and is open
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, is_open')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (!comp.is_open) {
    return errorResponse('Competition is not open for registration')
  }

  const { error: upsertErr } = await supabase
    .from('competition_participants')
    .upsert(
      {
        competition_id,
        npub,
        name: name || null,
        picture: picture || null,
      },
      { onConflict: 'competition_id,npub' },
    )

  if (upsertErr) {
    console.error('Join upsert error:', upsertErr)
    return errorResponse(upsertErr.message, 500)
  }

  console.log(`Joined: ${(npub as string).slice(0, 12)}... -> competition ${competition_id}`)
  return jsonResponse({ success: true })
}

async function handleLeave(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub } = params
  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  const { error } = await supabase
    .from('competition_participants')
    .delete()
    .eq('competition_id', competition_id)
    .eq('npub', npub)

  if (error) {
    console.error('Leave delete error:', error)
    return errorResponse(error.message, 500)
  }

  console.log(`Left: ${(npub as string).slice(0, 12)}... <- competition ${competition_id}`)
  return jsonResponse({ success: true })
}

async function handleCreate(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const {
    npub,
    name,
    description,
    activity_type,
    scoring_method,
    start_date,
    end_date,
    template,
    club_id,
    config,
    image_url,
  } = params

  if (!npub || !name || !activity_type || !scoring_method || !start_date || !end_date) {
    return errorResponse(
      'Missing required fields: npub, name, activity_type, scoring_method, start_date, end_date',
    )
  }

  // Auth check: max 3 active events per npub
  const { count, error: countErr } = await supabase
    .from('competitions')
    .select('id', { count: 'exact', head: true })
    .eq('created_by_npub', npub)
    .gte('end_date', new Date().toISOString())

  if (countErr) {
    console.error('Count error:', countErr)
    return errorResponse(countErr.message, 500)
  }

  if ((count ?? 0) >= 3) {
    return errorResponse('Maximum 3 active competitions per user')
  }

  // Generate external_id
  const external_id = `${slugify(name as string)}-${randomHex(4)}`

  const insertData: Record<string, unknown> = {
    created_by_npub: npub,
    name,
    description: description || null,
    activity_type,
    scoring_method,
    start_date,
    end_date,
    template: template || null,
    club_id: club_id || null,
    config: config || null,
    image_url: image_url || null,
    is_open: true,
    prize_pool_sats: 0,
    external_id,
  }

  const { data: newComp, error: insertErr } = await supabase
    .from('competitions')
    .insert(insertData)
    .select('id, external_id')
    .single()

  if (insertErr) {
    console.error('Create insert error:', insertErr)
    return errorResponse(insertErr.message, 500)
  }

  // Auto-join members
  if (club_id) {
    // Fetch all club members and bulk upsert
    const { data: members, error: memberErr } = await supabase
      .from('club_memberships')
      .select('member_npub')
      .eq('club_id', club_id)

    if (!memberErr && members && members.length > 0) {
      const rows = members.map((m: { member_npub: string }) => ({
        competition_id: newComp.id,
        npub: m.member_npub,
      }))

      const { error: bulkErr } = await supabase
        .from('competition_participants')
        .upsert(rows, { onConflict: 'competition_id,npub' })

      if (bulkErr) {
        console.warn('Bulk auto-join error (non-fatal):', bulkErr)
      } else {
        console.log(`Auto-joined ${rows.length} club members into competition ${newComp.id}`)
      }
    }
  } else {
    // Auto-join just the creator
    const { error: joinErr } = await supabase
      .from('competition_participants')
      .upsert(
        { competition_id: newComp.id, npub },
        { onConflict: 'competition_id,npub' },
      )

    if (joinErr) {
      console.warn('Creator auto-join error (non-fatal):', joinErr)
    }
  }

  console.log(`Created competition: ${newComp.id} (${external_id}) by ${(npub as string).slice(0, 12)}...`)
  return jsonResponse({
    success: true,
    data: { id: newComp.id, external_id: newComp.external_id },
  })
}

async function handleUpdate(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub, updates } = params
  if (!competition_id || !npub || !updates) {
    return errorResponse('Missing required fields: competition_id, npub, updates')
  }

  // Auth check: verify caller is the competition owner
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, created_by_npub')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.created_by_npub !== npub) {
    return errorResponse('Only the competition creator can update it', 403)
  }

  // Whitelist allowed update fields
  const allowed = ['name', 'description', 'image_url']
  const safeUpdates: Record<string, unknown> = {}
  for (const key of allowed) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      safeUpdates[key] = (updates as Record<string, unknown>)[key]
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const { error: updateErr } = await supabase
    .from('competitions')
    .update(safeUpdates)
    .eq('id', competition_id)

  if (updateErr) {
    console.error('Update error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Updated competition ${competition_id} by ${(npub as string).slice(0, 12)}...`)
  return jsonResponse({ success: true })
}

async function handleDelete(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub } = params
  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  // Auth check: verify caller is the competition owner
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, created_by_npub')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.created_by_npub !== npub) {
    return errorResponse('Only the competition creator can delete it', 403)
  }

  // Delete participants first (foreign key constraint)
  const { error: partErr } = await supabase
    .from('competition_participants')
    .delete()
    .eq('competition_id', competition_id)

  if (partErr) {
    console.error('Delete participants error:', partErr)
    return errorResponse(partErr.message, 500)
  }

  // Delete the competition
  const { error: delErr } = await supabase
    .from('competitions')
    .delete()
    .eq('id', competition_id)

  if (delErr) {
    console.error('Delete competition error:', delErr)
    return errorResponse(delErr.message, 500)
  }

  console.log(`Deleted competition ${competition_id} by ${(npub as string).slice(0, 12)}...`)
  return jsonResponse({ success: true })
}

async function handleUpdateProfile(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub, name, picture } = params
  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  // Auth check: verify participant row exists
  const { data: participant, error: partErr } = await supabase
    .from('competition_participants')
    .select('id')
    .eq('competition_id', competition_id)
    .eq('npub', npub)
    .single()

  if (partErr || !participant) {
    return errorResponse('Participant not found in this competition', 404)
  }

  const profileUpdates: Record<string, unknown> = {}
  if (name !== undefined) profileUpdates.name = name
  if (picture !== undefined) profileUpdates.picture = picture

  if (Object.keys(profileUpdates).length === 0) {
    return errorResponse('No profile fields to update (provide name or picture)')
  }

  const { error: updateErr } = await supabase
    .from('competition_participants')
    .update(profileUpdates)
    .eq('competition_id', competition_id)
    .eq('npub', npub)

  if (updateErr) {
    console.error('Update profile error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Updated profile in competition ${competition_id} for ${(npub as string).slice(0, 12)}...`)
  return jsonResponse({ success: true })
}

async function handleAutoJoinMembers(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, club_id, npub } = params
  if (!competition_id || !club_id || !npub) {
    return errorResponse('Missing required fields: competition_id, club_id, npub')
  }

  // Auth check: verify caller is captain of the club
  const { data: membership, error: memErr } = await supabase
    .from('club_memberships')
    .select('role')
    .eq('club_id', club_id)
    .eq('member_npub', npub)
    .single()

  if (memErr || !membership) {
    return errorResponse('You are not a member of this club', 403)
  }
  if (membership.role !== 'captain') {
    return errorResponse('Only club captains can auto-join members', 403)
  }

  // Fetch all club members
  const { data: members, error: memberErr } = await supabase
    .from('club_memberships')
    .select('member_npub')
    .eq('club_id', club_id)

  if (memberErr) {
    console.error('Fetch members error:', memberErr)
    return errorResponse(memberErr.message, 500)
  }

  if (!members || members.length === 0) {
    return jsonResponse({ success: true, data: { joined_count: 0 } })
  }

  // Bulk upsert into competition_participants
  const rows = members.map((m: { member_npub: string }) => ({
    competition_id,
    npub: m.member_npub,
  }))

  const { error: bulkErr } = await supabase
    .from('competition_participants')
    .upsert(rows, { onConflict: 'competition_id,npub' })

  if (bulkErr) {
    console.error('Bulk upsert error:', bulkErr)
    return errorResponse(bulkErr.message, 500)
  }

  console.log(`Auto-joined ${rows.length} members from club ${club_id} into competition ${competition_id}`)
  return jsonResponse({ success: true, data: { joined_count: rows.length } })
}

async function handleCreateChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { npub, challenged_npub, challenge_type, duration_days, club_id, name, picture } = params

  if (!npub || !challenged_npub || !challenge_type || !duration_days) {
    return errorResponse('Missing required fields: npub, challenged_npub, challenge_type, duration_days')
  }

  if (npub === challenged_npub) {
    return errorResponse('Cannot challenge yourself')
  }

  const scoring = CHALLENGE_SCORING[challenge_type as string]
  if (!scoring) {
    return errorResponse(`Invalid challenge_type: ${challenge_type}. Valid types: ${Object.keys(CHALLENGE_SCORING).join(', ')}`)
  }

  const validDurations = [1, 3, 7]
  if (!validDurations.includes(duration_days as number)) {
    return errorResponse(`Invalid duration_days: ${duration_days}. Must be 1, 3, or 7`)
  }

  const external_id = `challenge-${randomHex(8)}`
  const challengeName = (name as string) || `${challenge_type} Challenge`

  const config: Record<string, unknown> = {
    challenger_npub: npub,
    challenged_npub,
    challenge_type,
    challenge_status: 'pending',
    duration_days,
    ...(scoring.config_extras || {}),
  }

  const insertData: Record<string, unknown> = {
    created_by_npub: npub,
    name: challengeName,
    activity_type: scoring.activity_type,
    scoring_method: scoring.scoring_method,
    start_date: '2099-01-01T00:00:00Z',
    end_date: '2099-01-01T00:00:00Z',
    template: 'challenge',
    club_id: club_id || null,
    config,
    is_open: false,
    prize_pool_sats: 0,
    external_id,
  }

  const { data: newComp, error: insertErr } = await supabase
    .from('competitions')
    .insert(insertData)
    .select('id, external_id')
    .single()

  if (insertErr) {
    console.error('Create challenge insert error:', insertErr)
    return errorResponse(insertErr.message, 500)
  }

  // Auto-join the challenger as participant
  const { error: joinErr } = await supabase
    .from('competition_participants')
    .upsert(
      {
        competition_id: newComp.id,
        npub,
        name: name || null,
        picture: picture || null,
      },
      { onConflict: 'competition_id,npub' },
    )

  if (joinErr) {
    console.warn('Challenger auto-join error (non-fatal):', joinErr)
  }

  console.log(`Created challenge: ${newComp.id} (${external_id}) by ${(npub as string).slice(0, 12)}... -> ${(challenged_npub as string).slice(0, 12)}...`)
  return jsonResponse({
    success: true,
    data: { id: newComp.id, external_id: newComp.external_id },
  })
}

async function handleAcceptChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub, name, picture } = params

  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  // Fetch the competition
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, template, config')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.template !== 'challenge') {
    return errorResponse('Competition is not a challenge')
  }

  const config = comp.config as Record<string, unknown>
  if (config.challenged_npub !== npub) {
    return errorResponse('You are not the challenged user', 403)
  }
  if (config.challenge_status !== 'pending') {
    return errorResponse(`Challenge is not pending (current status: ${config.challenge_status})`)
  }

  // Calculate start and end dates
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + (config.duration_days as number))

  const updatedConfig = {
    ...config,
    challenge_status: 'active',
  }

  const { error: updateErr } = await supabase
    .from('competitions')
    .update({
      config: updatedConfig,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    })
    .eq('id', competition_id)

  if (updateErr) {
    console.error('Accept challenge update error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  // Join the challenged user as participant
  const { error: joinErr } = await supabase
    .from('competition_participants')
    .upsert(
      {
        competition_id,
        npub,
        name: name || null,
        picture: picture || null,
      },
      { onConflict: 'competition_id,npub' },
    )

  if (joinErr) {
    console.warn('Challenged user join error (non-fatal):', joinErr)
  }

  console.log(`Accepted challenge: ${competition_id} by ${(npub as string).slice(0, 12)}...`)
  return jsonResponse({
    success: true,
    data: {
      challenge_status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    },
  })
}

async function handleDeclineChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub } = params

  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  // Fetch the competition
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, template, config')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.template !== 'challenge') {
    return errorResponse('Competition is not a challenge')
  }

  const config = comp.config as Record<string, unknown>
  if (config.challenged_npub !== npub) {
    return errorResponse('You are not the challenged user', 403)
  }
  if (config.challenge_status !== 'pending') {
    return errorResponse(`Challenge is not pending (current status: ${config.challenge_status})`)
  }

  const updatedConfig = {
    ...config,
    challenge_status: 'declined',
  }

  const { error: updateErr } = await supabase
    .from('competitions')
    .update({ config: updatedConfig })
    .eq('id', competition_id)

  if (updateErr) {
    console.error('Decline challenge update error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Declined challenge: ${competition_id} by ${(npub as string).slice(0, 12)}...`)
  return jsonResponse({
    success: true,
    data: { challenge_status: 'declined' },
  })
}

async function handleCompleteChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id } = params

  if (!competition_id) {
    return errorResponse('Missing required field: competition_id')
  }

  // Fetch the competition
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, template, config, scoring_method, start_date, end_date')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.template !== 'challenge') {
    return errorResponse('Competition is not a challenge')
  }

  const config = comp.config as Record<string, unknown>
  if (config.challenge_status !== 'active') {
    return errorResponse(`Challenge is not active (current status: ${config.challenge_status})`)
  }

  const now = new Date()
  const endDate = new Date(comp.end_date)
  if (now < endDate) {
    return errorResponse('Challenge has not ended yet')
  }

  // Fetch participants
  const { data: participants, error: partErr } = await supabase
    .from('competition_participants')
    .select('npub')
    .eq('competition_id', competition_id)

  if (partErr) {
    console.error('Fetch participants error:', partErr)
    return errorResponse(partErr.message, 500)
  }

  if (!participants || participants.length === 0) {
    return errorResponse('No participants found')
  }

  const participantNpubs = participants.map((p: { npub: string }) => p.npub)
  const startDate = comp.start_date

  // Determine winner based on scoring method
  let winnerNpub: string | null = null

  if (comp.scoring_method === 'fastest_time') {
    // Pick the correct time column based on target distance
    const targetKm = config.target_distance_km as number
    const timeColumn = targetKm === 5 ? 'time_5k_seconds' : 'time_10k_seconds'

    const { data: workouts, error: workoutErr } = await supabase
      .from('workout_submissions')
      .select(`npub, ${timeColumn}`)
      .eq('competition_id', competition_id)
      .gte('submitted_at', startDate)
      .lte('submitted_at', comp.end_date)
      .in('npub', participantNpubs)
      .not(timeColumn, 'is', null)
      .order(timeColumn, { ascending: true })
      .limit(1)

    if (!workoutErr && workouts && workouts.length > 0) {
      winnerNpub = workouts[0].npub
    }
  } else if (comp.scoring_method === 'total_distance') {
    const { data: workouts, error: workoutErr } = await supabase
      .from('workout_submissions')
      .select('npub, distance_meters')
      .eq('competition_id', competition_id)
      .gte('submitted_at', startDate)
      .lte('submitted_at', comp.end_date)
      .in('npub', participantNpubs)

    if (!workoutErr && workouts && workouts.length > 0) {
      const totals: Record<string, number> = {}
      for (const w of workouts) {
        totals[w.npub] = (totals[w.npub] || 0) + (w.distance_meters || 0)
      }
      winnerNpub = Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0]
    }
  } else if (comp.scoring_method === 'workout_count') {
    const { data: workouts, error: workoutErr } = await supabase
      .from('workout_submissions')
      .select('npub')
      .eq('competition_id', competition_id)
      .gte('submitted_at', startDate)
      .lte('submitted_at', comp.end_date)
      .in('npub', participantNpubs)

    if (!workoutErr && workouts && workouts.length > 0) {
      const counts: Record<string, number> = {}
      for (const w of workouts) {
        counts[w.npub] = (counts[w.npub] || 0) + 1
      }
      winnerNpub = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    }
  } else if (comp.scoring_method === 'total_steps') {
    const { data: workouts, error: workoutErr } = await supabase
      .from('workout_submissions')
      .select('npub, step_count')
      .eq('competition_id', competition_id)
      .gte('submitted_at', startDate)
      .lte('submitted_at', comp.end_date)
      .in('npub', participantNpubs)

    if (!workoutErr && workouts && workouts.length > 0) {
      const totals: Record<string, number> = {}
      for (const w of workouts) {
        totals[w.npub] = (totals[w.npub] || 0) + (w.step_count || 0)
      }
      winnerNpub = Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0]
    }
  }

  const updatedConfig = {
    ...config,
    challenge_status: 'completed',
    winner_npub: winnerNpub,
  }

  const { error: updateErr } = await supabase
    .from('competitions')
    .update({ config: updatedConfig })
    .eq('id', competition_id)

  if (updateErr) {
    console.error('Complete challenge update error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Completed challenge: ${competition_id}, winner: ${winnerNpub ? (winnerNpub as string).slice(0, 12) + '...' : 'none (tie/no workouts)'}`)
  return jsonResponse({
    success: true,
    data: { challenge_status: 'completed', winner_npub: winnerNpub },
  })
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
      case 'join':
        return await handleJoin(supabase, params)
      case 'leave':
        return await handleLeave(supabase, params)
      case 'create':
        return await handleCreate(supabase, params)
      case 'update':
        return await handleUpdate(supabase, params)
      case 'delete':
        return await handleDelete(supabase, params)
      case 'update-profile':
        return await handleUpdateProfile(supabase, params)
      case 'auto-join-members':
        return await handleAutoJoinMembers(supabase, params)
      case 'create-challenge':
        return await handleCreateChallenge(supabase, params)
      case 'accept-challenge':
        return await handleAcceptChallenge(supabase, params)
      case 'decline-challenge':
        return await handleDeclineChallenge(supabase, params)
      case 'complete-challenge':
        return await handleCompleteChallenge(supabase, params)
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
