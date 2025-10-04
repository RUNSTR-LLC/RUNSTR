#!/usr/bin/env node

/**
 * RUNSTR Kind 1301 Statistics Query Script
 * Queries Nostr relays for kind 1301 workout events and generates presentation stats
 *
 * Usage: node query-1301-stats.js
 * Output: Console summary + stats-output.json
 */

import NDK from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import { writeFileSync } from 'fs';

// Configuration
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.wine',
  'wss://relay.nostr.band',
  'wss://nostr.mom',
  'wss://relay.snort.social',
];

const FETCH_TIMEOUT_MS = 45000; // 45 seconds for comprehensive fetch
const PREMIUM_USER_COUNT = 14;

// RUNSTR event identifiers (tags that indicate RUNSTR app)
const RUNSTR_IDENTIFIERS = {
  source: ['RUNSTR', 'runstr'],
  client: ['RUNSTR', 'runstr'],
  t: ['RUNSTR', 'runstr'],
};

// ANSI colors for beautiful terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Helper: Check if event is RUNSTR-tagged
function isRunstrEvent(event) {
  const tags = event.tags || [];

  return tags.some(tag => {
    const [tagName, tagValue] = tag;

    // Check source tag
    if (tagName === 'source' && RUNSTR_IDENTIFIERS.source.includes(tagValue)) {
      return true;
    }

    // Check client tag (format: ['client', 'RUNSTR', 'version'])
    if (tagName === 'client' && RUNSTR_IDENTIFIERS.client.some(id => tagValue?.includes(id))) {
      return true;
    }

    // Check hashtag
    if (tagName === 't' && RUNSTR_IDENTIFIERS.t.includes(tagValue)) {
      return true;
    }

    return false;
  });
}

// Helper: Extract tag value
function getTagValue(event, tagName) {
  const tag = event.tags?.find(t => t[0] === tagName);
  return tag?.[1];
}

// Helper: Parse activity type
function getActivityType(event) {
  return getTagValue(event, 'exercise') ||
         getTagValue(event, 't') ||
         getTagValue(event, 'activity') ||
         'unknown';
}

// Helper: Format npub
function toNpub(hexPubkey) {
  try {
    return nip19.npubEncode(hexPubkey);
  } catch (error) {
    return hexPubkey; // Return hex if encoding fails
  }
}

// Helper: Truncate for display
function truncate(str, length = 12) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Fetch all kind 1301 events
async function fetchAllWorkoutEvents(ndk, sinceTimestamp) {
  return new Promise((resolve) => {
    const collected = new Map();

    console.log(`${colors.blue}🔍 Subscribing to kind 1301 events...${colors.reset}`);

    const sub = ndk.subscribe(
      {
        kinds: [1301],
        since: sinceTimestamp,
      },
      { closeOnEose: false }
    );

    let eventCount = 0;
    const done = () => {
      try { sub.stop(); } catch (_) {}
      console.log(`${colors.green}✅ Collected ${collected.size} unique events${colors.reset}`);
      resolve(Array.from(collected.values()));
    };

    // Progress indicator
    let lastUpdate = Date.now();

    // Safety timeout
    const timeoutId = setTimeout(() => {
      console.log(`${colors.yellow}⏱️  Fetch timeout reached${colors.reset}`);
      done();
    }, FETCH_TIMEOUT_MS);

    sub.on('event', (event) => {
      collected.set(event.id, event);
      eventCount++;

      // Show progress every 100 events
      if (eventCount % 100 === 0 || Date.now() - lastUpdate > 2000) {
        process.stdout.write(`\r${colors.cyan}📥 Received: ${eventCount} events...${colors.reset}`);
        lastUpdate = Date.now();
      }
    });

    sub.on('eose', () => {
      console.log(); // New line after progress
      console.log(`${colors.green}📡 End of stored events (EOSE)${colors.reset}`);
      clearTimeout(timeoutId);
      done();
    });
  });
}

