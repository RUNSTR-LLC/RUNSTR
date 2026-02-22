/**
 * Supabase Edge Function: manage-club
 * Handles all club write operations with server-side authorization.
 * Accepts { action, ...params } and returns { success, data?, error? }.
 * Actions: join, leave, remove-member, transfer-captain, update-club, create-club
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// --- ACTION: join ---
async function handleJoin(
  supabase: ReturnType<typeof createClient>,
  params: { npub: string; club_id: string }
) {
  const { npub, club_id } = params
  if (!npub || !club_id) {
    return jsonResponse({ success: false, error: 'Missing required fields: npub, club_id' }, 400)
  }

  // Check if user is already in a club
  const { data: existing } = await supabase
    .from('club_memberships')
    .select('id, club_id')
    .eq('member_npub', npub)
    .maybeSingle()

  if (existing) {
    return jsonResponse(
      { success: false, error: 'You are already a member of a club. Leave your current club first.' },
      409
    )
  }

  // Insert membership with role=member (always forced)
  const { error: insertError } = await supabase
    .from('club_memberships')
    .insert({ club_id, member_npub: npub, role: 'member' })

  if (insertError) {
    console.error('Join insert error:', insertError)
    return jsonResponse({ success: false, error: insertError.message }, 500)
  }
  // Adjust member count +1
  const { error: rpcError } = await supabase.rpc('adjust_member_count', {
    team_id: club_id,
    delta: 1,
  })
  if (rpcError) console.error('adjust_member_count error:', rpcError)
  // Auto-join active/upcoming club events
  try {
    const now = new Date().toISOString()
    const { data: clubEvents } = await supabase
      .from('competitions')
      .select('id')
      .eq('club_id', club_id)
      .gte('end_date', now)

    if (clubEvents && clubEvents.length > 0) {
      for (const event of clubEvents) {
        await supabase
          .from('competition_participants')
          .upsert(
            { competition_id: event.id, npub },
            { onConflict: 'competition_id,npub' }
          )
      }
      console.log(`Auto-joined ${npub.slice(0, 12)}... into ${clubEvents.length} club event(s)`)
    }
  } catch (autoJoinErr) {
    console.warn('Club event auto-join error (non-fatal):', autoJoinErr)
  }

  // Fetch and return club data
  const { data: clubData } = await supabase
    .from('user_teams').select('*').eq('id', club_id).single()
  console.log(`Club join: ${npub.slice(0, 12)}... joined club ${club_id}`)
  return jsonResponse({ success: true, data: clubData })
}

// --- ACTION: leave ---
async function handleLeave(
  supabase: ReturnType<typeof createClient>,
  params: { npub: string; club_id: string }
) {
  const { npub, club_id } = params
  if (!npub || !club_id) {
    return jsonResponse({ success: false, error: 'Missing required fields: npub, club_id' }, 400)
  }

  // Verify user is a member of this club
  const { data: membership } = await supabase
    .from('club_memberships')
    .select('id, role, joined_at')
    .eq('member_npub', npub)
    .eq('club_id', club_id)
    .maybeSingle()

  if (!membership) {
    return jsonResponse({ success: false, error: 'You are not a member of this club.' }, 404)
  }

  const isCaptain = membership.role === 'captain'

  if (isCaptain) {
    // Count other members
    const { count } = await supabase
      .from('club_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', club_id)
      .neq('member_npub', npub)

    const otherMembers = count ?? 0
    if (otherMembers > 0) {
      return jsonResponse(
        { success: false, error: 'Transfer captainship before leaving. Your club still has other members.' },
        400
      )
    }
    // Sole captain - will deactivate club below
  } else {
    // Non-captain: enforce 7-day cooldown
    const joinedAt = new Date(membership.joined_at)
    const now = new Date()
    const daysSinceJoin = (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceJoin < 7) {
      const remainingDays = Math.ceil(7 - daysSinceJoin)
      return jsonResponse(
        { success: false, error: `You must wait ${remainingDays} more day(s) before leaving. 7-day cooldown is in effect.` },
        400
      )
    }
  }

  // Delete membership
  const { error: deleteError } = await supabase
    .from('club_memberships')
    .delete()
    .eq('member_npub', npub)
    .eq('club_id', club_id)

  if (deleteError) {
    console.error('Leave delete error:', deleteError)
    return jsonResponse({ success: false, error: deleteError.message }, 500)
  }

  // Adjust member count -1, deactivate if captain was sole member
  const deactivateIfEmpty = isCaptain
  const { error: rpcError } = await supabase.rpc('adjust_member_count', {
    team_id: club_id,
    delta: -1,
    deactivate_if_empty: deactivateIfEmpty,
  })
  if (rpcError) {
    console.error('adjust_member_count error:', rpcError)
  }

  console.log(`Club leave: ${npub.slice(0, 12)}... left club ${club_id}${deactivateIfEmpty ? ' (deactivated)' : ''}`)
  return jsonResponse({ success: true })
}

// --- ACTION: remove-member ---
async function handleRemoveMember(
  supabase: ReturnType<typeof createClient>,
  params: { npub: string; club_id: string; target_npub: string }
) {
  const { npub, club_id, target_npub } = params
  if (!npub || !club_id || !target_npub) {
    return jsonResponse(
      { success: false, error: 'Missing required fields: npub, club_id, target_npub' },
      400
    )
  }

  // Verify caller is captain
  const { data: callerMembership } = await supabase
    .from('club_memberships')
    .select('role')
    .eq('member_npub', npub)
    .eq('club_id', club_id)
    .maybeSingle()

  if (!callerMembership || callerMembership.role !== 'captain') {
    return jsonResponse({ success: false, error: 'Only the captain can remove members.' }, 403)
  }

  // Delete target membership
  const { error: deleteError } = await supabase
    .from('club_memberships')
    .delete()
    .eq('club_id', club_id)
    .eq('member_npub', target_npub)

  if (deleteError) {
    console.error('Remove member delete error:', deleteError)
    return jsonResponse({ success: false, error: deleteError.message }, 500)
  }

  // Adjust member count -1
  const { error: rpcError } = await supabase.rpc('adjust_member_count', {
    team_id: club_id,
    delta: -1,
  })
  if (rpcError) {
    console.error('adjust_member_count error:', rpcError)
  }

  console.log(`Member removed: ${target_npub.slice(0, 12)}... from club ${club_id} by captain ${npub.slice(0, 12)}...`)
  return jsonResponse({ success: true })
}

// --- ACTION: transfer-captain ---
async function handleTransferCaptain(
  supabase: ReturnType<typeof createClient>,
  params: { npub: string; club_id: string; target_npub: string }
) {
  const { npub, club_id, target_npub } = params
  if (!npub || !club_id || !target_npub) {
    return jsonResponse(
      { success: false, error: 'Missing required fields: npub, club_id, target_npub' },
      400
    )
  }

  // Verify caller is captain
  const { data: callerMembership } = await supabase
    .from('club_memberships')
    .select('role')
    .eq('member_npub', npub)
    .eq('club_id', club_id)
    .maybeSingle()

  if (!callerMembership || callerMembership.role !== 'captain') {
    return jsonResponse({ success: false, error: 'Only the captain can transfer captainship.' }, 403)
  }

  // Verify target is a member of the club
  const { data: targetMembership } = await supabase
    .from('club_memberships')
    .select('role')
    .eq('member_npub', target_npub)
    .eq('club_id', club_id)
    .maybeSingle()

  if (!targetMembership) {
    return jsonResponse({ success: false, error: 'Target user is not a member of this club.' }, 404)
  }

  // Promote-first for safety:
  // 1. Promote target to captain
  const { error: promoteError } = await supabase
    .from('club_memberships')
    .update({ role: 'captain' })
    .eq('club_id', club_id)
    .eq('member_npub', target_npub)

  if (promoteError) {
    console.error('Promote error:', promoteError)
    return jsonResponse({ success: false, error: promoteError.message }, 500)
  }

  // 2. Demote all other captains (including the caller) to member
  const { error: demoteError } = await supabase
    .from('club_memberships')
    .update({ role: 'member' })
    .eq('club_id', club_id)
    .eq('role', 'captain')
    .neq('member_npub', target_npub)

  if (demoteError) {
    console.error('Demote error:', demoteError)
    return jsonResponse({ success: false, error: demoteError.message }, 500)
  }

  // 3. Update user_teams created_by_npub to new captain
  const { error: teamUpdateError } = await supabase
    .from('user_teams')
    .update({ created_by_npub: target_npub })
    .eq('id', club_id)

  if (teamUpdateError) {
    console.error('Team update error:', teamUpdateError)
    return jsonResponse({ success: false, error: teamUpdateError.message }, 500)
  }

  console.log(`Captain transferred: club ${club_id} from ${npub.slice(0, 12)}... to ${target_npub.slice(0, 12)}...`)
  return jsonResponse({ success: true })
}

// --- ACTION: update-club ---
async function handleUpdateClub(
  supabase: ReturnType<typeof createClient>,
  params: { npub: string; club_id: string; updates: Record<string, unknown> }
) {
  const { npub, club_id, updates } = params
  if (!npub || !club_id || !updates) {
    return jsonResponse(
      { success: false, error: 'Missing required fields: npub, club_id, updates' },
      400
    )
  }

  // Verify caller is captain
  const { data: callerMembership } = await supabase
    .from('club_memberships')
    .select('role')
    .eq('member_npub', npub)
    .eq('club_id', club_id)
    .maybeSingle()

  if (!callerMembership || callerMembership.role !== 'captain') {
    return jsonResponse({ success: false, error: 'Only the captain can update club settings.' }, 403)
  }

  // Whitelist allowed fields
  const allowedFields = ['description', 'lightning_address', 'banner_url', 'leaderboard_metric']
  const sanitizedUpdates: Record<string, unknown> = {}

  for (const key of allowedFields) {
    if (key in updates) {
      sanitizedUpdates[key] = updates[key]
    }
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    return jsonResponse({ success: false, error: 'No valid fields to update. Allowed: description, lightning_address, banner_url, leaderboard_metric' }, 400)
  }

  const { error: updateError } = await supabase
    .from('user_teams')
    .update(sanitizedUpdates)
    .eq('id', club_id)

  if (updateError) {
    console.error('Update club error:', updateError)
    return jsonResponse({ success: false, error: updateError.message }, 500)
  }

  console.log(`Club updated: ${club_id} by captain ${npub.slice(0, 12)}... fields: ${Object.keys(sanitizedUpdates).join(', ')}`)
  return jsonResponse({ success: true })
}

// --- ACTION: create-club ---
async function handleCreateClub(
  supabase: ReturnType<typeof createClient>,
  params: { npub: string; name: string; description?: string; lightning_address?: string }
) {
  const { npub, name, description, lightning_address } = params
  if (!npub || !name) {
    return jsonResponse({ success: false, error: 'Missing required fields: npub, name' }, 400)
  }

  // Check if user is already in a club
  const { data: existing } = await supabase
    .from('club_memberships')
    .select('id, club_id')
    .eq('member_npub', npub)
    .maybeSingle()

  if (existing) {
    return jsonResponse(
      { success: false, error: 'You are already a member of a club. Leave your current club first.' },
      409
    )
  }

  // Check duplicate name (case-insensitive) among active clubs
  const { data: duplicate } = await supabase
    .from('user_teams')
    .select('id')
    .ilike('name', name)
    .eq('is_active', true)
    .maybeSingle()

  if (duplicate) {
    return jsonResponse(
      { success: false, error: 'A club with this name already exists. Please choose a different name.' },
      409
    )
  }

  // Insert the new club
  const { data: newTeam, error: teamError } = await supabase
    .from('user_teams')
    .insert({
      name,
      description: description || null,
      lightning_address: lightning_address || null,
      created_by_npub: npub,
      is_active: true,
    })
    .select('id')
    .single()

  if (teamError || !newTeam) {
    console.error('Create club error:', teamError)
    return jsonResponse({ success: false, error: teamError?.message || 'Failed to create club' }, 500)
  }

  const clubId = newTeam.id

  // Insert creator as captain
  const { error: memberError } = await supabase
    .from('club_memberships')
    .insert({ club_id: clubId, member_npub: npub, role: 'captain' })

  if (memberError) {
    console.error('Create club membership error:', memberError)
    return jsonResponse({ success: false, error: memberError.message }, 500)
  }

  // Adjust member count +1
  const { error: rpcError } = await supabase.rpc('adjust_member_count', {
    team_id: clubId,
    delta: 1,
  })
  if (rpcError) {
    console.error('adjust_member_count error:', rpcError)
  }

  console.log(`Club created: ${clubId} "${name}" by ${npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { id: clubId } })
}

// --- MAIN HANDLER ---
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { action, ...params } = body

    if (!action) {
      return jsonResponse({ success: false, error: 'Missing required field: action' }, 400)
    }

    switch (action) {
      case 'join':
        return await handleJoin(supabase, params as { npub: string; club_id: string })

      case 'leave':
        return await handleLeave(supabase, params as { npub: string; club_id: string })

      case 'remove-member':
        return await handleRemoveMember(
          supabase,
          params as { npub: string; club_id: string; target_npub: string }
        )

      case 'transfer-captain':
        return await handleTransferCaptain(
          supabase,
          params as { npub: string; club_id: string; target_npub: string }
        )

      case 'update-club':
        return await handleUpdateClub(
          supabase,
          params as { npub: string; club_id: string; updates: Record<string, unknown> }
        )

      case 'create-club':
        return await handleCreateClub(
          supabase,
          params as { npub: string; name: string; description?: string; lightning_address?: string }
        )

      default:
        return jsonResponse(
          { success: false, error: `Unknown action: ${action}. Valid actions: join, leave, remove-member, transfer-captain, update-club, create-club` },
          400
        )
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return jsonResponse({ success: false, error: error.message }, 500)
  }
})
