/**
 * Supabase Edge Function: submit-workout
 *
 * Validates and stores workout submissions with anti-cheat protection.
 * Called by the app when user clicks "Compete" button.
 *
 * Anti-cheat validation includes:
 * - Pace limits (too fast = superhuman, too slow = not real activity)
 * - Distance limits (max per activity type)
 * - Duration limits (max per activity type)
 * - Zero distance with duration check (forgot to end workout?)
 * - Duplicate event ID detection
 * - Time-overlap detection (can't do 2 workouts simultaneously)
 *
 * Valid workouts → workout_submissions table
 * Invalid workouts → flagged_workouts table (for admin review)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =============================================
// ANTI-CHEAT: Distance-Aware Pace Limits
// =============================================

// Base limits for each activity type (max pace and duration)
const BASE_LIMITS: Record<string, {
  maxPaceSecondsPerKm: number;
  maxDistanceKm: number;
  maxDurationSeconds: number;
}> = {
  running: {
    maxPaceSecondsPerKm: 1800,   // 30:00/km (too slow to be running)
    maxDistanceKm: 200,          // Ultra marathon limit
    maxDurationSeconds: 172800,  // 48 hours
  },
  walking: {
    maxPaceSecondsPerKm: 3600,   // 60:00/km (too slow to count)
    maxDistanceKm: 100,          // Max single walk
    maxDurationSeconds: 86400,   // 24 hours
  },
  cycling: {
    maxPaceSecondsPerKm: 600,    // 10:00/km (6 km/h - too slow)
    maxDistanceKm: 500,          // Max single ride
    maxDurationSeconds: 172800,  // 48 hours
  },
}

/**
 * Get minimum pace (sec/km) based on distance for running
 * Uses world record paces as reference, allowing slightly faster to avoid false positives
 *
 * World Records (as of 2025):
 * - 5K: 12:35 (Joshua Cheptegei) = 151 sec/km
 * - 10K: 26:11 = 157 sec/km
 * - Half Marathon: 57:30 = 163 sec/km
 * - Marathon: 2:00:35 = 172 sec/km
 */
function getMinPaceForRunning(distanceKm: number): number {
  if (distanceKm < 1) return 90      // 1:30/km - sprint/interval territory
  if (distanceKm < 3) return 130     // 2:10/km - faster than 1500m WR pace
  if (distanceKm < 5) return 145     // 2:25/km - faster than 5K WR (151)
  if (distanceKm < 10) return 150    // 2:30/km - between 5K and 10K WR
  if (distanceKm < 21.1) return 155  // 2:35/km - faster than 10K WR (157)
  if (distanceKm < 42.2) return 160  // 2:40/km - faster than HM WR (163)
  return 170                          // 2:50/km - faster than marathon WR (172)
}

/**
 * Get minimum pace (sec/km) for walking
 * Below 3:00/km is running, not walking
 */
function getMinPaceForWalking(distanceKm: number): number {
  return 180 // 3:00/km - anything faster is running
}

/**
 * Get minimum pace (sec/km) for cycling
 * Below 30 sec/km = 120 km/h, only possible downhill
 */
function getMinPaceForCycling(distanceKm: number): number {
  if (distanceKm < 1) return 20   // 0:20/km = 180 km/h - very short downhill burst
  return 30                        // 0:30/km = 120 km/h - max sustained
}

/**
 * Get minimum pace for any activity type based on distance
 */
function getMinPaceSecondsPerKm(activityType: string, distanceKm: number): number {
  switch (activityType) {
    case 'running':
      return getMinPaceForRunning(distanceKm)
    case 'walking':
      return getMinPaceForWalking(distanceKm)
    case 'cycling':
      return getMinPaceForCycling(distanceKm)
    default:
      return 60 // 1:00/km default for unknown types
  }
}

// =============================================
// ANTI-CHEAT: Target Time Minimums (World Records)
// =============================================

// Minimum allowed times for each target distance (in seconds)
// Set slightly below world records to avoid false positives
const MIN_TARGET_TIMES = {
  time_5k_seconds: 750,      // 12:30 (WR is 12:35)
  time_10k_seconds: 1560,    // 26:00 (WR is 26:11)
  time_half_seconds: 3440,   // 57:20 (WR is 57:30)
  time_marathon_seconds: 7200, // 2:00:00 (WR is 2:00:35)
}

/**
 * Validate target times against world record minimums
 * Returns validation result with reason if any time is impossibly fast
 */
function validateTargetTimes(targetTimes: {
  time_5k_seconds: number | null
  time_10k_seconds: number | null
  time_half_seconds: number | null
  time_marathon_seconds: number | null
}): ValidationResult {
  if (targetTimes.time_5k_seconds !== null && targetTimes.time_5k_seconds < MIN_TARGET_TIMES.time_5k_seconds) {
    const min = Math.floor(targetTimes.time_5k_seconds / 60)
    const sec = Math.round(targetTimes.time_5k_seconds % 60)
    return {
      valid: false,
      reason: `5K time of ${min}:${String(sec).padStart(2, '0')} is faster than world record (12:35)`
    }
  }
  if (targetTimes.time_10k_seconds !== null && targetTimes.time_10k_seconds < MIN_TARGET_TIMES.time_10k_seconds) {
    const min = Math.floor(targetTimes.time_10k_seconds / 60)
    const sec = Math.round(targetTimes.time_10k_seconds % 60)
    return {
      valid: false,
      reason: `10K time of ${min}:${String(sec).padStart(2, '0')} is faster than world record (26:00)`
    }
  }
  if (targetTimes.time_half_seconds !== null && targetTimes.time_half_seconds < MIN_TARGET_TIMES.time_half_seconds) {
    const hours = Math.floor(targetTimes.time_half_seconds / 3600)
    const min = Math.floor((targetTimes.time_half_seconds % 3600) / 60)
    const sec = Math.round(targetTimes.time_half_seconds % 60)
    return {
      valid: false,
      reason: `Half marathon time of ${hours}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')} is faster than world record (57:30)`
    }
  }
  if (targetTimes.time_marathon_seconds !== null && targetTimes.time_marathon_seconds < MIN_TARGET_TIMES.time_marathon_seconds) {
    const hours = Math.floor(targetTimes.time_marathon_seconds / 3600)
    const min = Math.floor((targetTimes.time_marathon_seconds % 3600) / 60)
    return {
      valid: false,
      reason: `Marathon time of ${hours}:${String(min).padStart(2, '0')} is faster than world record (2:00:35)`
    }
  }
  return { valid: true }
}