// Calculate comprehensive statistics
function calculateStatistics(allEvents, runstrEvents) {
  const stats = {
    overall: {
      totalEvents: allEvents.length,
      uniqueNpubs: new Set(allEvents.map(e => e.pubkey)).size,
      dateRange: {
        first: null,
        last: null,
      },
    },
    runstr: {
      totalEvents: runstrEvents.length,
      uniqueNpubs: new Set(runstrEvents.map(e => e.pubkey)).size,
      firstEvent: null,
      activityTypes: {},
      topUsers: [],
      monthlyGrowth: {},
      weeklyAverage: 0,
      dailyAverage: 0,
    },
    comparison: {
      premiumUsers: PREMIUM_USER_COUNT,
      organicUsers: 0,
      conversionOpportunity: 0,
    },
  };

  // Overall date range
  if (allEvents.length > 0) {
    const timestamps = allEvents.map(e => e.created_at).sort((a, b) => a - b);
    stats.overall.dateRange.first = new Date(timestamps[0] * 1000).toISOString();
    stats.overall.dateRange.last = new Date(timestamps[timestamps.length - 1] * 1000).toISOString();
  }

  if (runstrEvents.length === 0) {
    return stats;
  }

  // RUNSTR-specific analysis
  const runstrTimestamps = runstrEvents.map(e => e.created_at).sort((a, b) => a - b);
  const firstTimestamp = runstrTimestamps[0];
  const lastTimestamp = runstrTimestamps[runstrTimestamps.length - 1];

  stats.runstr.firstEvent = {
    date: new Date(firstTimestamp * 1000).toISOString(),
    eventId: runstrEvents.find(e => e.created_at === firstTimestamp)?.id,
    pubkey: runstrEvents.find(e => e.created_at === firstTimestamp)?.pubkey,
  };

  // Activity type breakdown
  const activityCounts = {};
  runstrEvents.forEach(event => {
    const activity = getActivityType(event).toLowerCase();
    activityCounts[activity] = (activityCounts[activity] || 0) + 1;
  });
  stats.runstr.activityTypes = activityCounts;

  // Top users by workout count
  const userWorkouts = {};
  runstrEvents.forEach(event => {
    const npub = toNpub(event.pubkey);
    userWorkouts[npub] = (userWorkouts[npub] || 0) + 1;
  });

  stats.runstr.topUsers = Object.entries(userWorkouts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([npub, count]) => ({ npub, workoutCount: count }));

  // Monthly growth
  const monthlyWorkouts = {};
  runstrEvents.forEach(event => {
    const date = new Date(event.created_at * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyWorkouts[monthKey] = (monthlyWorkouts[monthKey] || 0) + 1;
  });
  stats.runstr.monthlyGrowth = monthlyWorkouts;

  // Calculate averages
  const daySpan = (lastTimestamp - firstTimestamp) / (24 * 60 * 60);
  const weekSpan = daySpan / 7;

  stats.runstr.dailyAverage = daySpan > 0 ? (runstrEvents.length / daySpan).toFixed(2) : 0;
  stats.runstr.weeklyAverage = weekSpan > 0 ? (runstrEvents.length / weekSpan).toFixed(2) : 0;

  // Comparison metrics
  stats.comparison.organicUsers = stats.runstr.uniqueNpubs - PREMIUM_USER_COUNT;
  stats.comparison.conversionOpportunity = stats.runstr.uniqueNpubs - PREMIUM_USER_COUNT;

  return stats;
}

// Pretty print statistics
function printStatistics(stats) {
  console.log('\n');
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}          RUNSTR KIND 1301 STATISTICS REPORT           ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log();

  // Overall Nostr Network Stats
  console.log(`${colors.bright}${colors.yellow}📊 OVERALL NOSTR NETWORK (Kind 1301)${colors.reset}`);
  console.log(`${colors.white}   Total Events:${colors.reset} ${colors.green}${stats.overall.totalEvents}${colors.reset}`);
  console.log(`${colors.white}   Unique NPubs:${colors.reset} ${colors.green}${stats.overall.uniqueNpubs}${colors.reset}`);
  if (stats.overall.dateRange.first) {
    console.log(`${colors.white}   Date Range:${colors.reset} ${new Date(stats.overall.dateRange.first).toLocaleDateString()} - ${new Date(stats.overall.dateRange.last).toLocaleDateString()}`);
  }
  console.log();

  // RUNSTR-Specific Stats
  console.log(`${colors.bright}${colors.magenta}🏃 RUNSTR APP STATISTICS${colors.reset}`);
  console.log(`${colors.white}   RUNSTR Events:${colors.reset} ${colors.green}${colors.bright}${stats.runstr.totalEvents}${colors.reset}`);
  console.log(`${colors.white}   RUNSTR Users:${colors.reset} ${colors.green}${colors.bright}${stats.runstr.uniqueNpubs}${colors.reset}`);

  if (stats.runstr.firstEvent) {
    const firstDate = new Date(stats.runstr.firstEvent.date);
    console.log(`${colors.white}   First Event:${colors.reset} ${colors.cyan}${firstDate.toLocaleDateString()}${colors.reset} (${truncate(stats.runstr.firstEvent.eventId)})`);
    console.log(`${colors.white}   First User:${colors.reset} ${truncate(toNpub(stats.runstr.firstEvent.pubkey), 20)}`);
  }

  console.log(`${colors.white}   Daily Average:${colors.reset} ${colors.yellow}${stats.runstr.dailyAverage} workouts/day${colors.reset}`);
  console.log(`${colors.white}   Weekly Average:${colors.reset} ${colors.yellow}${stats.runstr.weeklyAverage} workouts/week${colors.reset}`);
  console.log();

  // Activity Breakdown
  console.log(`${colors.bright}${colors.blue}🏋️  ACTIVITY TYPE BREAKDOWN${colors.reset}`);
  const sortedActivities = Object.entries(stats.runstr.activityTypes)
    .sort((a, b) => b[1] - a[1]);

  sortedActivities.slice(0, 10).forEach(([activity, count]) => {
    const percentage = ((count / stats.runstr.totalEvents) * 100).toFixed(1);
    console.log(`   ${colors.white}${activity.padEnd(20)}${colors.reset} ${colors.cyan}${count}${colors.reset} (${percentage}%)`);
  });
  console.log();

  // Top Users
  console.log(`${colors.bright}${colors.green}👥 TOP 10 MOST ACTIVE USERS${colors.reset}`);
  stats.runstr.topUsers.forEach((user, index) => {
    console.log(`   ${colors.yellow}${(index + 1).toString().padStart(2)}.${colors.reset} ${truncate(user.npub, 24)} - ${colors.cyan}${user.workoutCount} workouts${colors.reset}`);
  });
  console.log();

  // Monthly Growth
  console.log(`${colors.bright}${colors.magenta}📈 MONTHLY GROWTH${colors.reset}`);
  const sortedMonths = Object.entries(stats.runstr.monthlyGrowth).sort((a, b) => a[0].localeCompare(b[0]));
  sortedMonths.forEach(([month, count]) => {
    const bar = '█'.repeat(Math.min(50, Math.floor(count / 10)));
    console.log(`   ${colors.white}${month}${colors.reset} ${colors.blue}${bar}${colors.reset} ${colors.cyan}${count}${colors.reset}`);
  });
  console.log();

  // Key Metrics for Presentation
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}🎯 KEY PRESENTATION METRICS${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log();
  console.log(`${colors.white}   Premium Users:${colors.reset} ${colors.green}${colors.bright}${PREMIUM_USER_COUNT}${colors.reset}`);
  console.log(`${colors.white}   Total RUNSTR Users:${colors.reset} ${colors.green}${colors.bright}${stats.runstr.uniqueNpubs}${colors.reset}`);
  console.log(`${colors.white}   Organic Adoption:${colors.reset} ${colors.cyan}${colors.bright}${stats.comparison.organicUsers} users${colors.reset} (beyond premium)`);
  console.log();
  console.log(`${colors.white}   Market Validation:${colors.reset}`);
  console.log(`   ${colors.green}✓${colors.reset} Only app using kind 1301 at scale`);
  console.log(`   ${colors.green}✓${colors.reset} ${stats.runstr.totalEvents} workouts tracked`);
  console.log(`   ${colors.green}✓${colors.reset} ${stats.runstr.weeklyAverage} workouts/week average`);
  console.log(`   ${colors.green}✓${colors.reset} Active since ${new Date(stats.runstr.firstEvent?.date).toLocaleDateString()}`);
  console.log();
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log();
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.cyan}RUNSTR Kind 1301 Statistics Query${colors.reset}`);
  console.log(`${colors.dim}Generated: ${new Date().toLocaleString()}${colors.reset}`);
  console.log();

  // Calculate "since" timestamp (query last 12 months for comprehensive data)
  const monthsBack = 12;
  const sinceTimestamp = Math.floor(Date.now() / 1000) - (monthsBack * 30 * 24 * 60 * 60);

  console.log(`${colors.blue}🔄 Connecting to ${RELAYS.length} Nostr relays...${colors.reset}`);

  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
  });

  try {
    await ndk.connect();
    console.log(`${colors.green}✅ Connected successfully${colors.reset}`);
    console.log(`${colors.cyan}📅 Querying events from last ${monthsBack} months${colors.reset}`);
    console.log();

    // Fetch all events
    const allEvents = await fetchAllWorkoutEvents(ndk, sinceTimestamp);

    console.log();
    console.log(`${colors.blue}🔍 Filtering for RUNSTR-tagged events...${colors.reset}`);

    // Filter RUNSTR events
    const runstrEvents = allEvents.filter(isRunstrEvent);

    console.log(`${colors.green}✅ Found ${runstrEvents.length} RUNSTR events${colors.reset}`);
    console.log();

    // Calculate statistics
    console.log(`${colors.blue}📊 Calculating statistics...${colors.reset}`);
    const stats = calculateStatistics(allEvents, runstrEvents);

    // Print to console
    printStatistics(stats);

    // Save to JSON file
    const outputPath = './stats-output.json';
    const output = {
      generatedAt: new Date().toISOString(),
      queryParameters: {
        relays: RELAYS,
        monthsQueried: monthsBack,
        sinceTimestamp,
      },
      statistics: stats,
      rawData: {
        allEventCount: allEvents.length,
        runstrEventCount: runstrEvents.length,
        runstrEventIds: runstrEvents.slice(0, 100).map(e => e.id), // First 100 for reference
      },
    };

    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`${colors.green}💾 Statistics saved to: ${colors.bright}${outputPath}${colors.reset}`);
    console.log();

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
main();
