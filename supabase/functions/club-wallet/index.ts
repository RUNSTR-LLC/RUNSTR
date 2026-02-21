/**
 * Supabase Edge Function: club-wallet
 *
 * Manages CoinOS wallets for club rewards pools.
 * All credentials are encrypted in the database — never exposed to clients.
 *
 * Operations:
 * - create_wallet:           Create CoinOS account, encrypt + store credentials
 * - get_balance:             Decrypt credentials, fetch balance from CoinOS
 * - get_lightning_address:   Return club's Lightning address from DB
 * - backfill_existing_clubs: Create wallets for all clubs that don't have one yet
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CoinOS API
const COINOS_API_BASE = 'https://coinos.io/api'
const COINOS_TIMEOUT = 15000

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// CoinOS HTTP Helpers
// ============================================

function generatePassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const randomBytes = new Uint8Array(length)
  crypto.getRandomValues(randomBytes)
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomBytes[i] % chars.length)
  }
  return result
}

/**
 * Generate a unique CoinOS username for a club.
 * Format: club{first6_of_club_id}{timestamp8}{random3}
 */
function generateUsername(clubId: string): string {
  const prefix = clubId.replace(/-/g, '').slice(0, 6)
  const ts = Date.now().toString(36).slice(-8)
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `club${prefix}${ts}${rand}`
}

