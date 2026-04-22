/**
 * Supabase Edge Function: index-social-feed
 *
 * Queries Nostr relays for kind 1 posts with fitness hashtags
 * and inserts them into the social_feed table.
 *
 * Designed to be called by pg_cron every 5 minutes.
 *
 * Architecture:
 * 1. Connect to multiple Nostr relays via WebSocket
 * 2. Query kind 1 events with fitness-related hashtag filters
 * 3. Extract images, hashtags, and resolve author profiles
 * 4. Insert into social_feed with dedup via event_id unique constraint
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =============================================
// CONSTANTS
// =============================================

const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
]

// Fitness hashtags to watch for
const FITNESS_HASHTAGS = [
  'runstr',
  'running',
  'cycling',
  'fitness',
  'pushups',
  'strength',
  'hiking',
  'walking',
  'workout',
  'exercise',
]

// Query events from last 2 hours — feed is populated, now just catching new posts
// Dedup handles any overlap via event_id unique constraint
const SYNC_WINDOW_SECONDS = 7200

// Max events to process per run (prevent runaway)
const MAX_EVENTS = 200

// Image URL regex
const IMAGE_REGEX = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)/gi

// Engagement indexing
const ENGAGEMENT_WINDOW_DAYS = 7
const ENGAGEMENT_CHUNK_SIZE = 50

// =============================================
// TYPES
// =============================================

interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

interface NostrFilter {
  kinds?: number[]
  '#t'?: string[]
  since?: number
  limit?: number
}

// =============================================
// RELAY QUERY (same pattern as sync-nostr-workouts)
// =============================================

async function queryRelay(
  relayUrl: string,
  filter: NostrFilter,
  timeoutMs: number = 15000
): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = []
    const subscriptionId = crypto.randomUUID().slice(0, 8)
    let socket: WebSocket | null = null
    let resolved = false

    const cleanup = () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.close()
        } catch {
          // Ignore close errors
        }
      }
    }

    const finish = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve(events)
      }
    }

    const timer = setTimeout(() => {
      console.log(`  ${relayUrl}: timeout (${events.length} events)`)
      finish()
    }, timeoutMs)

    try {
      socket = new WebSocket(relayUrl)

      socket.onopen = () => {
        const req = JSON.stringify(['REQ', subscriptionId, filter])
        socket!.send(req)
      }

      socket.onmessage = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data)
          const msgType = data[0]

          if (msgType === 'EVENT' && data[2]) {
            events.push(data[2] as NostrEvent)
          } else if (msgType === 'EOSE') {
            clearTimeout(timer)
            console.log(`  ${relayUrl}: EOSE (${events.length} events)`)
            finish()
          }
        } catch {
          // Ignore parse errors
        }
      }

      socket.onerror = () => {
        clearTimeout(timer)
        console.log(`  ${relayUrl}: error`)
        finish()
      }

      socket.onclose = () => {
        clearTimeout(timer)
        finish()
      }
    } catch {
      clearTimeout(timer)
      console.log(`  ${relayUrl}: connection failed`)
      finish()
    }
  })
}

// =============================================
// PROFILE RESOLUTION
// =============================================

async function fetchProfiles(
  pubkeys: string[],
  relayUrl: string = 'wss://relay.damus.io'
): Promise<Map<string, { name: string; avatar: string }>> {
  const profiles = new Map<string, { name: string; avatar: string }>()

  if (pubkeys.length === 0) return profiles

  try {
    const events = await queryRelay(relayUrl, {
      kinds: [0],
      // Deno Nostr filter uses authors, not #t
    } as any, 10000)

    // queryRelay doesn't support 'authors' filter directly in the type,
    // so we'll fetch profiles individually via a different approach
  } catch {
    // Profile resolution is best-effort
  }

  return profiles
}

/**
 * Fetch a single profile from relays
 */
