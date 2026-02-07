/**
 * Supabase Edge Function: retry-pending-payments
 *
 * Cron job that retries failed charity payments:
 * 1. Processes individual pending payments due for retry
 * 2. Processes batch payments for charities with minimum amount requirements
 * 3. Uses exponential backoff for retry scheduling
 *
 * Run via Supabase cron: every hour
 *
 * Problem Charities:
 * - human-rights-foundation: BTCPay routing issues (retry individually)
 * - bitcoin-bay: Custom domain issues (retry individually)
 * - bitcoin-yucatan: 1000 sat minimum on Geyser.fund (batch until >= 1000)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as secp from 'https://esm.sh/@noble/secp256k1@1.7.1'
import { bytesToHex } from 'https://esm.sh/@noble/hashes@1.3.2/utils'
import { sha256 } from 'https://esm.sh/@noble/hashes@1.3.2/sha256'

// Constants
const NWC_TIMEOUT_MS = 30000
const MAX_RETRIES = 5
const BATCH_SIZE = 10

// Charities with minimum payment requirements (must batch)
const BATCH_PAYMENT_CHARITIES: Record<string, { minAmount: number }> = {
  'bitcoin-yucatan': { minAmount: 1000 },
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

async function fetchLNURLPayDetails(lightningAddress: string): Promise<LNURLPayDetails> {
  const [name, domain] = lightningAddress.split('@')
  if (!name || !domain) throw new Error('Invalid Lightning address format')

  const lnurlUrl = `https://${domain}/.well-known/lnurlp/${name}`
  const response = await fetch(lnurlUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`LNURL fetch failed: ${response.status}`)

  const data = await response.json()
  if (data.status === 'ERROR') throw new Error(data.reason || 'LNURL error')
  return data as LNURLPayDetails
}

async function requestInvoice(callbackUrl: string, amountSats: number, comment?: string): Promise<string> {
  const url = new URL(callbackUrl)
  url.searchParams.set('amount', (amountSats * 1000).toString())
  if (comment) {
    url.searchParams.set('comment', comment)
  }

  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Invoice request failed: ${response.status}`)

  const data = await response.json()
  if (data.status === 'ERROR') throw new Error(data.reason || 'Invoice request error')
  if (!data.pr) throw new Error('No invoice returned')
  return data.pr
}

async function getInvoiceFromLightningAddress(
  lightningAddress: string,
  amountSats: number,
  comment?: string
): Promise<string> {
  const details = await fetchLNURLPayDetails(lightningAddress)
  const amountMillisats = amountSats * 1000

  if (amountMillisats < details.minSendable) {
    throw new Error(`Amount too small. Min: ${details.minSendable / 1000} sats`)
  }
  if (amountMillisats > details.maxSendable) {
    throw new Error(`Amount too large. Max: ${details.maxSendable / 1000} sats`)
  }

  return requestInvoice(details.callback, amountSats, comment)
}

// ============================================
// NWC Implementation
// ============================================

function parseNWCUrl(nwcUrl: string): { walletPubkey: string; relay: string; secret: string } {
  const urlStr = nwcUrl.replace('nostr+walletconnect://', 'https://')
  const url = new URL(urlStr)
  const walletPubkey = url.hostname || url.pathname.replace('//', '')
  const relay = url.searchParams.get('relay')
  const secret = url.searchParams.get('secret')

  if (!walletPubkey || !relay || !secret) {
    throw new Error('Invalid NWC URL: missing required parameters')
  }
  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    throw new Error('Invalid NWC secret format')
  }

  return { walletPubkey, relay, secret }
}

function generateEventId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

function now(): number {
  return Math.floor(Date.now() / 1000)
}

function serializeEvent(event: {
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
}): string {
  return JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content])
}

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

async function signEventId(eventIdHex: string, privateKeyHex: string): Promise<string> {
  const sig = await secp.schnorr.sign(eventIdHex, privateKeyHex)
  return bytesToHex(sig)
}

function getPublicKey(privateKeyHex: string): string {
  const pubkeyBytes = secp.schnorr.getPublicKey(privateKeyHex)
  return bytesToHex(pubkeyBytes)
}

async function nip04Encrypt(
  plaintext: string,
  privateKeyHex: string,
  recipientPubkey: string
): Promise<string> {
  const sharedPoint = secp.getSharedSecret(privateKeyHex, '02' + recipientPubkey)
  const sharedX = sharedPoint.slice(1, 33)
  const iv = new Uint8Array(16)
  crypto.getRandomValues(iv)

  const key = await crypto.subtle.importKey('raw', sharedX, { name: 'AES-CBC' }, false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    new TextEncoder().encode(plaintext)
  )

  const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  const ivB64 = btoa(String.fromCharCode(...iv))
  return `${ciphertextB64}?iv=${ivB64}`
}

async function nip04Decrypt(
  ciphertext: string,
  privateKeyHex: string,
  senderPubkey: string
): Promise<string> {
  const [encryptedB64, ivPart] = ciphertext.split('?iv=')
  if (!ivPart) throw new Error('Invalid NIP-04 format: missing IV')

  const sharedPoint = secp.getSharedSecret(privateKeyHex, '02' + senderPubkey)
  const sharedX = sharedPoint.slice(1, 33)
  const encrypted = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))
  const iv = Uint8Array.from(atob(ivPart), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey('raw', sharedX, { name: 'AES-CBC' }, false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

async function sendNWCRequest(
  nwcUrl: string,
  method: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const { walletPubkey, relay, secret } = parseNWCUrl(nwcUrl)
  const clientPubkey = getPublicKey(secret)

  return new Promise((resolve) => {
    const ws = new WebSocket(relay)
    const timeout = setTimeout(() => {
      ws.close()
      resolve({ success: false, error: 'NWC timeout' })
    }, NWC_TIMEOUT_MS)

    ws.onopen = async () => {
      const subscriptionId = generateEventId().slice(0, 16)
      ws.send(
        JSON.stringify([
          'REQ',
          subscriptionId,
          { kinds: [23195], '#p': [clientPubkey], since: now() - 60 },
        ])
      )

      const request = JSON.stringify({ method, params })
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
      ws.send(JSON.stringify(['EVENT', { id: eventId, ...event, sig }]))
    }

    ws.onmessage = async (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data[0] === 'EVENT' && data[2]?.kind === 23195) {
          const decrypted = await nip04Decrypt(data[2].content, secret, walletPubkey)
          const response = JSON.parse(decrypted)

          clearTimeout(timeout)
          ws.close()

          if (response.error) {
            resolve({
              success: false,
              error: response.error.message || response.error.code || 'NWC error',
            })
          } else {
            resolve({ success: true, result: response.result })
          }
        }
      } catch {
        // Ignore parse errors for non-response messages
      }
    }

    ws.onerror = () => {
      clearTimeout(timeout)
      resolve({ success: false, error: 'WebSocket error' })
    }
  })
}

async function payInvoice(
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

// ============================================
// Retry Logic
// ============================================

/**
 * Calculate exponential backoff for next retry
 * Base: 1 hour, Max: 24 hours, Multiplier: 2
 */
