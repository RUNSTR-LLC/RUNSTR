/**
 * Supabase Edge Function: claim-reward (NWC Gateway)
 *
 * Handles ALL NWC operations server-side to keep credentials secure:
 *
 * Operations:
 * - claim_reward: Rate-limited reward claims (workout/steps) with eligibility checking
 * - pay_invoice: Pay any Lightning invoice (for donation splits, payouts)
 * - create_invoice: Create invoice for receiving payments (charity donations)
 * - lookup_invoice: Check if an invoice has been paid
 * - get_balance: Get wallet balance (for monitoring)
 *
 * Rate Limits (for claim_reward only):
 * - Workout reward: 1 per Lightning address per day (50 base + streak bonus)
 * - Step reward: Max 100 sats per Lightning address per day
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as secp from 'https://esm.sh/@noble/secp256k1@1.7.1'
import { bytesToHex, hexToBytes } from 'https://esm.sh/@noble/hashes@1.3.2/utils'
import { sha256 } from 'https://esm.sh/@noble/hashes@1.3.2/sha256'

// Constants
const WORKOUT_REWARD_SATS = 50
const STEP_SATS_PER_MILESTONE = 5
const MAX_DAILY_STEP_SATS = 50
const NWC_TIMEOUT_MS = 30000

/**
 * Fetch the active reward sponsor name from the database.
 * Returns 'RUNSTR' as fallback if no active sponsor found.
 */
async function getActiveSponsorName(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from('reward_sponsors')
      .select('name')
      .eq('is_active', true)
      .maybeSingle()
    return data?.name || 'ALS Network'
  } catch {
    return 'ALS Network'
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// LNURL Functions
// ============================================

interface LNURLPayDetails {
  callback: string
  minSendable: number
  maxSendable: number
  tag: string
}

/**
 * Fetch LNURL-pay details from Lightning address
 */
async function fetchLNURLPayDetails(lightningAddress: string): Promise<LNURLPayDetails> {
  const [name, domain] = lightningAddress.split('@')

  if (!name || !domain) {
    throw new Error('Invalid Lightning address format')
  }

  const lnurlUrl = `https://${domain}/.well-known/lnurlp/${name}`
  console.log('[LNURL] Fetching details from:', lnurlUrl)

  const response = await fetch(lnurlUrl, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`LNURL fetch failed: ${response.status}`)
  }

  const data = await response.json()

  if (data.status === 'ERROR') {
    throw new Error(data.reason || 'LNURL error')
  }

  return data as LNURLPayDetails
}

/**
 * Request invoice from LNURL callback
 */