// =============================================
// ANTI-CHEAT: Split Consistency Checking
// =============================================

/**
 * Validate splits for consistency and realism
 * Detects:
 * 1. Individual splits faster than physically possible
 * 2. Suspicious split patterns (one split way faster than average)
 * 3. Total time vs splits mismatch
 */
function validateSplitConsistency(
  splits: Record<number, number>,
  totalDurationSeconds: number,
  activityType: string
): ValidationResult {
  if (Object.keys(splits).length === 0) {
    return { valid: true } // No splits to validate
  }

  const sortedKms = Object.keys(splits).map(Number).sort((a, b) => a - b)

  // Calculate individual split times (delta between consecutive splits)
  const individualSplits: { km: number; deltaSeconds: number; pacePerKm: number }[] = []
  let prevKm = 0
  let prevTime = 0

  for (const km of sortedKms) {
    const deltaKm = km - prevKm
    const deltaSeconds = splits[km] - prevTime

    if (deltaKm > 0 && deltaSeconds > 0) {
      const pacePerKm = deltaSeconds / deltaKm
      individualSplits.push({ km, deltaSeconds, pacePerKm })
    }

    prevKm = km
    prevTime = splits[km]
  }

  if (individualSplits.length === 0) {
    return { valid: true }
  }

  // 1. Check individual split pace limits
  for (const split of individualSplits) {
    const minPace = getMinPaceSecondsPerKm(activityType, split.km)
    if (split.pacePerKm < minPace) {
      const paceMin = Math.floor(split.pacePerKm / 60)
      const paceSec = Math.round(split.pacePerKm % 60)
      return {
        valid: false,
        reason: `Split at ${split.km}km has impossible pace of ${paceMin}:${String(paceSec).padStart(2, '0')}/km`
      }
    }
  }

  // 2. Check for suspicious variation (one split > 2x faster than average)
  if (individualSplits.length >= 3) {
    const avgPace = individualSplits.reduce((sum, s) => sum + s.pacePerKm, 0) / individualSplits.length
    for (const split of individualSplits) {
      if (split.pacePerKm < avgPace * 0.5) {
        const paceMin = Math.floor(split.pacePerKm / 60)
        const paceSec = Math.round(split.pacePerKm % 60)
        const avgMin = Math.floor(avgPace / 60)
        const avgSec = Math.round(avgPace % 60)
        return {
          valid: false,
          reason: `Split at ${split.km}km (${paceMin}:${String(paceSec).padStart(2, '0')}/km) is suspiciously faster than average (${avgMin}:${String(avgSec).padStart(2, '0')}/km)`
        }
      }
    }
  }

  // 2b. Check for suspiciously LOW variance (car cheating detection)
  // Real runners have natural pace variation (5-15% typical)
  // Cars maintain near-constant speed (< 3% variance is suspicious for elite pace)
  if (individualSplits.length >= 3 && activityType === 'running') {
    const avgPace = individualSplits.reduce((sum, s) => sum + s.pacePerKm, 0) / individualSplits.length

    // Only check if pace is elite (< 4:00/km = 240 sec/km)
    // Regular joggers at 6:00/km can have low variance naturally
    if (avgPace < 240) {
      // Calculate coefficient of variation (standard deviation / mean)
      const variance = individualSplits.reduce((sum, s) => sum + Math.pow(s.pacePerKm - avgPace, 2), 0) / individualSplits.length
      const stdDev = Math.sqrt(variance)
      const coefficientOfVariation = (stdDev / avgPace) * 100

      // Elite runners typically have 5-15% CV
      // Car at constant speed would be < 3%
      const MIN_CV_FOR_ELITE_PACE = 3.0

      if (coefficientOfVariation < MIN_CV_FOR_ELITE_PACE) {
        const avgMin = Math.floor(avgPace / 60)
        const avgSec = Math.round(avgPace % 60)
        return {
          valid: false,
          reason: `Suspiciously consistent pace (${coefficientOfVariation.toFixed(1)}% variance) at elite speed (${avgMin}:${String(avgSec).padStart(2, '0')}/km) - real running shows more variation`
        }
      }
    }
  }

  // 3. Check last split vs total time (allow 10% tolerance for timing differences)
  const lastKm = sortedKms[sortedKms.length - 1]
  const lastSplitTime = splits[lastKm]
  if (lastSplitTime > totalDurationSeconds * 1.1) {
    return {
      valid: false,
      reason: `Split time (${Math.round(lastSplitTime)}s at ${lastKm}km) exceeds total duration (${totalDurationSeconds}s)`
    }
  }

  return { valid: true }
}