async function fetchProfile(
  pubkey: string,
): Promise<{ name: string; avatar: string } | null> {
  for (const relay of RELAYS.slice(0, 3)) {
    try {
      const events = await queryRelay(relay, {
        kinds: [0],
        limit: 1,
      } as any, 5000)

      // Filter for our pubkey (since we can't pass authors in the simple filter)
      // Actually, let's construct the filter properly
      const filter = { kinds: [0], authors: [pubkey], limit: 1 }
      const profileEvents = await queryRelayRaw(relay, filter, 5000)

      if (profileEvents.length > 0) {
        try {
          const profile = JSON.parse(profileEvents[0].content)
          return {
            name: profile.display_name || profile.name || '',
            avatar: profile.picture || '',
          }
        } catch {
          // Bad profile JSON
        }
      }
    } catch {
      continue
    }
  }
  return null
}

/**
 * Raw relay query that accepts any filter object
 */
async function queryRelayRaw(
  relayUrl: string,
  filter: Record<string, unknown>,
  timeoutMs: number = 5000
): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = []
    const subscriptionId = crypto.randomUUID().slice(0, 8)
    let socket: WebSocket | null = null
    let resolved = false

    const finish = () => {
      if (!resolved) {
        resolved = true
        if (socket && socket.readyState === WebSocket.OPEN) {
          try { socket.close() } catch {}
        }
        resolve(events)
      }
    }

    const timer = setTimeout(() => finish(), timeoutMs)

    try {
      socket = new WebSocket(relayUrl)
      socket.onopen = () => {
        socket!.send(JSON.stringify(['REQ', subscriptionId, filter]))
      }
      socket.onmessage = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data)
          if (data[0] === 'EVENT' && data[2]) events.push(data[2])
          else if (data[0] === 'EOSE') { clearTimeout(timer); finish() }
        } catch {}
      }
      socket.onerror = () => { clearTimeout(timer); finish() }
      socket.onclose = () => { clearTimeout(timer); finish() }
    } catch {
      clearTimeout(timer); finish()
    }
  })
}

// =============================================
// HELPERS
// =============================================

/**
 * Extract image URLs from post content
 */
function extractImages(event: NostrEvent): string[] {
  const images: string[] = []

  // From content text
  const matches = event.content.match(IMAGE_REGEX)
  if (matches) images.push(...matches)

  // From imeta tags
  event.tags
    .filter((t) => t[0] === 'imeta')
    .forEach((t) => {
      const urlPart = t.find((p) => p.startsWith('url '))
      if (urlPart) images.push(urlPart.replace('url ', ''))
    })

  // Deduplicate
  return [...new Set(images)]
}

/**
 * Extract hashtags from event tags
 */
function extractHashtags(event: NostrEvent): string[] {
  return event.tags
    .filter((t) => t[0] === 't' && t[1])
    .map((t) => t[1].toLowerCase())
}

/**
 * Check if event has at least one fitness hashtag
 */
function hasFitnessHashtag(event: NostrEvent): boolean {
  const tags = extractHashtags(event)
  return tags.some((t) => FITNESS_HASHTAGS.includes(t))
}

/**
 * Convert hex pubkey to npub (simplified — just prefix with npub for storage)
 */
function pubkeyToNpub(hex: string): string {
  // For storage purposes, we use the hex pubkey
  // The app resolves display from this
  return hex
}

// =============================================
// ENGAGEMENT HELPERS
// =============================================

/**
 * Parse zap amount from a kind 9735 zap receipt event.
 */
function parseZapAmount(event: NostrEvent): number {
  // Look for bolt11 tag
  const bolt11Tag = event.tags.find((t) => t[0] === 'bolt11')
  if (bolt11Tag && bolt11Tag[1]) {
    return decodeBolt11Amount(bolt11Tag[1])
  }

  // Look for amount in description tag (zap request)
  const descTag = event.tags.find((t) => t[0] === 'description')
  if (descTag && descTag[1]) {
    try {
      const zapRequest = JSON.parse(descTag[1])
      const amountTag = zapRequest.tags?.find((t: string[]) => t[0] === 'amount')
      if (amountTag && amountTag[1]) {
        return Math.floor(parseInt(amountTag[1], 10) / 1000) // millisats to sats
      }
    } catch {}
  }

  return 0
}

