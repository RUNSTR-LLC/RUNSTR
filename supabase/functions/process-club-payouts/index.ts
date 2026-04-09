/**
 * Supabase Edge Function: process-club-payouts
 *
 * Called by pg_cron every 5 minutes. Finds ended club competitions
 * that haven't been paid out yet, and sends prizes from the club's
 * CoinOS wallet to winners' Lightning addresses.
 *
 * Algorithm:
 * 1. Find competitions WHERE club_id IS NOT NULL, end_date < NOW(),
 *    and no completed/in_progress payout log entry
 * 2. For each: check balance, calculate payouts, send to winners
 * 3. Log results in club_payout_log (prevents double-pays)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decode as b64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

// CoinOS API
const COINOS_API_BASE = 'https://coinos.io/api'
const COINOS_TIMEOUT = 15000
const MAX_RETRY_HOURS = 24

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// AES-256-GCM Decryption (same key as club-wallet)
// ============================================

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('CLUB_WALLET_ENCRYPTION_KEY')
  if (!keyB64) throw new Error('CLUB_WALLET_ENCRYPTION_KEY env var not set')
  const keyMaterial = new TextEncoder().encode(keyB64)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial)
  return crypto.subtle.importKey('raw', hashBuffer, 'AES-GCM', false, ['decrypt'])
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

async function getClubWalletJwt(
  supabase: ReturnType<typeof createClient>,
  clubId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('club_wallets')
    .select('coinos_jwt_encrypted')
    .eq('club_id', clubId)
    .single()

  if (error || !data?.coinos_jwt_encrypted) return null
  return decrypt(data.coinos_jwt_encrypted)
}

async function coinosGetBalance(jwt: string): Promise<number> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), COINOS_TIMEOUT)

  const response = await fetch(`${COINOS_API_BASE}/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${jwt}` },
    signal: controller.signal,
  })

  clearTimeout(timeout)

  if (!response.ok) throw new Error(`Balance fetch failed: ${response.status}`)
  const data = await response.json()
  return data.balance ?? 0
}

async function coinosSendPayment(
  jwt: string,
  payreq: string,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), COINOS_TIMEOUT)

    const response = await fetch(`${COINOS_API_BASE}/bitcoin/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        payreq,
        ...(amount && { amount }),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Payment failed: ${response.status} ${errorText}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================
// LNURL Helpers
// ============================================

async function getInvoiceFromLightningAddress(
  lightningAddress: string,
  amountSats: number,
  description: string
): Promise<string> {
  const [name, domain] = lightningAddress.split('@')
  if (!name || !domain) throw new Error('Invalid Lightning address format')

  // Step 1: Fetch LNURL-pay details
  const lnurlUrl = `https://${domain}/.well-known/lnurlp/${name}`
  const detailsResponse = await fetch(lnurlUrl, { headers: { Accept: 'application/json' } })
  if (!detailsResponse.ok) throw new Error(`LNURL fetch failed: ${detailsResponse.status}`)

  const details = await detailsResponse.json()
  if (details.status === 'ERROR') throw new Error(details.reason || 'LNURL error')

  const amountMillisats = amountSats * 1000
  if (amountMillisats < details.minSendable) {
    throw new Error(`Amount too small. Min: ${details.minSendable / 1000} sats`)
  }
  if (amountMillisats > details.maxSendable) {
    throw new Error(`Amount too large. Max: ${details.maxSendable / 1000} sats`)
  }

  // Step 2: Request invoice from callback
  const url = new URL(details.callback)
  url.searchParams.set('amount', amountMillisats.toString())
  url.searchParams.set('comment', description)

  const invoiceResponse = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!invoiceResponse.ok) throw new Error(`Invoice request failed: ${invoiceResponse.status}`)

  const invoiceData = await invoiceResponse.json()
  if (invoiceData.status === 'ERROR') throw new Error(invoiceData.reason || 'Invoice request error')
  if (!invoiceData.pr) throw new Error('No invoice returned')

  return invoiceData.pr
}

// ============================================
// Payout Calculation
// ============================================

interface PrizeConfig {
  place: number | 'finisher'
  amount_sats: number
  label: string
}

interface PayoutTarget {
  npub: string
  amount_sats: number
  rank: number
}

function calculatePayouts(
  prizePoolSats: number,
  prizes: PrizeConfig[] | undefined,
  leaderboard: Array<{ npub: string; rank: number }>
): PayoutTarget[] {
  if (prizePoolSats <= 0 || leaderboard.length === 0) return []

  // If custom prizes defined, use them
  if (prizes && prizes.length > 0) {
    const payouts: PayoutTarget[] = []
    for (const prize of prizes) {
      if (prize.place === 'finisher') {
        // Every participant gets this amount
        for (const entry of leaderboard) {
          payouts.push({ npub: entry.npub, amount_sats: prize.amount_sats, rank: entry.rank })
        }
      } else {
        const entry = leaderboard.find(e => e.rank === prize.place)
        if (entry) {
          payouts.push({ npub: entry.npub, amount_sats: prize.amount_sats, rank: entry.rank })
        }
      }
    }
    return payouts
  }

  // Default: top_3_split (60% / 25% / 15%)
  const splits = [0.6, 0.25, 0.15]
  const payouts: PayoutTarget[] = []

  for (let rank = 1; rank <= Math.min(3, leaderboard.length); rank++) {
    const entry = leaderboard.find(e => e.rank === rank)
    if (entry) {
      const amount = Math.floor(prizePoolSats * splits[rank - 1])
      if (amount > 0) {
        payouts.push({ npub: entry.npub, amount_sats: amount, rank })
      }
    }
  }

  return payouts
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[process-club-payouts] Starting cron run...')

    // 1. Find eligible competitions (ended, club-linked, not yet paid out)
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('id, club_id, name, prize_pool_sats, scoring_method, config, end_date')
      .not('club_id', 'is', null)
      .lt('end_date', new Date().toISOString())
      .gt('prize_pool_sats', 0)

    if (compError) {
      console.error('[process-club-payouts] Error fetching competitions:', compError)
      return new Response(
        JSON.stringify({ success: false, reason: compError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!competitions || competitions.length === 0) {
      console.log('[process-club-payouts] No eligible competitions found')
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Filter out already-completed or in-progress payouts
    const compIds = competitions.map(c => c.id)
    const { data: existingPayouts } = await supabase
      .from('club_payout_log')
      .select('competition_id, status')
      .in('competition_id', compIds)

    const skipStatuses = new Set(['completed', 'in_progress'])
    const completedCompIds = new Set(
      (existingPayouts || [])
        .filter((p: { status: string }) => skipStatuses.has(p.status))
        .map((p: { competition_id: string }) => p.competition_id)
    )

    // Also skip insufficient_funds entries that are older than MAX_RETRY_HOURS
    const retryablePayouts = new Map<string, { status: string; created_at: string }>()
    for (const p of (existingPayouts || []) as Array<{ competition_id: string; status: string; created_at?: string }>) {
      if (p.status === 'insufficient_funds' || p.status === 'failed') {
        retryablePayouts.set(p.competition_id, { status: p.status, created_at: p.created_at || '' })
      }
    }

    const eligibleComps = competitions.filter(c => {
      if (completedCompIds.has(c.id)) return false

      // Check retry window for insufficient_funds
      const retryable = retryablePayouts.get(c.id)
      if (retryable) {
        const endDate = new Date(c.end_date)
        const hoursSinceEnd = (Date.now() - endDate.getTime()) / (1000 * 60 * 60)
        if (hoursSinceEnd > MAX_RETRY_HOURS) {
          console.log(`[process-club-payouts] Skipping ${c.name} — retry window expired (${Math.round(hoursSinceEnd)}h)`)
          return false
        }
      }

      return true
    })

    console.log(`[process-club-payouts] ${eligibleComps.length} competitions eligible for payout`)

    let totalProcessed = 0
    let totalPaid = 0

    for (const comp of eligibleComps) {
      console.log(`[process-club-payouts] Processing: ${comp.name} (${comp.id})`)

      // a. Upsert payout log entry (in_progress)
      const { error: logError } = await supabase
        .from('club_payout_log')
        .upsert({
          competition_id: comp.id,
          club_id: comp.club_id,
          status: 'in_progress',
          total_prize_sats: comp.prize_pool_sats,
          started_at: new Date().toISOString(),
        }, { onConflict: 'competition_id' })

      if (logError) {
        console.error(`[process-club-payouts] Failed to create payout log: ${logError.message}`)
        continue
      }

      // b. Get club wallet JWT (stored from registration — no login needed)
      const clubJwt = await getClubWalletJwt(supabase, comp.club_id)
      if (!clubJwt) {
        console.error(`[process-club-payouts] No wallet JWT for club ${comp.club_id}`)
        await supabase
          .from('club_payout_log')
          .update({ status: 'failed', results: [{ error: 'No wallet JWT found' }] })
          .eq('competition_id', comp.id)
        continue
      }

      // c. Check balance using stored JWT
      let balance: number
      try {
        balance = await coinosGetBalance(clubJwt)
      } catch (error) {
        console.error(`[process-club-payouts] Balance check failed:`, error)
        await supabase
          .from('club_payout_log')
          .update({ status: 'failed', results: [{ error: 'Balance check failed' }] })
          .eq('competition_id', comp.id)
        continue
      }

      console.log(`[process-club-payouts] Pool balance: ${balance} sats, prize: ${comp.prize_pool_sats} sats`)

      if (balance < comp.prize_pool_sats) {
        console.log(`[process-club-payouts] Insufficient funds for ${comp.name}`)
        await supabase
          .from('club_payout_log')
          .update({
            status: 'insufficient_funds',
            pool_balance_at_check: balance,
          })
          .eq('competition_id', comp.id)
        continue
      }

      // e. Get leaderboard from workout_submissions
      const { data: submissions, error: subError } = await supabase
        .from('workout_submissions')
        .select('npub, distance_meters, duration_seconds')
        .eq('competition_id', comp.id)

      if (subError) {
        console.error(`[process-club-payouts] Leaderboard query error:`, subError)
        await supabase
          .from('club_payout_log')
          .update({ status: 'failed', results: [{ error: 'Leaderboard query failed' }] })
          .eq('competition_id', comp.id)
        continue
      }

      if (!submissions || submissions.length === 0) {
        console.log(`[process-club-payouts] No submissions for ${comp.name}`)
        await supabase
          .from('club_payout_log')
          .update({ status: 'completed', total_paid_sats: 0, results: [], completed_at: new Date().toISOString() })
          .eq('competition_id', comp.id)
        continue
      }

      // Aggregate scores per npub
      const scoreMap = new Map<string, number>()
      for (const sub of submissions) {
        const current = scoreMap.get(sub.npub) || 0
        if (comp.scoring_method === 'total_distance') {
          scoreMap.set(sub.npub, current + (sub.distance_meters || 0))
        } else if (comp.scoring_method === 'total_duration') {
          scoreMap.set(sub.npub, current + (sub.duration_seconds || 0))
        } else {
          scoreMap.set(sub.npub, current + 1) // workout_count
        }
      }

      // Sort and rank
      const sorted = Array.from(scoreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([npub], i) => ({ npub, rank: i + 1 }))

      // f. Calculate payouts
      const config = comp.config || {}
      const payoutTargets = calculatePayouts(comp.prize_pool_sats, config.prizes, sorted)

      if (payoutTargets.length === 0) {
        console.log(`[process-club-payouts] No payout targets for ${comp.name}`)
        await supabase
          .from('club_payout_log')
          .update({ status: 'completed', total_paid_sats: 0, results: [], completed_at: new Date().toISOString() })
          .eq('competition_id', comp.id)
        continue
      }

      // g. Get Lightning addresses for winners
      const winnerNpubs = payoutTargets.map(t => t.npub)
      const { data: addressRows } = await supabase
        .from('reward_payments')
        .select('npub, lightning_address')
        .in('npub', winnerNpubs)
        .eq('status', 'success')
        .order('paid_at', { ascending: false })

      // Build npub -> lightning_address map (most recent address wins)
      const addressMap = new Map<string, string>()
      for (const row of (addressRows || [])) {
        if (!addressMap.has(row.npub) && row.lightning_address) {
          addressMap.set(row.npub, row.lightning_address)
        }
      }

      // h. Execute payouts
      const results: Array<{ npub: string; amount: number; rank: number; success: boolean; error?: string; preimage?: string }> = []
      let paidTotal = 0

      for (const target of payoutTargets) {
        const lightningAddr = addressMap.get(target.npub)

        if (!lightningAddr) {
          console.log(`[process-club-payouts] No Lightning address for ${target.npub.slice(0, 12)}`)
          results.push({
            npub: target.npub,
            amount: target.amount_sats,
            rank: target.rank,
            success: false,
            error: 'No Lightning address found',
          })
          continue
        }

        try {
          // Get invoice from winner's Lightning address
          const invoice = await getInvoiceFromLightningAddress(
            lightningAddr,
            target.amount_sats,
            `RUNSTR prize: ${comp.name} (Rank #${target.rank})`
          )

          // Pay from club's CoinOS wallet
          const payResult = await coinosSendPayment(clubJwt, invoice)

          if (payResult.success) {
            console.log(`[process-club-payouts] Paid ${target.amount_sats} sats to rank #${target.rank}`)
            results.push({
              npub: target.npub,
              amount: target.amount_sats,
              rank: target.rank,
              success: true,
            })
            paidTotal += target.amount_sats
          } else {
            console.error(`[process-club-payouts] Payment failed: ${payResult.error}`)
            results.push({
              npub: target.npub,
              amount: target.amount_sats,
              rank: target.rank,
              success: false,
              error: payResult.error,
            })
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[process-club-payouts] Error paying ${target.npub.slice(0, 12)}:`, errorMsg)
          results.push({
            npub: target.npub,
            amount: target.amount_sats,
            rank: target.rank,
            success: false,
            error: errorMsg,
          })
        }

        // Small delay between payments
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // i. Update payout log with final results
      const allSucceeded = results.every(r => r.success)
      const anySucceeded = results.some(r => r.success)
      const finalStatus = allSucceeded ? 'completed' : anySucceeded ? 'completed' : 'failed'

      await supabase
        .from('club_payout_log')
        .update({
          status: finalStatus,
          total_paid_sats: paidTotal,
          pool_balance_at_check: balance,
          results,
          completed_at: new Date().toISOString(),
        })
        .eq('competition_id', comp.id)

      totalProcessed++
      totalPaid += paidTotal
      console.log(`[process-club-payouts] ${comp.name}: ${paidTotal} sats paid, status: ${finalStatus}`)
    }

    console.log(`[process-club-payouts] Cron complete: ${totalProcessed} processed, ${totalPaid} sats paid`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        total_paid_sats: totalPaid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[process-club-payouts] Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        reason: error instanceof Error ? error.message : 'internal_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