interface WorkoutSubmission {
  event_id: string
  npub: string
  activity_type: string
  distance_meters: number | null
  duration_seconds: number
  calories: number | null
  created_at: string
  raw_event: Record<string, unknown>
  source?: 'app' | 'nostr_scan' | 'baseline_migration'
  // New fields for daily leaderboard
  profile_name?: string
  profile_picture?: string
  // TIMEZONE FIX: Client can send local date for correct leaderboard grouping
  leaderboard_date?: string
  // PPQ.AI team: Bolt11 invoice for reward topup (instead of Lightning address)
  ppq_bolt11?: string
  ppq_invoice_id?: string
  // Club fields: route captain rewards via club lightning address
  club_id?: string
  club_lightning_address?: string
}

// =============================================
// DAILY LEADERBOARD: Split Parsing & Time Calculation
// =============================================

/**
 * Parse split data from kind 1301 event tags
 * Tags format: ["split", "5", "00:32:10"] where 5 = km marker, time in HH:MM:SS
 * Returns map of km -> elapsed seconds
 */
function parseSplitsFromTags(rawEvent: Record<string, unknown>): Record<number, number> {
  const splits: Record<number, number> = {}
  const tags = rawEvent.tags as string[][] | undefined

  if (!tags || !Array.isArray(tags)) {
    return splits
  }

  for (const tag of tags) {
    if (tag[0] === 'split' && tag.length >= 3) {
      const km = parseInt(tag[1])
      const timeStr = tag[2]

      if (!isNaN(km) && timeStr && km > 0) {
        const seconds = parseTimeToSeconds(timeStr)
        if (seconds > 0) {
          splits[km] = seconds
        }
      }
    }
  }

  return splits
}

/**
 * Parse time string (HH:MM:SS or MM:SS) to seconds
 */
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1]
  }

  return 0
}

/**
 * Parse step count from kind 1301 event tags
 * Tag format: ["steps", "12345"]
 */
function parseStepCount(rawEvent: Record<string, unknown>): number | null {
  const tags = rawEvent.tags as string[][] | undefined

  if (!tags || !Array.isArray(tags)) {
    return null
  }

  for (const tag of tags) {
    if (tag[0] === 'steps' && tag[1]) {
      const steps = parseInt(tag[1])
      return !isNaN(steps) && steps > 0 ? steps : null
    }
  }

  return null
}

/**
 * Parse WoT score from kind 1301 event tags
 * Tag format: ["wot_score", "0.000168"]
 * Used for fraud prevention gating in external reward tool
 */
function parseWotScore(rawEvent: Record<string, unknown>): number {
  const tags = rawEvent.tags as string[][] | undefined

  if (!tags || !Array.isArray(tags)) {
    return 0
  }

  for (const tag of tags) {
    if (tag[0] === 'wot_score' && tag[1]) {
      const score = parseFloat(tag[1])
      return !isNaN(score) ? score : 0
    }
  }

  return 0
}

/**
 * Calculate time at target distance using splits or interpolation
 * Same logic as client-side SimpleLeaderboardService.extractTargetDistanceTime()
 *
 * @param splits - Map of km -> elapsed seconds
 * @param totalDistanceKm - Total workout distance
 * @param totalDurationSeconds - Total workout duration
 * @param targetKm - Target distance (5, 10, 21.1, 42.2)
 * @returns Time in seconds to reach target distance, or null if not reachable
 */
function calculateTargetTime(
  splits: Record<number, number>,
  totalDistanceKm: number,
  totalDurationSeconds: number,
  targetKm: number
): number | null {
  // Must have run at least the target distance
  if (totalDistanceKm < targetKm) {
    return null
  }

  // 1. Check for exact split at target distance
  const exactSplit = splits[targetKm]
  if (exactSplit !== undefined && exactSplit > 0) {
    return exactSplit
  }

  // 2. Try interpolation from closest split
  const sortedKms = Object.keys(splits).map(Number).sort((a, b) => a - b)

  // Find closest split <= target distance
  let closestKm = 0
  let closestTime = 0

  for (const km of sortedKms) {
    if (km <= targetKm && km > closestKm) {
      closestKm = km
      closestTime = splits[km]
    }
  }

  // Interpolate from closest split
  if (closestKm > 0 && closestTime > 0) {
    const remainingDistance = targetKm - closestKm
    const avgPacePerKm = closestTime / closestKm
    const estimatedTime = closestTime + remainingDistance * avgPacePerKm
    // Cap at total duration
    return Math.round(Math.min(estimatedTime, totalDurationSeconds))
  }

  // 3. Fallback: Calculate from average pace
  if (totalDistanceKm > 0 && totalDurationSeconds > 0) {
    const avgPacePerKm = totalDurationSeconds / totalDistanceKm
    return Math.round(avgPacePerKm * targetKm)
  }

  return null
}

/**
 * Calculate all target times for a workout
 */
function calculateAllTargetTimes(
  splits: Record<number, number>,
  totalDistanceKm: number,
  totalDurationSeconds: number
): {
  time_5k_seconds: number | null
  time_10k_seconds: number | null
  time_half_seconds: number | null
  time_marathon_seconds: number | null
} {
  return {
    time_5k_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 5),
    time_10k_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 10),
    time_half_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 21.1),
    time_marathon_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 42.2),
  }
}

/**
 * Calculate cycling target times (20K, 40K, 100K brackets).
 * Only meaningful for activity_type='cycling' workouts.
 */
