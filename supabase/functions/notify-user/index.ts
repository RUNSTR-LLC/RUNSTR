/**
 * Supabase Edge Function: notify-user
 *
 * Sends a targeted push notification to a specific user via their npub.
 * Uses SHA256(npub) as token_key to look up the user's Expo push token
 * in the broadcast_tokens table.
 *
 * Privacy: Raw npub is never stored - only the hash (token_key) is used for lookup.
 *
 * Use cases:
 * - Reward earned notification (called from claim-reward after payment)
 * - Auto-joined competition notification (called from submit-workout)
 * - Step reward notification
 *
 * Input: { npub, title, body, data?, channelId? }
 * Output: { sent: boolean, error?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Compute SHA256 hash of a string (same algorithm as client-side expo-crypto)
 */
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface NotifyRequest {
  npub: string
  title: string
  body: string
  data?: Record<string, unknown>
  channelId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { npub, title, body, data, channelId }: NotifyRequest = await req.json()

    if (!npub || !title || !body) {
      return new Response(
        JSON.stringify({ sent: false, error: 'Missing required fields: npub, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Compute token_key from npub
    const tokenKey = await sha256Hex(npub)
    console.log(`[notify-user] Looking up token for ${npub.slice(0, 12)}... (key: ${tokenKey.slice(0, 16)}...)`)

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Look up active tokens for this user
    const { data: tokens, error: tokenError } = await supabase
      .from('broadcast_tokens')
      .select('token')
      .eq('token_key', tokenKey)
      .eq('is_active', true)

    if (tokenError) {
      console.error('[notify-user] Token lookup error:', tokenError)
      return new Response(
        JSON.stringify({ sent: false, error: tokenError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tokens || tokens.length === 0) {
      console.log('[notify-user] No active tokens found for user')
      return new Response(
        JSON.stringify({ sent: false, error: 'no_tokens' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[notify-user] Found ${tokens.length} token(s), sending notification`)

    // Build push messages
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: channelId || 'default',
    }))

    // Send to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[notify-user] Expo Push API error:', errorText)
      return new Response(
        JSON.stringify({ sent: false, error: `Expo API: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    console.log(`[notify-user] Push sent to ${tokens.length} device(s):`, result)

    return new Response(
      JSON.stringify({ sent: true, devices: tokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[notify-user] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