async function requestInvoice(
  callbackUrl: string,
  amountSats: number,
  comment: string
): Promise<string> {
  const url = new URL(callbackUrl)
  url.searchParams.set('amount', (amountSats * 1000).toString()) // millisats
  url.searchParams.set('comment', comment)

  console.log('[LNURL] Requesting invoice for', amountSats, 'sats')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Invoice request failed: ${response.status}`)
  }

  const data = await response.json()

  if (data.status === 'ERROR') {
    throw new Error(data.reason || 'Invoice request error')
  }

  if (!data.pr) {
    throw new Error('No invoice returned')
  }

  return data.pr
}

/**
 * Get invoice from Lightning address
 */
async function getInvoiceFromLightningAddress(
  lightningAddress: string,
  amountSats: number,
  description: string
): Promise<string> {
  const details = await fetchLNURLPayDetails(lightningAddress)
  const amountMillisats = amountSats * 1000

  if (amountMillisats < details.minSendable) {
    throw new Error(`Amount too small. Min: ${details.minSendable / 1000} sats`)
  }

  if (amountMillisats > details.maxSendable) {
    throw new Error(`Amount too large. Max: ${details.maxSendable / 1000} sats`)
  }

  return requestInvoice(details.callback, amountSats, description)
}

// ============================================
// NWC (Nostr Wallet Connect) Implementation
// ============================================

/**
 * Parse NWC URL to extract connection details
 * Format: nostr+walletconnect://pubkey?relay=wss://...&secret=...
 */
function parseNWCUrl(nwcUrl: string): {
  walletPubkey: string
  relay: string
  secret: string
} {
  // Remove protocol prefix
  const urlStr = nwcUrl.replace('nostr+walletconnect://', 'https://')
  const url = new URL(urlStr)

  const walletPubkey = url.hostname || url.pathname.replace('//', '')
  const relay = url.searchParams.get('relay')
  const secret = url.searchParams.get('secret')

  console.log('[NWC Parse] Raw URL length:', nwcUrl.length)
  console.log('[NWC Parse] Wallet pubkey:', walletPubkey?.slice(0, 16) + '...')
  console.log('[NWC Parse] Relay (decoded):', relay)
  console.log('[NWC Parse] Secret length:', secret?.length)

  if (!walletPubkey || !relay || !secret) {
    throw new Error('Invalid NWC URL: missing required parameters')
  }

  // Validate secret is valid hex (64 characters)
  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    console.error('[NWC Parse] Invalid secret format. Length:', secret.length, 'First 20 chars:', secret.slice(0, 20))
    throw new Error(`Invalid NWC secret format: expected 64 hex chars, got ${secret.length} chars`)
  }

  return { walletPubkey, relay, secret }
}

/**
 * Generate a random 32-byte hex string for event ID
 */
function generateEventId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

/**
 * Get current Unix timestamp
 */
function now(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Create serialized event for signing (NIP-01)
 */
function serializeEvent(event: {
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
}): string {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ])
}

/**
 * Calculate event ID (SHA256 of serialized event)
 */
function calculateEventId(event: {
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
}): string {
  const serialized = serializeEvent(event)
  const hash = sha256(new TextEncoder().encode(serialized))
  return bytesToHex(hash)
}

/**
 * Sign an event ID (NIP-01 format) using Schnorr signatures (BIP340)
 * The signature is on the event ID bytes directly (id is already sha256 of serialized event)
 * Compatible with @noble/secp256k1 v1.7.1
 */
async function signEventId(eventIdHex: string, privateKeyHex: string): Promise<string> {
  // NIP-01 requires Schnorr signatures (BIP340), not ECDSA
  // v1.7.1 has schnorr module with sign function that accepts hex strings
  const sig = await secp.schnorr.sign(eventIdHex, privateKeyHex)
  return bytesToHex(sig)
}

/**
 * Get public key from private key (hex string)
 * For Nostr/BIP340, we need the 32-byte x-only public key
 * Compatible with @noble/secp256k1 v1.7.1
 */
function getPublicKey(privateKeyHex: string): string {
  // For Schnorr/BIP340, use schnorr.getPublicKey which returns 32-byte x-only pubkey
  const pubkeyBytes = secp.schnorr.getPublicKey(privateKeyHex)
  return bytesToHex(pubkeyBytes)
}

/**
 * NIP-04 encryption (simplified for NWC)
 * Uses shared secret to encrypt content
 * Compatible with @noble/secp256k1 v1.7.1
 */
async function nip04Encrypt(
  plaintext: string,
  privateKeyHex: string,
  recipientPubkey: string
): Promise<string> {
  // Compute shared secret using ECDH
  // v1.7.1 accepts hex strings directly
  const sharedPoint = secp.getSharedSecret(privateKeyHex, '02' + recipientPubkey)
  const sharedX = sharedPoint.slice(1, 33)

  // Generate random IV
  const iv = new Uint8Array(16)
  crypto.getRandomValues(iv)

  // Import key for AES-CBC
  const key = await crypto.subtle.importKey(
    'raw',
    sharedX,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  )

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    new TextEncoder().encode(plaintext)
  )

  // Format as base64(ciphertext)?iv=base64(iv)
  const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  const ivB64 = btoa(String.fromCharCode(...iv))

  return `${ciphertextB64}?iv=${ivB64}`
}

/**
 * NIP-04 decryption
 * Compatible with @noble/secp256k1 v1.7.1
 */
async function nip04Decrypt(
  ciphertext: string,
  privateKeyHex: string,
  senderPubkey: string
): Promise<string> {
  // Parse ciphertext?iv=... format
  const [encryptedB64, ivPart] = ciphertext.split('?iv=')
  if (!ivPart) {
    throw new Error('Invalid NIP-04 format: missing IV')
  }

  // Compute shared secret
  // v1.7.1 accepts hex strings directly
  const sharedPoint = secp.getSharedSecret(privateKeyHex, '02' + senderPubkey)
  const sharedX = sharedPoint.slice(1, 33)

  // Decode base64
  const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0))
  const iv = Uint8Array.from(atob(ivPart), c => c.charCodeAt(0))

  // Import key for AES-CBC
  const key = await crypto.subtle.importKey(
    'raw',
    sharedX,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  )

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Generic NWC request function
 * Sends a NIP-47 request and returns the response
 */
async function sendNWCRequest(
  nwcUrl: string,
  method: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const { walletPubkey, relay, secret } = parseNWCUrl(nwcUrl)
  const clientPubkey = getPublicKey(secret)

  console.log('[NWC] Sending request:', method)
  console.log('[NWC] Connecting to relay:', relay)
  console.log('[NWC] Client pubkey:', clientPubkey.slice(0, 16) + '...')
  console.log('[NWC] Wallet pubkey:', walletPubkey.slice(0, 16) + '...')

  return new Promise((resolve) => {
    console.log('[NWC] Creating WebSocket to:', relay)
    const startTime = Date.now()
    const ws = new WebSocket(relay)
    let subscriptionId: string | null = null
    const timeout = setTimeout(() => {
      console.log('[NWC] Timeout after', Date.now() - startTime, 'ms. ReadyState:', ws.readyState)
      ws.close()
      resolve({ success: false, error: 'NWC timeout' })
    }, NWC_TIMEOUT_MS)

    ws.onopen = async () => {
      console.log('[NWC] Connected to relay after', Date.now() - startTime, 'ms')

      // Subscribe to responses (kind 23195)
      subscriptionId = generateEventId().slice(0, 16)
      const subFilter = {
        kinds: [23195],
        '#p': [clientPubkey],
        since: now() - 60, // Increased window to 60 seconds
      }
      console.log('[NWC] Subscribing with filter:', JSON.stringify(subFilter))
      ws.send(JSON.stringify(['REQ', subscriptionId, subFilter]))

      // Create NIP-47 request
      const request = JSON.stringify({ method, params })
      console.log('[NWC] Request payload:', request)

      // Encrypt request content
      const encryptedContent = await nip04Encrypt(request, secret, walletPubkey)
      console.log('[NWC] Encrypted content length:', encryptedContent.length)

      // Create kind 23194 event (NWC request)
      const event = {
        pubkey: clientPubkey,
        created_at: now(),
        kind: 23194,
        tags: [['p', walletPubkey]],
        content: encryptedContent,
      }

      const eventId = calculateEventId(event)
      // NIP-01: signature is on the event ID bytes, not on the serialized event
      const sig = await signEventId(eventId, secret)

      const signedEvent = {
        id: eventId,
        ...event,
        sig,
      }

      console.log('[NWC] Sending', method, 'request...')
      console.log('[NWC] Event ID:', eventId.slice(0, 16) + '...')
      console.log('[NWC] Event pubkey:', clientPubkey.slice(0, 16) + '...')
      console.log('[NWC] Target wallet:', walletPubkey.slice(0, 16) + '...')
      ws.send(JSON.stringify(['EVENT', signedEvent]))
    }

    ws.onmessage = async (msg) => {
      const elapsed = Date.now() - startTime
      console.log('[NWC] Message received at', elapsed, 'ms:', msg.data.slice(0, 100))

      try {
        const data = JSON.parse(msg.data)
        console.log('[NWC] Message type:', data[0])

        if (data[0] === 'OK') {
          console.log('[NWC] Event acknowledged:', data[1]?.slice(0, 16), 'Success:', data[2])
          if (!data[2]) {
            console.error('[NWC] Event rejected:', data[3])
          }
        }

        if (data[0] === 'EOSE') {
          console.log('[NWC] End of stored events for sub:', data[1])
        }

        if (data[0] === 'EVENT' && data[2]?.kind === 23195) {
          console.log('[NWC] Received response event!')
          const responseEvent = data[2]

          // Decrypt response
          const decrypted = await nip04Decrypt(
            responseEvent.content,
            secret,
            walletPubkey
          )

          const response = JSON.parse(decrypted)
          console.log('[NWC] Response type:', response.result_type)

          clearTimeout(timeout)
          if (subscriptionId) {
            ws.send(JSON.stringify(['CLOSE', subscriptionId]))
          }
          ws.close()

          if (response.error) {
            resolve({
              success: false,
              error: response.error.message || response.error.code || 'NWC error',
            })
          } else {
            resolve({
              success: true,
              result: response.result,
            })
          }
        }
      } catch (e) {
        console.error('[NWC] Message parse error:', e)
      }
    }

    ws.onerror = (err: Event) => {
      const elapsed = Date.now() - startTime
      console.error('[NWC] WebSocket error after', elapsed, 'ms')
      console.error('[NWC] Error type:', err.type)
      console.error('[NWC] ReadyState:', ws.readyState)
      clearTimeout(timeout)
      resolve({ success: false, error: `WebSocket error after ${elapsed}ms` })
    }

    ws.onclose = (event: CloseEvent) => {
      const elapsed = Date.now() - startTime
      console.log('[NWC] Connection closed after', elapsed, 'ms. Code:', event.code, 'Reason:', event.reason)
    }
  })
}

/**
 * Pay invoice using NWC
 */
async function payInvoiceViaNWC(
  nwcUrl: string,
  invoice: string
): Promise<{ success: boolean; preimage?: string; error?: string }> {
  const result = await sendNWCRequest(nwcUrl, 'pay_invoice', { invoice })

  if (result.success && result.result) {
    const r = result.result as { preimage?: string }
    return { success: true, preimage: r.preimage }
  }

  return { success: false, error: result.error }
}

/**
 * Create invoice using NWC (make_invoice)
 */
async function createInvoiceViaNWC(
  nwcUrl: string,
  amountSats: number,
  description: string
): Promise<{ success: boolean; invoice?: string; payment_hash?: string; error?: string }> {
  const result = await sendNWCRequest(nwcUrl, 'make_invoice', {
    amount: amountSats * 1000, // NWC uses millisats
    description,
  })

  console.log('[NWC Invoice] Raw result:', JSON.stringify(result))

  if (result.success && result.result) {
    // Try multiple possible field names for the invoice (Coinos compatibility)
    const r = result.result as Record<string, unknown>
    const invoice = r.invoice || r.bolt11 || r.pr || r.payment_request
    const paymentHash = r.payment_hash || r.hash || r.paymentHash

    console.log('[NWC Invoice] Parsed invoice:', invoice ? String(invoice).slice(0, 40) + '...' : 'none')
    console.log('[NWC Invoice] Parsed payment_hash:', paymentHash || 'none')

    return {
      success: true,
      invoice: invoice as string | undefined,
      payment_hash: paymentHash as string | undefined,
    }
  }

  return { success: false, error: result.error }
}

/**
 * Lookup invoice using NWC
 */
async function lookupInvoiceViaNWC(
  nwcUrl: string,
  paymentHash: string
): Promise<{ success: boolean; settled?: boolean; settled_at?: number; amount?: number; error?: string }> {
  const result = await sendNWCRequest(nwcUrl, 'lookup_invoice', {
    payment_hash: paymentHash,
  })

  if (result.success && result.result) {
    const r = result.result as { settled_at?: number; amount?: number }
    const settled = !!r.settled_at && r.settled_at > 0
    return { success: true, settled, settled_at: r.settled_at, amount: r.amount }
  }

  return { success: false, error: result.error }
}

/**
 * Get balance using NWC
 */
async function getBalanceViaNWC(
  nwcUrl: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  const result = await sendNWCRequest(nwcUrl, 'get_balance', {})

  console.log('[NWC Balance] Raw result:', JSON.stringify(result))

  if (result.success && result.result) {
    // Try multiple possible field names for balance (Coinos compatibility)
    const r = result.result as Record<string, unknown>
    const balance = r.balance ?? r.balance_msat ?? r.balance_sats ?? r.available ?? r.total

    console.log('[NWC Balance] Parsed balance:', balance)
    return { success: true, balance: balance as number | undefined }
  }

  return { success: false, error: result.error }
}

// ============================================
// Request/Response Types
// ============================================

type Operation =
  | 'claim_reward'              // Rate-limited reward claims
  | 'pay_invoice'               // Pay any invoice
  | 'create_invoice'            // Create invoice for receiving
  | 'lookup_invoice'            // Check if invoice is paid
  | 'get_balance'               // Get wallet balance
  | 'diagnose'                  // Test NWC connection (for debugging)
  | 'register_donation'         // Register pending donation for auto-forwarding
  | 'record_charity_payment'    // Record charity payment for audit trail
  | 'log_charity_payment_failure'  // Log failed charity payment with details

interface RequestBody {
  operation: Operation

  // For claim_reward
  lightning_address?: string
  reward_type?: 'workout' | 'steps'
  amount_sats?: number
  is_charity_donation?: boolean // Skip rate-limiting for charity donations
  npub?: string // For push notifications after successful payment
  team_name?: string // For enriched push notification content (from trigger_auto_reward)

  // For PPQ.AI team rewards (pay directly to PPQ bolt11 instead of Lightning address)
  ppq_bolt11?: string

  // For pay_invoice
  invoice?: string

  // For create_invoice
  // amount_sats (reused)
  description?: string

  // For lookup_invoice and record_charity_payment
  payment_hash?: string

  // For register_donation
  charity_id?: string
  charity_lightning_address?: string

  // For record_charity_payment and log_charity_payment_failure
  user_pubkey?: string
  charity_name?: string
  donation_percentage?: number
  preimage?: string
  error_message?: string
  lnurl_response?: Record<string, unknown>

  // For pending payment retry system
  mark_as_pending?: boolean
  next_retry_at?: string
  is_batch_charity?: boolean
  batch_min_amount?: number
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()

    // Default to claim_reward for backward compatibility
    const operation = body.operation || 'claim_reward'

    // Get NWC URL (required for all operations)
    const nwcUrl = Deno.env.get('REWARD_NWC_URL')
    if (!nwcUrl) {
      console.error('[NWC Gateway] REWARD_NWC_URL not configured')
      return new Response(
        JSON.stringify({ success: false, reason: 'service_unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: pay_invoice
    // ========================================
    if (operation === 'pay_invoice') {
      const { invoice } = body

      if (!invoice) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_invoice' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[NWC Gateway] Paying invoice...')
      const result = await payInvoiceViaNWC(nwcUrl, invoice)

      return new Response(
        JSON.stringify({
          success: result.success,
          preimage: result.preimage,
          error: result.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: create_invoice
    // ========================================
    if (operation === 'create_invoice') {
      const { amount_sats, description } = body

      if (!amount_sats || amount_sats <= 0) {
        return new Response(
          JSON.stringify({ success: false, reason: 'invalid_amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[NWC Gateway] Creating invoice for', amount_sats, 'sats')
      const result = await createInvoiceViaNWC(
        nwcUrl,
        amount_sats,
        description || 'RUNSTR Payment'
      )

      return new Response(
        JSON.stringify({
          success: result.success,
          invoice: result.invoice,
          payment_hash: result.payment_hash,
          error: result.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: lookup_invoice
    // ========================================
    if (operation === 'lookup_invoice') {
      const { payment_hash } = body

      if (!payment_hash) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_payment_hash' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[NWC Gateway] Looking up invoice:', payment_hash.slice(0, 16) + '...')
      const result = await lookupInvoiceViaNWC(nwcUrl, payment_hash)

      return new Response(
        JSON.stringify({
          success: result.success,
          settled: result.settled,
          settled_at: result.settled_at,
          amount: result.amount,
          error: result.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: get_balance
    // ========================================
    if (operation === 'get_balance') {
      console.log('[NWC Gateway] Getting balance...')
      const result = await getBalanceViaNWC(nwcUrl)

      // Include balance even if 0 or undefined
      const response = {
        success: result.success,
        balance: result.balance ?? null,
        balance_sats: result.balance !== undefined ? Math.floor(result.balance / 1000) : null,
        error: result.error,
      }
      console.log('[NWC Gateway] Balance response:', JSON.stringify(response))

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================
    // Operation: diagnose (test connection and NWC protocol)
    // ========================================
    if (operation === 'diagnose') {
      console.log('[NWC Gateway] Running diagnostics...')
      const diagnostics: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
      }

      try {
        // Test 1: Parse the NWC URL
        const { walletPubkey, relay, secret } = parseNWCUrl(nwcUrl)
        diagnostics.urlParsed = true
        diagnostics.relay = relay
        diagnostics.walletPubkey = walletPubkey.slice(0, 16) + '...'
        diagnostics.secretLength = secret.length

        // Test 2: Derive public key
        const clientPubkey = getPublicKey(secret)
        diagnostics.clientPubkey = clientPubkey.slice(0, 16) + '...'
        diagnostics.pubkeyDerived = true

        // Test 3: Full NWC protocol test with message logging
        const nwcTestResult = await new Promise<{
          connected: boolean
          messages: string[]
          eventAccepted?: boolean
          responseReceived?: boolean
          error?: string
          time?: number
        }>((resolve) => {
          const startTime = Date.now()
          const messages: string[] = []
          let eventAccepted = false
          let responseReceived = false

          console.log('[Diagnose] Testing full NWC protocol to:', relay)
          const testWs = new WebSocket(relay)

          const wsTimeout = setTimeout(() => {
            testWs.close()
            resolve({
              connected: true,
              messages,
              eventAccepted,
              responseReceived,
              error: 'Timeout waiting for response',
              time: Date.now() - startTime,
            })
          }, 15000)

          testWs.onopen = async () => {
            const elapsed = Date.now() - startTime
            messages.push(`Connected in ${elapsed}ms`)

            // Subscribe to responses
            const subId = generateEventId().slice(0, 16)
            testWs.send(JSON.stringify(['REQ', subId, { kinds: [23195], '#p': [clientPubkey], since: now() - 60 }]))
            messages.push('Subscription sent')

            // Create and send a simple get_info request
            const request = JSON.stringify({ method: 'get_info', params: {} })
            const encryptedContent = await nip04Encrypt(request, secret, walletPubkey)

            const event = {
              pubkey: clientPubkey,
              created_at: now(),
              kind: 23194,
              tags: [['p', walletPubkey]],
              content: encryptedContent,
            }

            const eventId = calculateEventId(event)
            const sig = await signEventId(eventId, secret)

            const signedEvent = { id: eventId, ...event, sig }
            testWs.send(JSON.stringify(['EVENT', signedEvent]))
            messages.push(`Event sent: ${eventId.slice(0, 16)}...`)
          }

          testWs.onmessage = async (msg) => {
            try {
              const data = JSON.parse(msg.data)
              messages.push(`${data[0]}: ${JSON.stringify(data).slice(0, 80)}...`)

              if (data[0] === 'OK') {
                eventAccepted = data[2] === true
                if (!eventAccepted) {
                  messages.push(`Event rejected: ${data[3]}`)
                }
              }

              if (data[0] === 'EVENT' && data[2]?.kind === 23195) {
                responseReceived = true
                clearTimeout(wsTimeout)
                testWs.close()
                resolve({
                  connected: true,
                  messages,
                  eventAccepted,
                  responseReceived,
                  time: Date.now() - startTime,
                })
              }
            } catch (e) {
              messages.push(`Parse error: ${e}`)
            }
          }

          testWs.onerror = () => {
            clearTimeout(wsTimeout)
            resolve({ connected: false, messages, error: 'WebSocket error', time: Date.now() - startTime })
          }
        })

        diagnostics.nwcTest = nwcTestResult

        return new Response(
          JSON.stringify({
            success: nwcTestResult.responseReceived || false,
            diagnostics,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        diagnostics.error = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
          JSON.stringify({
            success: false,
            diagnostics,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ========================================
    // Operation: register_donation
    // ========================================
    if (operation === 'register_donation') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { payment_hash, charity_id, charity_lightning_address, amount_sats, description } = body

      // Validate required fields
      if (!payment_hash || !charity_id || !charity_lightning_address || !amount_sats) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[NWC Gateway] Registering donation:', {
        payment_hash: payment_hash.slice(0, 16) + '...',
        charity_id,
        amount_sats,
      })

      try {
        // Insert pending donation record
        const { data, error } = await supabase
          .from('pending_donations')
          .insert({
            payment_hash,
            charity_id,
            charity_lightning_address,
            amount_sats,
            description: description || `Donation to ${charity_id}`,
            status: 'pending',
          })
          .select()
          .single()

        if (error) {
          // Handle duplicate payment_hash (already registered)
          if (error.code === '23505') {
            console.log('[NWC Gateway] Donation already registered:', payment_hash.slice(0, 16))
            return new Response(
              JSON.stringify({ success: true, reason: 'already_registered' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          throw error
        }

        console.log('[NWC Gateway] Donation registered successfully:', data.id)
        return new Response(
          JSON.stringify({
            success: true,
            donation_id: data.id,
            payment_hash,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('[NWC Gateway] Error registering donation:', error)
        return new Response(
          JSON.stringify({
            success: false,
            reason: error instanceof Error ? error.message : 'registration_error',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ========================================
    // Operation: record_charity_payment (audit trail)
    // ========================================
    if (operation === 'record_charity_payment') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const {
        user_pubkey,
        charity_id,
        charity_name,
        charity_lightning_address,
        amount_sats,
        reward_type,
        donation_percentage,
        payment_hash,
        preimage,
      } = body

      // Validate required fields
      if (!user_pubkey || !charity_id || !charity_name || !charity_lightning_address || !amount_sats || !reward_type) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate donation percentage if provided
      if (donation_percentage !== undefined && (donation_percentage < 0 || donation_percentage > 100)) {
        return new Response(
          JSON.stringify({ success: false, reason: 'invalid_donation_percentage' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[NWC Gateway] Recording charity payment:', {
        charity_id,
        amount_sats,
        reward_type,
        has_preimage: !!preimage,
      })

      try {
        const { data, error } = await supabase
          .from('charity_reward_payments')
          .insert({
            user_pubkey,
            charity_id,
            charity_name,
            charity_lightning_address,
            amount_sats,
            reward_type,
            donation_percentage: donation_percentage ?? 100,
            payment_hash: payment_hash || null,
            preimage: preimage || null,
            status: preimage ? 'success' : 'pending',
            paid_at: preimage ? new Date().toISOString() : null,
          })
          .select()
          .single()

        if (error) {
          console.error('[NWC Gateway] Error recording charity payment:', error)
          return new Response(
            JSON.stringify({
              success: false,
              reason: error.message || 'insert_error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('[NWC Gateway] Charity payment recorded:', data.id)
        return new Response(
          JSON.stringify({
            success: true,
            payment_id: data.id,
            status: data.status,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('[NWC Gateway] Exception recording charity payment:', error)
        return new Response(
          JSON.stringify({
            success: false,
            reason: error instanceof Error ? error.message : 'unexpected_error',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ========================================
    // Operation: log_charity_payment_failure
    // Records a failed charity payment with detailed error information
    // Supports 'pending' status for retry-eligible or batch-payment charities
    // ========================================
    if (operation === 'log_charity_payment_failure') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const {
        user_pubkey,
        charity_id,
        charity_name,
        charity_lightning_address,
        amount_sats,
        reward_type,
        error_message,
        lnurl_response,
        // Retry system fields
        mark_as_pending,
        next_retry_at,
        is_batch_charity,
        batch_min_amount,
      } = body

      // Validate required fields
      if (!user_pubkey || !charity_id || !charity_name || !charity_lightning_address || !amount_sats || !reward_type) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Determine status: 'pending' for retry-eligible/batch charities, 'failed' otherwise
      const status = mark_as_pending ? 'pending' : 'failed'

      console.log('[NWC Gateway] Logging charity payment failure:', {
        charity_id,
        charity_lightning_address,
        amount_sats,
        status,
        is_batch_charity,
        next_retry_at,
        error_message: error_message?.slice(0, 100),
      })

      try {
        const { data, error } = await supabase
          .from('charity_reward_payments')
          .insert({
            user_pubkey,
            charity_id,
            charity_name,
            charity_lightning_address,
            amount_sats,
            reward_type,
            donation_percentage: 100, // Failures are typically 100% charity donations
            payment_hash: null,
            preimage: null,
            status,
            error_message: error_message || 'Unknown error',
            lnurl_response: lnurl_response || null,
            paid_at: null,
            // Retry fields
            retry_count: 0,
            next_retry_at: next_retry_at || null,
          })
          .select()
          .single()

        if (error) {
          console.error('[NWC Gateway] Error logging charity payment failure:', error)
          return new Response(
            JSON.stringify({
              success: false,
              reason: error.message || 'insert_error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const statusMsg = mark_as_pending
          ? `pending (retry at ${next_retry_at || 'next batch'})`
          : 'failed (no retry)'
        console.log(`[NWC Gateway] Charity payment logged as ${statusMsg}:`, data.id)

        return new Response(
          JSON.stringify({
            success: true,
            failure_id: data.id,
            status,
            will_retry: mark_as_pending || false,
            is_batch_charity: is_batch_charity || false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('[NWC Gateway] Exception logging charity payment failure:', error)
        return new Response(
          JSON.stringify({
            success: false,
            reason: error instanceof Error ? error.message : 'unexpected_error',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ========================================
    // Operation: claim_reward (default, rate-limited)
    // ========================================
    if (operation === 'claim_reward') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const sponsorName = await getActiveSponsorName(supabase)

      const { lightning_address, reward_type, amount_sats, is_charity_donation, ppq_bolt11, npub, team_name } = body

      // Validate required fields (ppq_bolt11 can substitute for lightning_address)
      if ((!lightning_address && !ppq_bolt11) || !reward_type) {
        return new Response(
          JSON.stringify({ success: false, reason: 'missing_fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate reward type
      if (reward_type !== 'workout' && reward_type !== 'steps') {
        return new Response(
          JSON.stringify({ success: false, reason: 'invalid_reward_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash the Lightning address for privacy (lowercase, trimmed)
      // For PPQ.AI team, use a special prefix + bolt11 hash for tracking
      const normalizedAddress = ppq_bolt11
        ? `ppq:${ppq_bolt11.slice(0, 50)}`  // PPQ bolt11 hash for tracking
        : lightning_address!.toLowerCase().trim()
      const hashBytes = sha256(new TextEncoder().encode(normalizedAddress))
      const addressHash = bytesToHex(hashBytes)

      console.log('[claim-reward] Processing claim:', {
        type: reward_type,
        addressHash: addressHash.slice(0, 16) + '...',
      })

      // Get today's date (UTC)
      const today = new Date().toISOString().split('T')[0]

      // Check existing claim for this address today
      const { data: existingClaim, error: lookupError } = await supabase
        .from('daily_reward_claims')
        .select('*')
        .eq('lightning_address_hash', addressHash)
        .eq('reward_date', today)
        .single()

      if (lookupError && lookupError.code !== 'PGRST116') {
        // PGRST116 = not found (expected for new claims)
        console.error('[claim-reward] Lookup error:', lookupError)
        throw lookupError
      }

      // Handle based on reward type
      if (reward_type === 'workout') {
        // Check if workout already claimed (SKIP for charity donations - they don't rate-limit)
        if (existingClaim?.workout_claimed && !is_charity_donation) {
          console.log('[claim-reward] Workout already claimed today')
          return new Response(
            JSON.stringify({ success: false, reason: 'already_claimed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (is_charity_donation) {
          console.log('[claim-reward] Charity donation - skipping rate limit check')
        }

        // Determine reward amount: use requested amount if valid, otherwise default
        // trigger_auto_reward() calculates streak bonus and passes amount_sats
        const MIN_WORKOUT_SATS = 21
        const MAX_WORKOUT_SATS = 1000
        let rewardAmount = amount_sats || WORKOUT_REWARD_SATS
        if (rewardAmount < MIN_WORKOUT_SATS || rewardAmount > MAX_WORKOUT_SATS) {
          rewardAmount = WORKOUT_REWARD_SATS // Fall back to default if invalid
        }
        console.log(`[claim-reward] Workout reward amount: ${rewardAmount} sats`)

        try {
          // Get or use invoice:
          // - PPQ.AI team: Use the pre-created PPQ bolt11 invoice directly
          // - Regular team: Create invoice from user's Lightning address
          let invoice: string
          let isPPQPayment = false

          if (ppq_bolt11) {
            // PPQ.AI team: Pay directly to the PPQ bolt11 invoice
            console.log('[claim-reward] PPQ.AI team - using provided bolt11 invoice')
            invoice = ppq_bolt11
            isPPQPayment = true
          } else {
            // Regular: Get invoice from user's Lightning address
            invoice = await getInvoiceFromLightningAddress(
              lightning_address!,
              rewardAmount,
              'Daily workout reward from RUNSTR!'
            )
          }

          // Pay the invoice via NWC
          const paymentResult = await payInvoiceViaNWC(nwcUrl, invoice)

          if (!paymentResult.success) {
            console.error('[claim-reward] Payment failed:', paymentResult.error)
            return new Response(
              JSON.stringify({ success: false, reason: 'payment_failed' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Record the claim with payment verification (SKIP for charity donations - don't rate-limit charities)
          if (!is_charity_donation) {
            if (existingClaim) {
              await supabase
                .from('daily_reward_claims')
                .update({
                  workout_claimed: true,
                  workout_preimage: paymentResult.preimage || null, // Payment proof
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingClaim.id)
            } else {
              await supabase.from('daily_reward_claims').insert({
                lightning_address_hash: addressHash,
                reward_date: today,
                workout_claimed: true,
                workout_preimage: paymentResult.preimage || null, // Payment proof
                step_sats_claimed: 0,
              })
            }
          }

          const paymentType = isPPQPayment ? 'PPQ.AI credits' : 'Lightning'
          console.log(`[claim-reward] Workout reward paid to ${paymentType}:`, rewardAmount, 'sats', paymentResult.preimage ? '(verified)' : '(no preimage)')

          // Fire-and-forget push notification
          if (npub) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            if (supabaseUrl) {
              const notificationBody = team_name
                ? `You earned ${rewardAmount} sats from ${sponsorName} for ${team_name}`
                : `You earned ${rewardAmount} sats from ${sponsorName} for your workout`
              console.log(`[claim-reward] Sending push notification to ${npub.slice(0, 12)}...`)
              fetch(`${supabaseUrl}/functions/v1/notify-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  npub,
                  title: `Reward from ${sponsorName}!`,
                  body: notificationBody,
                  data: { type: 'reward_earned', sats: rewardAmount, screen: 'Rewards' },
                  channelId: 'bitcoin_rewards',
                }),
              }).then(async (res) => {
                const result = await res.json().catch(() => ({}))
                if (!result.sent) {
                  console.warn(`[claim-reward] Push notification not sent: ${result.error || res.status}`)
                } else {
                  console.log(`[claim-reward] Push notification sent to ${result.devices} device(s)`)
                }
              }).catch((err) => {
                console.error('[claim-reward] Push notification fetch failed:', err.message || err)
              })
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              amount_paid: rewardAmount,
              preimage: paymentResult.preimage, // Return preimage for client-side verification
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (payError) {
          console.error('[claim-reward] Payment error:', payError)
          return new Response(
            JSON.stringify({ success: false, reason: 'payment_error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else if (reward_type === 'steps') {
        // Calculate remaining step allowance
        const currentStepSats = existingClaim?.step_sats_claimed || 0
        const remainingAllowance = MAX_DAILY_STEP_SATS - currentStepSats

        if (remainingAllowance <= 0) {
          console.log('[claim-reward] Step cap reached')
          return new Response(
            JSON.stringify({
              success: false,
              reason: 'daily_cap_reached',
              remaining_step_allowance: 0,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate actual amount to pay
        const requestedAmount = amount_sats || STEP_SATS_PER_MILESTONE
        const amountToPay = Math.min(requestedAmount, remainingAllowance)

        try {
          // Get invoice and pay
          const invoice = await getInvoiceFromLightningAddress(
            lightning_address,
            amountToPay,
            'Step reward from RUNSTR!'
          )

          const paymentResult = await payInvoiceViaNWC(nwcUrl, invoice)

          if (!paymentResult.success) {
            console.error('[claim-reward] Step payment failed:', paymentResult.error)
            return new Response(
              JSON.stringify({
                success: false,
                reason: 'payment_failed',
                remaining_step_allowance: remainingAllowance,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Update step sats claimed with payment verification
          const newStepSats = currentStepSats + amountToPay
          const newRemaining = MAX_DAILY_STEP_SATS - newStepSats

          if (existingClaim) {
            await supabase
              .from('daily_reward_claims')
              .update({
                step_sats_claimed: newStepSats,
                step_preimage: paymentResult.preimage || null, // Payment proof
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingClaim.id)
          } else {
            await supabase.from('daily_reward_claims').insert({
              lightning_address_hash: addressHash,
              reward_date: today,
              workout_claimed: false,
              step_sats_claimed: amountToPay,
              step_preimage: paymentResult.preimage || null, // Payment proof
            })
          }

          console.log('[claim-reward] Step reward paid:', amountToPay, 'sats', paymentResult.preimage ? '(verified)' : '(no preimage)')

          // Fire-and-forget push notification
          if (npub) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            if (supabaseUrl) {
              console.log(`[claim-reward] Sending step reward push to ${npub.slice(0, 12)}...`)
              fetch(`${supabaseUrl}/functions/v1/notify-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  npub,
                  title: `Steps Rewarded by ${sponsorName}!`,
                  body: `You earned ${amountToPay} sats from ${sponsorName} for your steps today`,
                  data: { type: 'step_reward_earned', sats: amountToPay },
                  channelId: 'bitcoin_rewards',
                }),
              }).then(async (res) => {
                const result = await res.json().catch(() => ({}))
                if (!result.sent) {
                  console.warn(`[claim-reward] Step push not sent: ${result.error || res.status}`)
                } else {
                  console.log(`[claim-reward] Step push sent to ${result.devices} device(s)`)
                }
              }).catch((err) => {
                console.error('[claim-reward] Step push fetch failed:', err.message || err)
              })
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              amount_paid: amountToPay,
              remaining_step_allowance: newRemaining,
              preimage: paymentResult.preimage, // Return preimage for client-side verification
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (payError) {
          console.error('[claim-reward] Step payment error:', payError)
          return new Response(
            JSON.stringify({
              success: false,
              reason: 'payment_error',
              remaining_step_allowance: remainingAllowance,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Unknown operation
    return new Response(
      JSON.stringify({ success: false, reason: 'unknown_operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[NWC Gateway] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        reason: error instanceof Error ? error.message : 'internal_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