function calculateAllCyclingTargetTimes(
  splits: Record<number, number>,
  totalDistanceKm: number,
  totalDurationSeconds: number
): {
  time_cycling_20k_seconds: number | null
  time_cycling_40k_seconds: number | null
  time_cycling_100k_seconds: number | null
} {
  return {
    time_cycling_20k_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 20),
    time_cycling_40k_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 40),
    time_cycling_100k_seconds: calculateTargetTime(splits, totalDistanceKm, totalDurationSeconds, 100),
  }
}

/**
 * Auto-classify "other" type workouts based on pace
 * Used for Apple Health / Health Connect imports that don't have proper activity type tags
 *
 * Pace thresholds:
 * - Running: < 8 min/km (480 sec/km) - faster than 7.5 km/h
 * - Walking: > 12 min/km (720 sec/km) - slower than 5 km/h
 * - Ambiguous (8-12 min/km): default to 'running' if distance >= 1km
 */
function classifyOtherWorkout(workout: WorkoutSubmission): string {
  // Only classify "other" type
  if (workout.activity_type !== 'other') {
    return workout.activity_type
  }

  const distanceKm = (workout.distance_meters || 0) / 1000
  const duration = workout.duration_seconds || 0

  // Can't classify without both distance and duration
  if (distanceKm <= 0 || duration <= 0) {
    return 'other'
  }

  const paceSecondsPerKm = duration / distanceKm

  // Pace thresholds
  const RUNNING_THRESHOLD = 480  // 8:00/km
  const WALKING_THRESHOLD = 720  // 12:00/km

  if (paceSecondsPerKm < RUNNING_THRESHOLD) {
    console.log(`🏃 Auto-classified as RUNNING: ${paceSecondsPerKm.toFixed(0)}s/km pace`)
    return 'running'
  }

  if (paceSecondsPerKm > WALKING_THRESHOLD) {
    console.log(`🚶 Auto-classified as WALKING: ${paceSecondsPerKm.toFixed(0)}s/km pace`)
    return 'walking'
  }

  // Ambiguous zone (8-12 min/km): default to running if significant distance
  if (distanceKm >= 1) {
    console.log(`🏃 Ambiguous pace (${paceSecondsPerKm.toFixed(0)}s/km) with ${distanceKm.toFixed(1)}km - defaulting to RUNNING`)
    return 'running'
  }

  return 'other'
}

interface ValidationResult {
  valid: boolean
  reason?: string
}

// =============================================
// VERIFICATION CODE VALIDATION
// =============================================

type VerificationStatus = 'verified' | 'unverified' | 'invalid' | 'legacy' | 'expired' | 'replay' | 'tampered'

/**
 * Extract verification data from kind 1301 event tags
 */
function extractVerificationData(rawEvent: Record<string, unknown>): {
  verificationCode: string | null
  clientVersion: string | null
} {
  const tags = rawEvent.tags as string[][] | undefined

  if (!tags || !Array.isArray(tags)) {
    return { verificationCode: null, clientVersion: null }
  }

  // Find ["v", "code"] tag
  const vTag = tags.find(t => t[0] === 'v')
  const verificationCode = vTag?.[1] || null

  // Find ["client", "RUNSTR", "version"] tag
  const clientTag = tags.find(t => t[0] === 'client' && t[1] === 'RUNSTR')
  const clientVersion = clientTag?.[2] || null

  return { verificationCode, clientVersion }
}

/**
 * Extract workout data needed for per-workout verification
 */
function extractWorkoutDataForVerification(rawEvent: Record<string, unknown>): {
  workoutId: string | null
  exercise: string | null
  distanceMeters: number
  durationSeconds: number
  startTimestamp: number
} {
  const tags = rawEvent.tags as string[][] | undefined

  if (!tags || !Array.isArray(tags)) {
    return { workoutId: null, exercise: null, distanceMeters: 0, durationSeconds: 0, startTimestamp: 0 }
  }

  // Find ["d", "workout_id"] tag
  const dTag = tags.find(t => t[0] === 'd')
  const workoutId = dTag?.[1] || null

  // Find ["exercise", "type"] tag
  const exerciseTag = tags.find(t => t[0] === 'exercise')
  const exercise = exerciseTag?.[1]?.toLowerCase() || null

  // Find ["distance", "value", "unit"] tag and convert to meters
  const distanceTag = tags.find(t => t[0] === 'distance')
  let distanceMeters = 0
  if (distanceTag && distanceTag[1]) {
    const value = parseFloat(distanceTag[1])
    const unit = distanceTag[2]?.toLowerCase() || 'km'
    if (!isNaN(value)) {
      distanceMeters = unit === 'mi' ? Math.round(value * 1609.34) : Math.round(value * 1000)
    }
  }

  // Find ["duration", "HH:MM:SS"] tag
  const durationTag = tags.find(t => t[0] === 'duration')
  const durationSeconds = durationTag?.[1] ? parseTimeToSeconds(durationTag[1]) : 0

  // Find ["workout_start_time", "timestamp"] tag
  const startTag = tags.find(t => t[0] === 'workout_start_time')
  const startTimestamp = startTag?.[1] ? parseInt(startTag[1]) : 0

  return { workoutId, exercise, distanceMeters, durationSeconds, startTimestamp }
}

/**
 * Build canonical string for verification (must match get-workout-verification)
 */
function buildCanonicalString(
  npub: string,
  workoutId: string,
  exercise: string,
  distanceMeters: number,
  durationSeconds: number,
  startTimestamp: number
): string {
  return `${npub}:${workoutId}:${exercise}:${distanceMeters}:${durationSeconds}:${startTimestamp}`
}

/**
 * Generate HMAC-SHA256 verification code (same as get-verification-code function)
 */