/**
 * Decode amount from a bolt11 invoice string.
 */
function decodeBolt11Amount(bolt11: string): number {
  const lower = bolt11.toLowerCase()
  const match = lower.match(/^lnbc(\d+)([munp]?)/)
  if (!match) return 0

  const num = parseInt(match[1], 10)
  const multiplier = match[2]

  switch (multiplier) {
    case 'm': return num * 100000
    case 'u': return num * 100
    case 'n': return Math.floor(num / 10)
    case 'p': return Math.floor(num / 10000)
    default: return num * 100000000
  }
}

/**
 * Extract the sender pubkey from a kind 9735 zap receipt.
 */
function getZapSender(event: NostrEvent): string | null {
  const descTag = event.tags.find((t) => t[0] === 'description')
  if (!descTag || !descTag[1]) return null

  try {
    const zapRequest = JSON.parse(descTag[1])
    return zapRequest.pubkey || null
  } catch {
    return null
  }
}

/**
 * Get the referenced post event_id from an event's e-tags.
 */
function getReferencedEventId(event: NostrEvent): string | null {
  const eTag = event.tags.find((t) => t[0] === 'e')
  return eTag ? eTag[1] : null
}

/**
 * Index engagement (likes, reposts, zaps, comments) for recent posts.
 */
async function indexEngagement(
  supabase: ReturnType<typeof createClient>,
): Promise<{ likes: number; reposts: number; zaps: number; comments: number }> {
  const stats = { likes: 0, reposts: 0, zaps: 0, comments: 0 }

  // Load recent post event_ids (last 7 days)
  const cutoff = new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS * 86400000).toISOString()
  const { data: recentPosts, error: postsErr } = await supabase
    .from('social_feed')
    .select('id, event_id')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(500)

  if (postsErr || !recentPosts || recentPosts.length === 0) {
    console.log('No recent posts to index engagement for')
    return stats
  }

  // Build lookup: event_id -> post UUID
  const eventToPostId = new Map<string, string>()
  for (const p of recentPosts) {
    eventToPostId.set(p.event_id, p.id)
  }

  const allEventIds = recentPosts.map((p: { event_id: string }) => p.event_id)
  console.log(`Indexing engagement for ${allEventIds.length} recent posts`)

  // Batch into chunks and query relays
  const allEngagementEvents: NostrEvent[] = []

  for (let i = 0; i < allEventIds.length; i += ENGAGEMENT_CHUNK_SIZE) {
    const chunk = allEventIds.slice(i, i + ENGAGEMENT_CHUNK_SIZE)
    const filter = {
      kinds: [7, 6, 9735, 1],
      '#e': chunk,
      limit: 200,
    }

    // Query first 3 relays for engagement (faster than all 7)
    const results = await Promise.allSettled(
      RELAYS.slice(0, 3).map((relay) => queryRelayRaw(relay, filter, 10000))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEngagementEvents.push(...result.value)
      }
    }
  }

  console.log(`Found ${allEngagementEvents.length} engagement events from relays`)

  // Deduplicate by event ID
  const dedupedEvents = new Map<string, NostrEvent>()
  for (const event of allEngagementEvents) {
    if (!dedupedEvents.has(event.id)) {
      dedupedEvents.set(event.id, event)
    }
  }

  // Categorize and process
  const likesByPost = new Map<string, Set<string>>()
  const repostsByPost = new Map<string, Set<string>>()
  const zapRows: Array<{ event_id: string; post_id: string; sender_npub: string; amount: number; created_at: string }> = []
  const commentRows: Array<{ event_id: string; post_id: string; sender_npub: string; content: string; author_name: string | null; author_avatar: string | null; created_at: string }> = []

  for (const event of dedupedEvents.values()) {
    const refEventId = getReferencedEventId(event)
    if (!refEventId) continue

    const postId = eventToPostId.get(refEventId)
    if (!postId) continue

    switch (event.kind) {
      case 7: {
        if (!likesByPost.has(postId)) likesByPost.set(postId, new Set())
        likesByPost.get(postId)!.add(pubkeyToNpub(event.pubkey))
        stats.likes++
        break
      }
      case 6: {
        if (!repostsByPost.has(postId)) repostsByPost.set(postId, new Set())
        repostsByPost.get(postId)!.add(pubkeyToNpub(event.pubkey))
        stats.reposts++
        break
      }
      case 9735: {
        const amount = parseZapAmount(event)
        const sender = getZapSender(event)
        if (amount > 0 && sender) {
          zapRows.push({
            event_id: event.id,
            post_id: postId,
            sender_npub: pubkeyToNpub(sender),
            amount,
            created_at: new Date(event.created_at * 1000).toISOString(),
          })
          stats.zaps++
        }
        break
      }
      case 1: {
        if (event.content && event.content.trim().length > 0) {
          commentRows.push({
            event_id: event.id,
            post_id: postId,
            sender_npub: pubkeyToNpub(event.pubkey),
            content: event.content.trim(),
            author_name: null,
            author_avatar: null,
            created_at: new Date(event.created_at * 1000).toISOString(),
          })
          stats.comments++
        }
        break
      }
    }
  }

  // Resolve comment author profiles (best-effort, first 20)
  const commentPubkeys = [...new Set(commentRows.map((c) => c.sender_npub))].slice(0, 20)
  for (const pubkey of commentPubkeys) {
    const profile = await fetchProfile(pubkey)
    if (profile) {
      for (const row of commentRows) {
        if (row.sender_npub === pubkey) {
          row.author_name = profile.name
          row.author_avatar = profile.avatar
        }
      }
    }
  }

  // Write likes
  for (const [postId, npubs] of likesByPost) {
    const npubArray = [...npubs]
    await supabase.rpc('merge_liked_by', { target_post_id: postId, new_npubs: npubArray }).catch((err: unknown) => {
      console.warn(`[Engagement] merge_liked_by error for ${postId}:`, err)
    })
  }

  // Write reposts
  for (const [postId, npubs] of repostsByPost) {
    const npubArray = [...npubs]
    await supabase.rpc('merge_reposted_by', { target_post_id: postId, new_npubs: npubArray }).catch((err: unknown) => {
      console.warn(`[Engagement] merge_reposted_by error for ${postId}:`, err)
    })
  }

  // Write zaps
  if (zapRows.length > 0) {
    const { error: zapErr } = await supabase
      .from('social_feed_zaps')
      .upsert(zapRows, { onConflict: 'event_id', ignoreDuplicates: true })
    if (zapErr) console.error('[Engagement] Zap upsert error:', zapErr)

    const affectedPostIds = [...new Set(zapRows.map((z) => z.post_id))]
    for (const postId of affectedPostIds) {
      const { data: sumData } = await supabase
        .from('social_feed_zaps')
        .select('amount')
        .eq('post_id', postId)
      const total = (sumData || []).reduce((sum: number, row: { amount: number }) => sum + row.amount, 0)
      await supabase.from('social_feed').update({ zap_total: total }).eq('id', postId)
    }
  }

  // Write comments
  if (commentRows.length > 0) {
    const { error: commentErr } = await supabase
      .from('social_feed_comments')
      .upsert(commentRows, { onConflict: 'event_id', ignoreDuplicates: true })
    if (commentErr) console.error('[Engagement] Comment upsert error:', commentErr)

    const affectedPostIds = [...new Set(commentRows.map((c) => c.post_id))]
    for (const postId of affectedPostIds) {
      const { count } = await supabase
        .from('social_feed_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
      await supabase.from('social_feed').update({ comment_count: count || 0 }).eq('id', postId)
    }
  }

  return stats
}

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req) => {
  const startTime = Date.now()
  console.log('=== Social Feed Indexer ===')

  try {
    // Init Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate time window
    const since = Math.floor(Date.now() / 1000) - SYNC_WINDOW_SECONDS

    // Query relays for fitness posts
    console.log(`Querying ${RELAYS.length} relays for fitness posts since ${new Date(since * 1000).toISOString()}`)

    // Query each hashtag separately for better relay coverage
    // Some relays don't support multi-value #t filters well
    const filter: NostrFilter = {
      kinds: [1],
      '#t': FITNESS_HASHTAGS,
      since,
      limit: 200,
    }

    // Query all relays in parallel
    const relayResults = await Promise.allSettled(
      RELAYS.map((relay) => queryRelay(relay, filter))
    )

    // Collect and deduplicate events by event ID
    const eventMap = new Map<string, NostrEvent>()
    let totalFromRelays = 0

    for (const result of relayResults) {
      if (result.status === 'fulfilled') {
        for (const event of result.value) {
          totalFromRelays++
          if (!eventMap.has(event.id)) {
            // Double-check it has a fitness hashtag (relay filtering can be loose)
            if (hasFitnessHashtag(event)) {
              eventMap.set(event.id, event)
            }
          }
        }
      }
    }

    const uniqueEvents = Array.from(eventMap.values()).slice(0, MAX_EVENTS)
    console.log(`Found ${totalFromRelays} total events, ${uniqueEvents.length} unique fitness posts`)

    if (uniqueEvents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        indexed: 0,
        duration_ms: Date.now() - startTime,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Check which events already exist in social_feed
    const eventIds = uniqueEvents.map((e) => e.id)
    const { data: existing } = await supabase
      .from('social_feed')
      .select('event_id')
      .in('event_id', eventIds)

    const existingIds = new Set((existing || []).map((e: { event_id: string }) => e.event_id))
    const newEvents = uniqueEvents.filter((e) => !existingIds.has(e.id))

    console.log(`${existingIds.size} already indexed, ${newEvents.length} new posts to insert`)

    if (newEvents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        indexed: 0,
        skipped: existingIds.size,
        duration_ms: Date.now() - startTime,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Resolve author profiles for new events (best-effort, batch)
    const uniquePubkeys = [...new Set(newEvents.map((e) => e.pubkey))]
    console.log(`Resolving ${uniquePubkeys.length} author profiles...`)

    const profileCache = new Map<string, { name: string; avatar: string }>()

    // Fetch profiles from first relay (batch, best-effort)
    for (const pubkey of uniquePubkeys.slice(0, 20)) {
      const profile = await fetchProfile(pubkey)
      if (profile) {
        profileCache.set(pubkey, profile)
      }
    }

    console.log(`Resolved ${profileCache.size}/${uniquePubkeys.length} profiles`)

    // Build insert rows
    const rows = newEvents.map((event) => {
      const profile = profileCache.get(event.pubkey)
      return {
        event_id: event.id,
        npub: pubkeyToNpub(event.pubkey),
        content: event.content,
        images: extractImages(event),
        hashtags: extractHashtags(event),
        author_name: profile?.name || null,
        author_avatar: profile?.avatar || null,
        created_at: new Date(event.created_at * 1000).toISOString(),
      }
    })

    // Batch insert (skip duplicates via ON CONFLICT)
    const { error: insertError, count } = await supabase
      .from('social_feed')
      .upsert(rows, { onConflict: 'event_id', ignoreDuplicates: true })

    if (insertError) {
      console.error('Insert error:', insertError)
    }

    console.log(`Indexed ${rows.length} posts`)

    // === Engagement Indexing ===
    console.log('--- Engagement Indexing ---')
    const engagementStats = await indexEngagement(supabase)
    console.log(`Engagement: ${engagementStats.likes} likes, ${engagementStats.reposts} reposts, ${engagementStats.zaps} zaps, ${engagementStats.comments} comments`)

    const duration = Date.now() - startTime
    console.log(`Total indexer run: ${duration}ms`)

    return new Response(JSON.stringify({
      success: true,
      indexed: rows.length,
      skipped: existingIds.size,
      profiles_resolved: profileCache.size,
      engagement: engagementStats,
      duration_ms: duration,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Social feed indexer error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      duration_ms: Date.now() - startTime,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