async function coinosRegister(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), COINOS_TIMEOUT)

    const response = await fetch(`${COINOS_API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { username, password } }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      return { success: true, token: data.token }
    }

    if (response.status === 409) {
      return { success: false, error: 'username_taken' }
    }

    const errorText = await response.text()
    return { success: false, error: `Registration failed: ${response.status} ${errorText}` }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function coinosLogin(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), COINOS_TIMEOUT)

    const response = await fetch(`${COINOS_API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return { success: false, error: `Login failed: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, token: data.token }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function coinosGetBalance(jwt: string): Promise<{ success: boolean; balance?: number; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), COINOS_TIMEOUT)

    const response = await fetch(`${COINOS_API_BASE}/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}` },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return { success: false, error: `Balance fetch failed: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, balance: data.balance ?? 0 }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================
// Request Types
// ============================================

type Operation = 'create_wallet' | 'get_balance' | 'get_lightning_address' | 'backfill_existing_clubs'

interface RequestBody {
  operation: Operation
  club_id?: string
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { operation } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ========================================
    // Operation: create_wallet
    // ========================================
    if (operation === 'create_wallet') {
      const { club_id } = body

      if (!club_id) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_club_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if wallet already exists
      const { data: existing } = await supabase
        .from('club_wallets')
        .select('lightning_address')
        .eq('club_id', club_id)
        .single()

      if (existing) {
        console.log(`[club-wallet] Wallet already exists for club ${club_id}`)
        return new Response(
          JSON.stringify({
            success: true,
            lightning_address: existing.lightning_address,
            already_exists: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate credentials
      const password = generatePassword()
      let username = generateUsername(club_id)
      let registered = false
      let token: string | undefined

      // Try up to 3 times with different usernames
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await coinosRegister(username, password)

        if (result.success) {
          registered = true
          token = result.token
          break
        }

        if (result.error === 'username_taken') {
          // Append random suffix and retry
          username = generateUsername(club_id)
          console.log(`[club-wallet] Username taken, trying: ${username}`)
          continue
        }

        // Other error — bail
        console.error(`[club-wallet] Registration failed: ${result.error}`)
        return new Response(
          JSON.stringify({ success: false, reason: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!registered) {
        return new Response(
          JSON.stringify({ success: false, reason: 'could_not_register_username' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const lightningAddress = `${username}@coinos.io`

      // Store encrypted credentials via RPC
      const { error: insertError } = await supabase.rpc('insert_club_wallet', {
        p_club_id: club_id,
        p_coinos_username: username,
        p_coinos_password: password,
        p_lightning_address: lightningAddress,
      })

      if (insertError) {
        console.error(`[club-wallet] Failed to store credentials: ${insertError.message}`)
        return new Response(
          JSON.stringify({ success: false, reason: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Also update the club's lightning_address in user_teams
      await supabase
        .from('user_teams')
        .update({ lightning_address: lightningAddress })
        .eq('id', club_id)

      console.log(`[club-wallet] Created wallet for club ${club_id}: ${lightningAddress}`)

      return new Response(
        JSON.stringify({
          success: true,
          lightning_address: lightningAddress,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: get_balance
    // ========================================
    if (operation === 'get_balance') {
      const { club_id } = body

      if (!club_id) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_club_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get decrypted credentials via RPC
      const { data: creds, error: credError } = await supabase.rpc(
        'get_club_wallet_credentials',
        { p_club_id: club_id }
      )

      if (credError || !creds || creds.length === 0) {
        console.error(`[club-wallet] No wallet found for club ${club_id}:`, credError?.message)
        return new Response(
          JSON.stringify({ success: false, reason: 'no_wallet', balance_sats: 0 }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { coinos_username, coinos_password, lightning_address } = creds[0]

      // Login to CoinOS
      const loginResult = await coinosLogin(coinos_username, coinos_password)
      if (!loginResult.success || !loginResult.token) {
        console.error(`[club-wallet] CoinOS login failed for ${coinos_username}`)
        return new Response(
          JSON.stringify({ success: false, reason: 'coinos_login_failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get balance
      const balanceResult = await coinosGetBalance(loginResult.token)
      if (!balanceResult.success) {
        return new Response(
          JSON.stringify({ success: false, reason: balanceResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[club-wallet] Balance for ${club_id}: ${balanceResult.balance} sats`)

      return new Response(
        JSON.stringify({
          success: true,
          balance_sats: balanceResult.balance,
          lightning_address,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: get_lightning_address
    // ========================================
    if (operation === 'get_lightning_address') {
      const { club_id } = body

      if (!club_id) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_club_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Read Lightning address directly (no decryption needed)
      const { data, error } = await supabase
        .from('club_wallets')
        .select('lightning_address')
        .eq('club_id', club_id)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, reason: 'no_wallet' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          lightning_address: data.lightning_address,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: backfill_existing_clubs
    // Creates wallets for all clubs that don't have one yet.
    // Call this once after deploying the migration.
    // ========================================
    if (operation === 'backfill_existing_clubs') {
      // Get all active clubs
      const { data: clubs, error: clubsError } = await supabase
        .from('user_teams')
        .select('id, name')
        .eq('is_active', true)

      if (clubsError || !clubs) {
        return new Response(
          JSON.stringify({ success: false, reason: clubsError?.message || 'no_clubs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get clubs that already have wallets
      const { data: existingWallets } = await supabase
        .from('club_wallets')
        .select('club_id')

      const existingClubIds = new Set((existingWallets || []).map((w: { club_id: string }) => w.club_id))

      const results: Array<{ club_id: string; name: string; success: boolean; lightning_address?: string; error?: string }> = []

      for (const club of clubs) {
        if (existingClubIds.has(club.id)) {
          console.log(`[club-wallet] Skipping ${club.name} — wallet already exists`)
          continue
        }

        console.log(`[club-wallet] Creating wallet for existing club: ${club.name} (${club.id})`)

        // Generate credentials
        const password = generatePassword()
        let username = generateUsername(club.id)
        let registered = false

        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await coinosRegister(username, password)
          if (result.success) {
            registered = true
            break
          }
          if (result.error === 'username_taken') {
            username = generateUsername(club.id)
            continue
          }
          results.push({ club_id: club.id, name: club.name, success: false, error: result.error })
          break
        }

        if (!registered) {
          if (!results.find(r => r.club_id === club.id)) {
            results.push({ club_id: club.id, name: club.name, success: false, error: 'could_not_register' })
          }
          continue
        }

        const lightningAddress = `${username}@coinos.io`

        // Store encrypted credentials
        const { error: insertError } = await supabase.rpc('insert_club_wallet', {
          p_club_id: club.id,
          p_coinos_username: username,
          p_coinos_password: password,
          p_lightning_address: lightningAddress,
        })

        if (insertError) {
          results.push({ club_id: club.id, name: club.name, success: false, error: insertError.message })
          continue
        }

        // Update lightning_address on user_teams
        await supabase
          .from('user_teams')
          .update({ lightning_address: lightningAddress })
          .eq('id', club.id)

        results.push({ club_id: club.id, name: club.name, success: true, lightning_address: lightningAddress })
        console.log(`[club-wallet] Created wallet for ${club.name}: ${lightningAddress}`)

        // Small delay to avoid CoinOS rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const created = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const skipped = clubs.length - results.length

      console.log(`[club-wallet] Backfill complete: ${created} created, ${failed} failed, ${skipped} skipped`)

      return new Response(
        JSON.stringify({
          success: true,
          created,
          failed,
          skipped,
          total_clubs: clubs.length,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Unknown operation
    return new Response(
      JSON.stringify({ success: false, reason: 'unknown_operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[club-wallet] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        reason: error instanceof Error ? error.message : 'internal_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
