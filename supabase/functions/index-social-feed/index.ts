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
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://e.nos.lol',
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

// Query events from last 30 minutes (with overlap for reliability)
const SYNC_WINDOW_SECONDS = 1800

// Max events to process per run (prevent runaway)
const MAX_EVENTS = 200

// Image URL regex
const IMAGE_REGEX = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)/gi

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

    const filter: NostrFilter = {
      kinds: [1],
      '#t': FITNESS_HASHTAGS,
      since,
      limit: 100,
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

    const duration = Date.now() - startTime
    console.log(`Indexed ${rows.length} posts in ${duration}ms`)

    return new Response(JSON.stringify({
      success: true,
      indexed: rows.length,
      skipped: existingIds.size,
      profiles_resolved: profileCache.size,
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
