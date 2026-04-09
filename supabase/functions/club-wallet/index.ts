/**
 * Supabase Edge Function: club-wallet
 *
 * Manages CoinOS wallets for club rewards pools.
 * Credentials are AES-256-GCM encrypted in the edge function before storage.
 * The JWT from registration is stored so we never need to call /login
 * (CoinOS login requires captcha).
 *
 * Operations:
 * - create_wallet:           Create CoinOS account, store encrypted creds + JWT
 * - get_balance:             Use stored JWT to fetch balance from CoinOS
 * - get_lightning_address:   Return club's Lightning address from DB
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as b64Encode, decode as b64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

// CoinOS API
const COINOS_API_BASE = 'https://coinos.io/api'
const COINOS_TIMEOUT = 15000

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// AES-256-GCM Encryption (Deno native crypto)
// ============================================

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('CLUB_WALLET_ENCRYPTION_KEY')
  if (!keyB64) {
    throw new Error('CLUB_WALLET_ENCRYPTION_KEY env var not set')
  }
  const keyMaterial = new TextEncoder().encode(keyB64)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial)
  return crypto.subtle.importKey('raw', hashBuffer, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return b64Encode(iv) + ':' + b64Encode(new Uint8Array(ciphertext))
}

async function decrypt(encrypted: string): Promise<string> {
  const key = await getEncryptionKey()
  const [ivB64, ctB64] = encrypted.split(':')
  if (!ivB64 || !ctB64) throw new Error('Invalid encrypted format')
  const iv = b64Decode(ivB64)
  const ciphertext = b64Decode(ctB64)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
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
// Store / Retrieve credentials (service_role direct table access)
// ============================================

async function storeWalletCredentials(
  supabase: ReturnType<typeof createClient>,
  clubId: string,
  username: string,
  password: string,
  jwt: string,
  lightningAddress: string
): Promise<{ success: boolean; error?: string }> {
  const encryptedPassword = await encrypt(password)
  const encryptedJwt = await encrypt(jwt)

  const { error } = await supabase
    .from('club_wallets')
    .insert({
      club_id: clubId,
      coinos_username: username,
      coinos_password_encrypted: encryptedPassword,
      coinos_jwt_encrypted: encryptedJwt,
      lightning_address: lightningAddress,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

async function getWalletJwt(
  supabase: ReturnType<typeof createClient>,
  clubId: string
): Promise<{ jwt: string; lightning_address: string } | null> {
  const { data, error } = await supabase
    .from('club_wallets')
    .select('coinos_jwt_encrypted, lightning_address')
    .eq('club_id', clubId)
    .single()

  if (error || !data) return null

  const jwt = await decrypt(data.coinos_jwt_encrypted)
  return { jwt, lightning_address: data.lightning_address }
}

// ============================================
// Request Types
// ============================================

type Operation = 'create_wallet' | 'get_balance' | 'get_lightning_address'

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
        return new Response(
          JSON.stringify({ success: true, lightning_address: existing.lightning_address, already_exists: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const password = generatePassword()
      let username = generateUsername(club_id)
      let regToken: string | undefined

      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await coinosRegister(username, password)
        if (result.success && result.token) {
          regToken = result.token
          break
        }
        if (result.error === 'username_taken') {
          username = generateUsername(club_id)
          continue
        }
        return new Response(
          JSON.stringify({ success: false, reason: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!regToken) {
        return new Response(
          JSON.stringify({ success: false, reason: 'could_not_register_username' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const lightningAddress = `${username}@coinos.io`

      // Store encrypted credentials + JWT
      const storeResult = await storeWalletCredentials(supabase, club_id, username, password, regToken, lightningAddress)
      if (!storeResult.success) {
        return new Response(
          JSON.stringify({ success: false, reason: storeResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update lightning_address on user_teams
      await supabase.from('user_teams').update({ lightning_address: lightningAddress }).eq('id', club_id)

      console.log(`[club-wallet] Created wallet for club ${club_id}: ${lightningAddress}`)

      return new Response(
        JSON.stringify({ success: true, lightning_address: lightningAddress }),
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

      const wallet = await getWalletJwt(supabase, club_id)
      if (!wallet) {
        return new Response(
          JSON.stringify({ success: false, reason: 'no_wallet', balance_sats: 0 }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Use stored JWT directly — no login needed (CoinOS login requires captcha)
      const balanceResult = await coinosGetBalance(wallet.jwt)
      if (!balanceResult.success) {
        return new Response(
          JSON.stringify({ success: false, reason: balanceResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, balance_sats: balanceResult.balance, lightning_address: wallet.lightning_address }),
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
        JSON.stringify({ success: true, lightning_address: data.lightning_address }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, reason: 'unknown_operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[club-wallet] Error:', error)
    return new Response(
      JSON.stringify({ success: false, reason: error instanceof Error ? error.message : 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