async function generateHmacCode(secret: string, npub: string, version: string): Promise<string> {
  const encoder = new TextEncoder()
  const message = `${npub}:${version}`

  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))

  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex.substring(0, 16)
}

/**
 * Validate per-workout verification code against stored record
 */
async function validatePerWorkoutCode(
  supabase: ReturnType<typeof createClient>,
  npub: string,
  rawEvent: Record<string, unknown>
): Promise<{ status: VerificationStatus; code: string | null } | null> {
  const { verificationCode } = extractVerificationData(rawEvent)
  const workoutData = extractWorkoutDataForVerification(rawEvent)

  // No workout_id means can't do per-workout validation
  if (!workoutData.workoutId) {
    return null
  }

  // Look up stored verification record
  const { data: stored, error } = await supabase
    .from('workout_verification_codes')
    .select('*')
    .eq('workout_id', workoutData.workoutId)
    .single()

  if (error || !stored) {
    // No stored record - per-workout verification was not used
    // Fall back to legacy validation
    return null
  }

  // Check if code already used (replay attack)
  if (stored.used) {
    console.warn(`Replay attempt: workout ${workoutData.workoutId} code already used`)
    return { status: 'replay', code: verificationCode }
  }

  // Check expiry
  if (new Date() > new Date(stored.expires_at)) {
    console.warn(`Expired verification code for workout ${workoutData.workoutId}`)
    return { status: 'expired', code: verificationCode }
  }

  // Validate code matches stored code
  if (verificationCode !== stored.verification_code) {
    console.warn(`Code mismatch for workout ${workoutData.workoutId}`)
    return { status: 'invalid', code: verificationCode }
  }

  // Recompute canonical hash from submitted data
  const computedHash = buildCanonicalString(
    npub,
    workoutData.workoutId,
    workoutData.exercise || '',
    workoutData.distanceMeters,
    workoutData.durationSeconds,
    workoutData.startTimestamp
  )

  // Validate hash matches (detect data tampering)
  if (computedHash !== stored.canonical_hash) {
    console.warn(`Hash mismatch for workout ${workoutData.workoutId}:`)
    console.warn(`  Stored: ${stored.canonical_hash}`)
    console.warn(`  Computed: ${computedHash}`)
    return { status: 'tampered', code: verificationCode }
  }

  // Mark code as used to prevent replay
  const { error: updateError } = await supabase
    .from('workout_verification_codes')
    .update({ used: true })
    .eq('workout_id', workoutData.workoutId)

  if (updateError) {
    console.error(`Failed to mark verification code as used: ${updateError.message}`)
    // Continue anyway - better to accept than reject due to update failure
  }

  console.log(`Per-workout verification passed for workout ${workoutData.workoutId}`)
  return { status: 'verified', code: verificationCode }
}

/**
 * Validate verification code against server-side computed code
 * First tries per-workout validation, then falls back to legacy per-user validation
 */
async function validateVerificationCode(
  npub: string,
  rawEvent: Record<string, unknown>,
  supabase?: ReturnType<typeof createClient>
): Promise<{ status: VerificationStatus; code: string | null }> {
  const { verificationCode, clientVersion } = extractVerificationData(rawEvent)

  // Try per-workout validation first (if supabase client provided)
  if (supabase) {
    const perWorkoutResult = await validatePerWorkoutCode(supabase, npub, rawEvent)
    if (perWorkoutResult) {
      return perWorkoutResult
    }
  }

  // Fall back to legacy per-user validation
  // No verification code provided - could be old app version or non-RUNSTR client
  if (!verificationCode) {
    return { status: 'unverified', code: null }
  }

  // No client version - can't validate
  if (!clientVersion) {
    return { status: 'unverified', code: verificationCode }
  }

  // Get secret for this version
  const secretKey = `VERIFICATION_SECRET_${clientVersion.replace(/\./g, '_')}`
  const secret = Deno.env.get(secretKey)

  if (!secret) {
    // Unknown version - treat as unverified (not invalid)
    // This handles versions before verification was implemented
    console.log(`No verification secret for version ${clientVersion}`)
    return { status: 'unverified', code: verificationCode }
  }

  // Recompute expected code (legacy: per-user)
  const expectedCode = await generateHmacCode(secret, npub, clientVersion)

  // Compare codes
  if (verificationCode === expectedCode) {
    // Legacy verification passed - but this is now considered weaker
    // Mark as 'legacy' instead of 'verified' for per-user codes
    return { status: 'legacy', code: verificationCode }
  }

  // Code provided but doesn't match - likely forged
  console.warn(`Verification code mismatch for ${npub.slice(0, 12)}... version ${clientVersion}`)
  return { status: 'invalid', code: verificationCode }
}