function calculateNextRetryTime(retryCount: number): string {
  const baseDelayMinutes = 60 // 1 hour
  const maxDelayMinutes = 1440 // 24 hours
  const multiplier = 2

  const delayMinutes = Math.min(
    baseDelayMinutes * Math.pow(multiplier, retryCount),
    maxDelayMinutes
  )

  const nextRetry = new Date()
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes)
  return nextRetry.toISOString()
}

interface PendingPayment {
  id: string
  user_pubkey: string
  charity_id: string
  charity_name: string
  charity_lightning_address: string
  amount_sats: number
  reward_type: string
  retry_count: number
  error_message: string | null
}

interface BatchCharityPayment {
  charity_id: string
  charity_name: string
  charity_lightning_address: string
  total_sats: number
  payment_ids: string[]
}

/**
 * Process individual pending payments that are due for retry
 */
async function processIndividualRetries(
  supabase: ReturnType<typeof createClient>,
  nwcUrl: string
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const stats = { processed: 0, succeeded: 0, failed: 0 }

  // Fetch pending payments due for retry (excluding batch charities)
  const batchCharityIds = Object.keys(BATCH_PAYMENT_CHARITIES)

  // Build the query
  let query = supabase
    .from('charity_reward_payments')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', MAX_RETRIES)
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  // Exclude batch payment charities from individual retries
  if (batchCharityIds.length > 0) {
    for (const charityId of batchCharityIds) {
      query = query.neq('charity_id', charityId)
    }
  }

  const { data: pendingPayments, error: fetchError } = await query

  if (fetchError) {
    console.error('[retry-pending] Error fetching pending payments:', fetchError)
    return stats
  }

  console.log(`[retry-pending] Found ${pendingPayments?.length || 0} individual payments to retry`)

  for (const payment of (pendingPayments || []) as PendingPayment[]) {
    stats.processed++
    console.log('[retry-pending] Retrying:', {
      id: payment.id.slice(0, 8),
      charity: payment.charity_id,
      amount: payment.amount_sats,
      retry: payment.retry_count + 1,
    })

    try {
      // Get invoice from charity's Lightning address
      const invoice = await getInvoiceFromLightningAddress(
        payment.charity_lightning_address,
        payment.amount_sats,
        `RUNSTR ${payment.reward_type} reward retry`
      )

      // Pay the invoice
      const payResult = await payInvoice(nwcUrl, invoice)

      if (payResult.success) {
        console.log('[retry-pending] SUCCESS:', payment.charity_id, payment.amount_sats, 'sats')

        // Mark as successful
        await supabase
          .from('charity_reward_payments')
          .update({
            status: 'success',
            preimage: payResult.preimage,
            paid_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', payment.id)

        stats.succeeded++
      } else {
        const newRetryCount = payment.retry_count + 1
        const shouldGiveUp = newRetryCount >= MAX_RETRIES

        console.log('[retry-pending] FAILED:', {
          charity: payment.charity_id,
          error: payResult.error,
          retryCount: newRetryCount,
          giveUp: shouldGiveUp,
        })

        // Update with new retry info
        await supabase
          .from('charity_reward_payments')
          .update({
            status: shouldGiveUp ? 'failed' : 'pending',
            retry_count: newRetryCount,
            next_retry_at: shouldGiveUp ? null : calculateNextRetryTime(newRetryCount),
            error_message: payResult.error || 'Payment failed',
          })
          .eq('id', payment.id)

        stats.failed++
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const newRetryCount = payment.retry_count + 1
      const shouldGiveUp = newRetryCount >= MAX_RETRIES

      console.error('[retry-pending] Error:', errorMessage)

      await supabase
        .from('charity_reward_payments')
        .update({
          status: shouldGiveUp ? 'failed' : 'pending',
          retry_count: newRetryCount,
          next_retry_at: shouldGiveUp ? null : calculateNextRetryTime(newRetryCount),
          error_message: errorMessage,
        })
        .eq('id', payment.id)

      stats.failed++
    }
  }

  return stats
}

/**
 * Process batch payments for charities with minimum amount requirements
 * Aggregates pending payments and sends as single payment when threshold is met
 */
async function processBatchPayments(
  supabase: ReturnType<typeof createClient>,
  nwcUrl: string
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const stats = { processed: 0, succeeded: 0, failed: 0 }

  // Process each batch charity
  for (const [charityId, config] of Object.entries(BATCH_PAYMENT_CHARITIES)) {
    // Get all pending payments for this charity
    const { data: payments, error: fetchError } = await supabase
      .from('charity_reward_payments')
      .select('*')
      .eq('charity_id', charityId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error(`[retry-pending] Error fetching batch payments for ${charityId}:`, fetchError)
      continue
    }

    const pendingPayments = (payments || []) as PendingPayment[]
    const totalSats = pendingPayments.reduce((sum, p) => sum + p.amount_sats, 0)

    console.log(`[retry-pending] Batch check for ${charityId}:`, {
      pendingCount: pendingPayments.length,
      totalSats,
      minRequired: config.minAmount,
    })

    // Check if we have enough to send a batch
    if (totalSats < config.minAmount) {
      console.log(`[retry-pending] ${charityId}: Not enough accumulated (${totalSats}/${config.minAmount} sats)`)
      continue
    }

    stats.processed++

    // We have enough! Send batch payment
    const lightningAddress = pendingPayments[0]?.charity_lightning_address
    const charityName = pendingPayments[0]?.charity_name

    if (!lightningAddress) {
      console.error(`[retry-pending] No Lightning address found for ${charityId}`)
      continue
    }

    console.log(`[retry-pending] Sending batch payment: ${totalSats} sats to ${charityId}`)

    try {
      // Get invoice for the total amount
      const invoice = await getInvoiceFromLightningAddress(
        lightningAddress,
        totalSats,
        `RUNSTR batch rewards (${pendingPayments.length} workouts)`
      )

      // Pay the invoice
      const payResult = await payInvoice(nwcUrl, invoice)

      if (payResult.success) {
        console.log(`[retry-pending] Batch SUCCESS: ${totalSats} sats to ${charityId}`)

        // Mark all individual payments as successful
        const paymentIds = pendingPayments.map(p => p.id)
        for (const paymentId of paymentIds) {
          await supabase
            .from('charity_reward_payments')
            .update({
              status: 'success',
              preimage: payResult.preimage,
              paid_at: new Date().toISOString(),
              error_message: `Batch payment: ${totalSats} sats total`,
            })
            .eq('id', paymentId)
        }

        stats.succeeded++
      } else {
        console.error(`[retry-pending] Batch FAILED: ${payResult.error}`)

        // Update all payments with new retry info
        for (const payment of pendingPayments) {
          const newRetryCount = payment.retry_count + 1
          const shouldGiveUp = newRetryCount >= MAX_RETRIES

          await supabase
            .from('charity_reward_payments')
            .update({
              status: shouldGiveUp ? 'failed' : 'pending',
              retry_count: newRetryCount,
              next_retry_at: shouldGiveUp ? null : calculateNextRetryTime(newRetryCount),
              error_message: `Batch payment failed: ${payResult.error}`,
            })
            .eq('id', payment.id)
        }

        stats.failed++
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[retry-pending] Batch error for ${charityId}:`, errorMessage)

      // Update all payments with error
      for (const payment of pendingPayments) {
        const newRetryCount = payment.retry_count + 1
        const shouldGiveUp = newRetryCount >= MAX_RETRIES

        await supabase
          .from('charity_reward_payments')
          .update({
            status: shouldGiveUp ? 'failed' : 'pending',
            retry_count: newRetryCount,
            next_retry_at: shouldGiveUp ? null : calculateNextRetryTime(newRetryCount),
            error_message: `Batch payment error: ${errorMessage}`,
          })
          .eq('id', payment.id)
      }

      stats.failed++
    }
  }

  return stats
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const nwcUrl = Deno.env.get('REWARD_NWC_URL')
    if (!nwcUrl) {
      return new Response(
        JSON.stringify({ success: false, reason: 'nwc_not_configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[retry-pending] Starting cron run...')

    // Process individual retries (HRF, Bitcoin Bay, etc.)
    const individualStats = await processIndividualRetries(supabase, nwcUrl)
    console.log('[retry-pending] Individual retries:', individualStats)

    // Process batch payments (Bitcoin Yucatan, etc.)
    const batchStats = await processBatchPayments(supabase, nwcUrl)
    console.log('[retry-pending] Batch payments:', batchStats)

    const totalStats = {
      individual: individualStats,
      batch: batchStats,
      total_processed: individualStats.processed + batchStats.processed,
      total_succeeded: individualStats.succeeded + batchStats.succeeded,
      total_failed: individualStats.failed + batchStats.failed,
    }

    console.log('[retry-pending] Cron complete:', totalStats)

    return new Response(JSON.stringify({ success: true, stats: totalStats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[retry-pending] Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        reason: error instanceof Error ? error.message : 'internal_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
