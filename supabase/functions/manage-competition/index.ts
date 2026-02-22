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
  const allowed = ['name', 'description']
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
