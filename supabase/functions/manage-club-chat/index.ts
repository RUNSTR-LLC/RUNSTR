/**
 * Supabase Edge Function: manage-club-chat
 *
 * Handles club chat write operations with server-side authorization.
 * Accepts { action, ...params } and returns { success, data?, error? }.
 *
 * Actions:
 *   send   - Send a message to a club chat (membership required, rate-limited)
 *   delete - Soft-delete a message (sender or captain only)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(error: string, status = 400) {
  return jsonResponse({ success: false, error }, status)
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleSend(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, unknown>,
) {
  const { club_id, sender_npub, content } = params as {
    club_id?: string
    sender_npub?: string
    content?: string
  }

  // --- Validate required params ---
  if (!club_id || !sender_npub || content === undefined || content === null) {
    return errorResponse('Missing required fields: club_id, sender_npub, content')
  }

  const trimmed = String(content).trim()
  if (trimmed.length === 0 || trimmed.length > 1000) {
    return errorResponse('Content must be between 1 and 1000 characters')
  }

  // --- Auth: sender must be a club member ---
  const { data: membership, error: memErr } = await supabase
    .from('club_memberships')
    .select('id')
    .eq('club_id', club_id)
    .eq('member_npub', sender_npub)
    .single()

  if (memErr || !membership) {
    return errorResponse('You are not a member of this club', 403)
  }

  // --- Rate limit: max 5 messages per 60 seconds ---
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()

  const { count, error: countErr } = await supabase
    .from('club_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_npub', sender_npub)
    .gt('created_at', oneMinuteAgo)

  if (countErr) {
    console.error('Rate limit check error:', countErr)
    return errorResponse('Failed to check rate limit', 500)
  }

  if ((count ?? 0) >= 5) {
    return errorResponse('Rate limited. Please wait before sending another message.', 429)
  }

  // --- Insert message ---
  const { data: message, error: insertErr } = await supabase
    .from('club_messages')
    .insert({ club_id, sender_npub, content: trimmed })
    .select()
    .single()

  if (insertErr) {
    console.error('Message insert error:', insertErr)
    return errorResponse(insertErr.message, 500)
  }

  console.log(`Message sent in club ${club_id} by ${sender_npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: message })
}

async function handleDelete(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, unknown>,
) {
  const { message_id, caller_npub } = params as {
    message_id?: string
    caller_npub?: string
  }

  // --- Validate required params ---
  if (!message_id || !caller_npub) {
    return errorResponse('Missing required fields: message_id, caller_npub')
  }

  // --- Fetch the message ---
  const { data: msg, error: fetchErr } = await supabase
    .from('club_messages')
    .select('sender_npub, club_id')
    .eq('id', message_id)
    .single()

  if (fetchErr || !msg) {
    return errorResponse('Message not found', 404)
  }

  // --- Auth: caller must be sender OR club captain ---
  const isSender = msg.sender_npub === caller_npub

  if (!isSender) {
    const { data: captainship, error: capErr } = await supabase
      .from('club_memberships')
      .select('id')
      .eq('club_id', msg.club_id)
      .eq('member_npub', caller_npub)
      .eq('role', 'captain')
      .single()

    if (capErr || !captainship) {
      return errorResponse('Only the message sender or club captain can delete messages', 403)
    }
  }

  // --- Soft-delete ---
  const { error: updateErr } = await supabase
    .from('club_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', message_id)

  if (updateErr) {
    console.error('Message delete error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Message ${message_id} deleted by ${caller_npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { message_id, deleted: true } })
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Handle CORS preflight
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

    switch (action) {
      case 'send':
        return await handleSend(supabase, params)
      case 'delete':
        return await handleDelete(supabase, params)
      default:
        return errorResponse(`Unknown action: ${action}`)
    }
  } catch (err) {
    console.error('Edge function error:', err)
    return jsonResponse({ success: false, error: err.message }, 500)
  }
})