function validateWorkout(workout: WorkoutSubmission): ValidationResult {
  const limits = BASE_LIMITS[workout.activity_type]

  // Unknown activity type - allow but skip validation
  if (!limits) {
    return { valid: true }
  }

  const distanceKm = (workout.distance_meters || 0) / 1000
  const duration = workout.duration_seconds || 0

  // 0. Empty workout check - both distance and duration are zero/missing
  if (distanceKm === 0 && duration === 0) {
    return {
      valid: false,
      reason: 'Empty workout - no distance or duration recorded'
    }
  }

  // 1. Zero distance with significant duration (forgot to end workout?)
  if (distanceKm === 0 && duration > 1800) {
    return {
      valid: false,
      reason: `Zero distance with ${Math.round(duration / 60)} min duration - possible forgot to end workout`
    }
  }

  // 2. Distance without duration (manual entry without time?)
  if (distanceKm > 0 && duration === 0) {
    return {
      valid: false,
      reason: `${distanceKm.toFixed(2)} km with 0 duration - invalid submission`
    }
  }

  // 3. Max distance check
  if (distanceKm > limits.maxDistanceKm) {
    return {
      valid: false,
      reason: `Distance ${distanceKm.toFixed(1)} km exceeds max ${limits.maxDistanceKm} km for ${workout.activity_type}`
    }
  }

  // 4. Max duration check
  if (duration > limits.maxDurationSeconds) {
    const hours = Math.round(duration / 3600)
    const maxHours = limits.maxDurationSeconds / 3600
    return {
      valid: false,
      reason: `Duration ${hours} hours exceeds max ${maxHours} hours for ${workout.activity_type}`
    }
  }

  // 5. Distance-aware pace validation (only if both distance and duration exist)
  if (distanceKm > 0 && duration > 0) {
    const paceSecondsPerKm = duration / distanceKm

    // Get distance-aware minimum pace
    const minPaceSecondsPerKm = getMinPaceSecondsPerKm(workout.activity_type, distanceKm)

    // Too fast (superhuman speed)
    if (paceSecondsPerKm < minPaceSecondsPerKm) {
      const paceMin = Math.floor(paceSecondsPerKm / 60)
      const paceSec = Math.round(paceSecondsPerKm % 60)
      const minPaceMin = Math.floor(minPaceSecondsPerKm / 60)
      const minPaceSec = Math.round(minPaceSecondsPerKm % 60)
      return {
        valid: false,
        reason: `Pace ${paceMin}:${String(paceSec).padStart(2, '0')}/km too fast for ${distanceKm.toFixed(1)}km ${workout.activity_type} - minimum is ${minPaceMin}:${String(minPaceSec).padStart(2, '0')}/km`
      }
    }

    // Too slow
    if (paceSecondsPerKm > limits.maxPaceSecondsPerKm) {
      const paceMin = Math.floor(paceSecondsPerKm / 60)
      const paceSec = Math.round(paceSecondsPerKm % 60)
      return {
        valid: false,
        reason: `Pace ${paceMin}:${String(paceSec).padStart(2, '0')}/km too slow for ${workout.activity_type}`
      }
    }
  }

  return { valid: true }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const workout: WorkoutSubmission = await req.json()

    // Validate required fields
    if (!workout.event_id || !workout.npub) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: event_id, npub' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is banned
    const { data: banned } = await supabase
      .from('banned_users')
      .select('id, reason')
      .eq('npub', workout.npub)
      .is('expires_at', null) // Permanent ban (no expiry)
      .single()

    // Also check for temporary bans that haven't expired
    const { data: tempBanned } = await supabase
      .from('banned_users')
      .select('id, reason')
      .eq('npub', workout.npub)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (banned || tempBanned) {
      const banInfo = banned || tempBanned
      console.log(`🚫 Banned user attempted submission: ${workout.npub.slice(0, 20)}... - ${banInfo?.reason}`)
      return new Response(
        JSON.stringify({ success: false, error: 'User is banned from leaderboards', banned: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate event_id (deduplication)
    const { data: existing } = await supabase
      .from('workout_submissions')
      .select('id')
      .eq('event_id', workout.event_id)
      .single()

    if (existing) {
      // UPSERT for step submissions: update existing row with latest step count and distance
      const isStepSubmission = workout.event_id.startsWith('steps_')
      if (isStepSubmission) {
        // Basic step validation
        const stepCount = parseStepCount(workout.raw_event)
        if (stepCount && stepCount > 200000) {
          return new Response(
            JSON.stringify({ success: false, reason: 'Step count exceeds daily maximum (200,000)', flagged: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (workout.distance_meters !== null && workout.distance_meters < 0) {
          return new Response(
            JSON.stringify({ success: false, reason: 'Negative distance not allowed', flagged: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabase
          .from('workout_submissions')
          .update({
            distance_meters: workout.distance_meters,
            step_count: stepCount,
            raw_event: workout.raw_event,
          })
          .eq('event_id', workout.event_id)

        if (updateError) {
          console.error('Step upsert error:', updateError)
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ Step submission updated: ${workout.event_id} (${stepCount} steps, ${(workout.distance_meters || 0) / 1000}km)`)
        return new Response(
          JSON.stringify({ success: true, message: 'Step submission updated', duplicate: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Already submitted', duplicate: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also check flagged_workouts to avoid reprocessing rejected submissions
    const { data: existingFlagged } = await supabase
      .from('flagged_workouts')
      .select('id')
      .eq('event_id', workout.event_id)
      .single()

    if (existingFlagged) {
      return new Response(
        JSON.stringify({ success: false, message: 'Previously flagged submission', duplicate: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for time-overlap duplicate
    // If new workout's time range overlaps with any existing workout, it's physically impossible
    // to have done both - so one must be a duplicate (catches app double-publish bugs)
    if (workout.created_at && workout.duration_seconds && workout.npub) {
      const newStart = new Date(workout.created_at).getTime()
      const newEnd = newStart + (workout.duration_seconds * 1000)

      // Query workouts from same user within a reasonable window
      // (new workout start minus max possible duration, to new workout end)
      const maxDuration = 48 * 60 * 60 * 1000 // 48 hours in ms
      const windowStart = new Date(newStart - maxDuration).toISOString()
      const windowEnd = new Date(newEnd).toISOString()

      const { data: nearbyWorkouts } = await supabase
        .from('workout_submissions')
        .select('id, event_id, created_at, duration_seconds')
        .eq('npub', workout.npub)
        .gte('created_at', windowStart)
        .lte('created_at', windowEnd)

      if (nearbyWorkouts && nearbyWorkouts.length > 0) {
        for (const existing of nearbyWorkouts) {
          const existStart = new Date(existing.created_at).getTime()
          const existEnd = existStart + ((existing.duration_seconds || 0) * 1000)

          // Check for overlap: new_start < exist_end AND new_end > exist_start
          if (newStart < existEnd && newEnd > existStart) {
            console.log(`🔄 Time-overlap duplicate: ${workout.event_id} overlaps with ${existing.event_id}`)
            return new Response(
              JSON.stringify({ success: true, message: 'Workout time overlaps with existing workout', duplicate: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      }
    }

    // Auto-classify "other" type workouts (from Apple Health / Health Connect)
    const classifiedActivityType = classifyOtherWorkout(workout)
    const workoutWithClassification = {
      ...workout,
      activity_type: classifiedActivityType,
    }

    // Parse daily leaderboard data from raw_event (needed for all validation paths)
    const distanceKm = (workout.distance_meters || 0) / 1000
    const durationSeconds = workout.duration_seconds || 0
    const splits = parseSplitsFromTags(workout.raw_event)
    const targetTimes = calculateAllTargetTimes(splits, distanceKm, durationSeconds)
    const cyclingTargetTimes = classifiedActivityType === 'cycling'
      ? calculateAllCyclingTargetTimes(splits, distanceKm, durationSeconds)
      : { time_cycling_20k_seconds: null, time_cycling_40k_seconds: null, time_cycling_100k_seconds: null }
    const stepCount = parseStepCount(workout.raw_event)

    // Skip pace/speed anti-cheat for step submissions (duration=0, pace is meaningless)
    const isStepSubmission = workout.event_id.startsWith('steps_')

    if (isStepSubmission) {
      // Basic step validation for new step submissions
      if (stepCount && stepCount > 200000) {
        return new Response(
          JSON.stringify({ success: false, reason: 'Step count exceeds daily maximum (200,000)', flagged: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (workout.distance_meters !== null && workout.distance_meters < 0) {
        return new Response(
          JSON.stringify({ success: false, reason: 'Negative distance not allowed', flagged: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate workout against anti-cheat rules (basic pace/distance/duration checks)
    // Skip for step submissions since they have duration=0 and estimated distance
    const validation = isStepSubmission ? { valid: true } as ValidationResult : validateWorkout(workoutWithClassification)
    if (!validation.valid) {
      // Flag and return early
      const { error: flagError } = await supabase.from('flagged_workouts').insert({
        event_id: workout.event_id,
        npub: workout.npub,
        activity_type: workout.activity_type,
        distance_meters: workout.distance_meters,
        duration_seconds: workout.duration_seconds,
        created_at: workout.created_at,
        reason: validation.reason,
        raw_event: workout.raw_event,
      })
      if (flagError) console.error('Flag insert error:', flagError)
      console.log(`🚫 Workout flagged: ${workout.event_id} - ${validation.reason}`)
      return new Response(
        JSON.stringify({ success: false, reason: validation.reason, flagged: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate target times against world records (catches 5K in 11 min etc.)
    const targetTimeValidation = validateTargetTimes(targetTimes)
    if (!targetTimeValidation.valid) {
      const { error: flagError } = await supabase.from('flagged_workouts').insert({
        event_id: workout.event_id,
        npub: workout.npub,
        activity_type: workout.activity_type,
        distance_meters: workout.distance_meters,
        duration_seconds: workout.duration_seconds,
        created_at: workout.created_at,
        reason: targetTimeValidation.reason,
        raw_event: workout.raw_event,
      })
      if (flagError) console.error('Flag insert error:', flagError)
      console.log(`🚫 Workout flagged: ${workout.event_id} - ${targetTimeValidation.reason}`)
      return new Response(
        JSON.stringify({ success: false, reason: targetTimeValidation.reason, flagged: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate split consistency (catches suspicious split patterns)
    const splitValidation = validateSplitConsistency(splits, durationSeconds, classifiedActivityType)
    if (!splitValidation.valid) {
      const { error: flagError } = await supabase.from('flagged_workouts').insert({
        event_id: workout.event_id,
        npub: workout.npub,
        activity_type: workout.activity_type,
        distance_meters: workout.distance_meters,
        duration_seconds: workout.duration_seconds,
        created_at: workout.created_at,
        reason: splitValidation.reason,
        raw_event: workout.raw_event,
      })
      if (flagError) console.error('Flag insert error:', flagError)
      console.log(`🚫 Workout flagged: ${workout.event_id} - ${splitValidation.reason}`)
      return new Response(
        JSON.stringify({ success: false, reason: splitValidation.reason, flagged: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // All validations passed - insert valid workout
    // Source defaults to 'app' but can be overridden (e.g., 'nostr_scan' for transition scripts)

    // Validate verification code for anti-cheat (per-workout first, then legacy)
    const verificationResult = await validateVerificationCode(workout.npub, workout.raw_event, supabase)
    console.log(`Verification status: ${verificationResult.status} for ${workout.npub.slice(0, 12)}...`)

    // Parse WoT score from tags for fraud prevention gating
    const wotScore = parseWotScore(workout.raw_event)
    console.log(`WoT score: ${wotScore} for ${workout.npub.slice(0, 12)}...`)

    // Get first_seen_at for this npub (tracks account age for fraud prevention)
    // Uses database function to get existing first_seen or current timestamp for new users
    let firstSeenAt: string
    try {
      const { data: firstSeenData, error: firstSeenError } = await supabase
        .rpc('get_or_create_first_seen_at', { user_npub: workout.npub })

      if (firstSeenError) {
        console.warn('Failed to get first_seen_at:', firstSeenError.message)
        firstSeenAt = new Date().toISOString()
      } else {
        firstSeenAt = firstSeenData || new Date().toISOString()
      }
    } catch (e) {
      console.warn('Error calling get_or_create_first_seen_at:', e)
      firstSeenAt = new Date().toISOString()
    }
    console.log(`First seen at: ${firstSeenAt} for ${workout.npub.slice(0, 12)}...`)

      // TIMEZONE FIX: Use client-provided leaderboard_date if available
      // This ensures workouts appear on the correct day in the user's local timezone
      // Fallback to UTC-based calculation for backwards compatibility (nostr_scan, older clients)
      const leaderboardDate = workout.leaderboard_date
        ? workout.leaderboard_date
        : (workout.created_at
          ? new Date(workout.created_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0])

      const { error } = await supabase.from('workout_submissions').insert({
        event_id: workout.event_id,
        npub: workout.npub,
        activity_type: classifiedActivityType, // Use classified type, not original
        distance_meters: workout.distance_meters,
        duration_seconds: workout.duration_seconds,
        calories: workout.calories,
        created_at: workout.created_at,
        raw_event: workout.raw_event,
        verified: true,
        source: workout.source || 'app',
        // Daily leaderboard fields
        splits_json: Object.keys(splits).length > 0 ? splits : null,
        time_5k_seconds: targetTimes.time_5k_seconds,
        time_10k_seconds: targetTimes.time_10k_seconds,
        time_half_seconds: targetTimes.time_half_seconds,
        time_marathon_seconds: targetTimes.time_marathon_seconds,
        time_cycling_20k_seconds: cyclingTargetTimes.time_cycling_20k_seconds,
        time_cycling_40k_seconds: cyclingTargetTimes.time_cycling_40k_seconds,
        time_cycling_100k_seconds: cyclingTargetTimes.time_cycling_100k_seconds,
        step_count: stepCount,
        leaderboard_date: leaderboardDate,
        profile_name: workout.profile_name || null,
        profile_picture: workout.profile_picture || null,
        // Verification fields for anti-cheat leaderboard filtering
        verification_code: verificationResult.code,
        verification_status: verificationResult.status,
        // PPQ.AI team: Store bolt11 invoice for reward payment
        ppq_bolt11: workout.ppq_bolt11 || null,
        ppq_invoice_id: workout.ppq_invoice_id || null,
        // Fraud prevention fields for external reward gating
        wot_score: wotScore,
        first_seen_at: firstSeenAt,
        // Club fields: captain reward routing
        club_id: workout.club_id || null,
        club_lightning_address: workout.club_lightning_address || null,
      })

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      const typeInfo = workout.activity_type !== classifiedActivityType
        ? `${workout.activity_type} → ${classifiedActivityType}`
        : classifiedActivityType
      console.log(`✅ Workout accepted: ${workout.event_id} (${typeInfo}, ${(workout.distance_meters || 0) / 1000}km)`)

      // ================================================================
      // SERVER-SIDE AUTO-JOIN: Join matching RUNSTR competitions
      // Fires after successful insert; never blocks the response.
      // Only joins RUNSTR-wide events (club_id IS NULL), not club events.
      // ================================================================
      try {
        const workoutCreatedAt = workout.created_at || new Date().toISOString()

        const { data: activeCompetitions } = await supabase
          .from('competitions')
          .select('id, name, activity_type, config')
          .is('club_id', null)
          .lte('start_date', workoutCreatedAt)
          .gte('end_date', workoutCreatedAt)

        if (activeCompetitions && activeCompetitions.length > 0) {
          for (const comp of activeCompetitions) {
            // Check activity type match
            const compType = (comp.activity_type || '').toLowerCase()
            const wType = classifiedActivityType.toLowerCase()
            const configTypes = comp.config?.activity_types as string[] | undefined

            let matches = false
            if (configTypes && Array.isArray(configTypes)) {
              matches = configTypes.some((t: string) => t.toLowerCase() === wType)
            } else if (compType === 'any' || compType === 'all') {
              matches = true
            } else {
              matches = compType === wType
            }

            if (!matches) continue

            // Upsert into competition_participants (idempotent)
            const { error: joinErr } = await supabase
              .from('competition_participants')
              .upsert(
                {
                  competition_id: comp.id,
                  npub: workout.npub,
                  name: workout.profile_name || null,
                  picture: workout.profile_picture || null,
                },
                { onConflict: 'competition_id,npub' }
              )

            if (!joinErr) {
              console.log(`🤝 Auto-joined ${workout.npub.slice(0, 12)}... into ${comp.name}`)

              // Fire-and-forget push notification via notify-user edge function
              const supabaseUrl = Deno.env.get('SUPABASE_URL')
              if (supabaseUrl) {
                fetch(`${supabaseUrl}/functions/v1/notify-user`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    npub: workout.npub,
                    title: "You're Competing!",
                    body: `Auto-joined ${comp.name}. Keep going to climb the leaderboard!`,
                    data: { type: 'auto_joined', competition_id: comp.id },
                    channelId: 'default',
                  }),
                }).catch(() => {}) // Fire-and-forget
              }
            }
          }
        }
      } catch (autoJoinErr) {
        // Auto-join is best-effort; never fail the workout submission
        console.warn('Auto-join error (non-fatal):', autoJoinErr)
      }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
