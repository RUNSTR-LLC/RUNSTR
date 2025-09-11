#!/usr/bin/env node

/**
 * Enhanced Nostr Team Discovery Script
 * 
 * Standalone script to test and debug Nostr fitness team discovery.
 * This script connects to multiple Nostr relays to find Kind 33404 fitness team events
 * and provides detailed logging to understand why teams might be filtered out.
 * 
 * Usage: node enhanced-team-discovery.js
 */

const { Relay } = require('nostr-tools');

// Enhanced relay list - more relays for better coverage
const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net', 
  'wss://nostr.wine',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.fmt.wiz.biz',
  'wss://relay.snort.social',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostrich.de',
  'wss://nostr.oxtr.dev'
];

const KIND_FITNESS_TEAM = 33404;

// Enhanced team parsing with better logging
class EnhancedTeamDiscovery {
  constructor() {
    this.discoveredEvents = new Map();
    this.filteredEvents = new Map();
    this.validTeams = new Map();
    this.stats = {
      totalEvents: 0,
      uniqueEvents: 0,
      publicTeams: 0,
      validTeams: 0,
      filteredReasons: new Map()
    };
  }

  async discoverTeams() {
    console.log('🔍 Enhanced Nostr Team Discovery Starting...');
    console.log(`📡 Connecting to ${RELAY_URLS.length} relays for comprehensive team search`);
    
    const filter = {
      kinds: [KIND_FITNESS_TEAM],
      limit: 200 // Increased limit to capture more historical teams
    };

    const relayPromises = RELAY_URLS.map(url => this.connectToRelay(url, filter));
    
    // Wait for all relay connections
    await Promise.allSettled(relayPromises);
    
    // Extended wait for historical events
    console.log('⏳ Waiting 3 seconds for comprehensive historical data collection...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.analyzeResults();
    this.generateReport();
    
    return Array.from(this.validTeams.values());
  }

  async connectToRelay(url, filter) {
    try {
      console.log(`🔌 Connecting to ${url}...`);
      const relay = await Relay.connect(url);
      
      const sub = relay.subscribe([filter], {
        onevent: (event) => this.processEvent(event, url),
        oneose: () => console.log(`✅ EOSE received from ${url}`),
        onclose: () => console.log(`🔌 Connection closed to ${url}`)
      });

      // Extended timeout for better historical data collection
      setTimeout(() => {
        sub.close();
        relay.close();
        console.log(`🔌 Timeout: Closed connection to ${url} after 3s`);
      }, 3000);

    } catch (error) {
      console.warn(`❌ Failed to connect to ${url}:`, error.message);
    }
  }

  processEvent(event, relayUrl) {
    this.stats.totalEvents++;
    
    // Avoid duplicate processing
    if (this.discoveredEvents.has(event.id)) {
      return;
    }
    
    this.discoveredEvents.set(event.id, { event, relayUrl });
    this.stats.uniqueEvents++;
    
    console.log(`📥 Event ${event.id.substring(0, 8)}... from ${relayUrl}`);
    
    try {
      // Parse team data with enhanced logging
      const teamData = this.parseTeamEvent(event);
      
      if (!teamData) {
        this.recordFilterReason(event.id, 'parse_failed');
        return;
      }
      
      // Check if team is public
      if (!this.isTeamPublic(event)) {
        this.recordFilterReason(event.id, 'not_public');
        console.log(`📝 Private team filtered: ${this.getTeamName(event)}`);
        return;
      }
      
      this.stats.publicTeams++;
      
      // Enhanced validation with detailed logging
      const validationResult = this.validateTeam(teamData, event);
      
      if (!validationResult.isValid) {
        this.recordFilterReason(event.id, validationResult.reason);
        console.log(`⚠️  Team filtered (${validationResult.reason}): ${teamData.name}`);
        return;
      }
      
      // Team passed all filters
      this.stats.validTeams++;
      this.validTeams.set(teamData.id, teamData);
      
      console.log(`✅ Valid team discovered: ${teamData.name} (${teamData.memberCount} members)`);
      
    } catch (error) {
      console.warn(`⚠️  Error processing event ${event.id}:`, error.message);
      this.recordFilterReason(event.id, 'processing_error');
    }
  }

  parseTeamEvent(event) {
    try {
      const name = this.getTeamName(event);
      const captain = this.getTeamCaptain(event);
      const teamUUID = this.getTeamUUID(event);
      
      if (!teamUUID) {
        return null;
      }
      
      // Extract team information from tags
      const tags = new Map(event.tags.map(tag => [tag[0], tag.slice(1)]));
      const location = tags.get('location')?.[0];
      
      // Count members from member tags
      const memberTags = event.tags.filter(tag => tag[0] === 'member');
      const memberCount = memberTags.length + 1; // +1 for captain
      
      // Extract activity types
      const activityTags = event.tags.filter(tag => tag[0] === 't');
      const activityTypes = activityTags.map(tag => tag[1]).filter(Boolean);
      
      return {
        id: `${captain}:${teamUUID}`,
        name,
        description: event.content || '', // Allow empty descriptions
        captainId: captain,
        captainNpub: captain,
        memberCount,
        activityType: activityTypes.join(', ') || 'fitness',
        location,
        isPublic: this.isTeamPublic(event),
        createdAt: event.created_at,
        tags: activityTypes,
        nostrEvent: event
      };
    } catch (error) {
      console.warn('Error parsing team event:', error);
      return null;
    }
  }

  validateTeam(team, event) {
    // Much more permissive validation
    
    // Must have a name
    if (!team.name || team.name.trim() === '') {
      return { isValid: false, reason: 'empty_name' };
    }
    
    // Filter obvious test/deleted teams but be more permissive
    const name = team.name.toLowerCase();
    if (name === 'deleted' || name === 'test' || name.startsWith('test ')) {
      return { isValid: false, reason: 'test_or_deleted' };
    }
    
    // Remove age restriction - allow teams of any age
    // (The original 90-day filter was too restrictive)
    
    // Allow teams without descriptions
    // (The original required description filter was too restrictive)
    
    // Must have valid UUID
    if (!this.getTeamUUID(event)) {
      return { isValid: false, reason: 'missing_uuid' };
    }
    
    return { isValid: true, reason: null };
  }

  // Helper methods from original NostrTeamService
  isTeamPublic(event) {
    const publicTag = event.tags.find(tag => tag[0] === 'public');
    return publicTag ? publicTag[1]?.toLowerCase() === 'true' : false;
  }

  getTeamName(event) {
    const nameTag = event.tags.find(tag => tag[0] === 'name');
    return nameTag ? nameTag[1] : 'Unnamed Team';
  }

  getTeamCaptain(event) {
    const captainTag = event.tags.find(tag => tag[0] === 'captain');
    return captainTag ? captainTag[1] : event.pubkey;
  }

  getTeamUUID(event) {
    const dTag = event.tags.find(tag => tag[0] === 'd');
    return dTag ? dTag[1] : undefined;
  }

  recordFilterReason(eventId, reason) {
    const current = this.stats.filteredReasons.get(reason) || 0;
    this.stats.filteredReasons.set(reason, current + 1);
    
    this.filteredEvents.set(eventId, reason);
  }

  analyzeResults() {
    console.log('\n📊 DISCOVERY ANALYSIS');
    console.log('='.repeat(50));
    
    console.log(`📡 Total events received: ${this.stats.totalEvents}`);
    console.log(`🔄 Unique events: ${this.stats.uniqueEvents}`);
    console.log(`🌍 Public teams found: ${this.stats.publicTeams}`);
    console.log(`✅ Valid teams after filtering: ${this.stats.validTeams}`);
    
    console.log('\n🚫 FILTER BREAKDOWN:');
    for (const [reason, count] of this.stats.filteredReasons.entries()) {
      console.log(`   ${reason}: ${count} teams`);
    }
    
    console.log('\n📋 RELAY PERFORMANCE:');
    const relayStats = new Map();
    for (const [eventId, {relayUrl}] of this.discoveredEvents.entries()) {
      const current = relayStats.get(relayUrl) || 0;
      relayStats.set(relayUrl, current + 1);
    }
    
    for (const [relay, count] of relayStats.entries()) {
      console.log(`   ${relay}: ${count} events`);
    }
  }

  generateReport() {
    console.log('\n🏆 DISCOVERED TEAMS');
    console.log('='.repeat(50));
    
    if (this.validTeams.size === 0) {
      console.log('❌ No valid teams found. This suggests either:');
      console.log('   • Relays don\'t have fitness team events');
      console.log('   • Teams are private (not marked public:true)');
      console.log('   • Filters are still too restrictive');
      console.log('   • Network connectivity issues');
      return;
    }
    
    let index = 1;
    for (const [teamId, team] of this.validTeams.entries()) {
      console.log(`\n${index}. ${team.name}`);
      console.log(`   ID: ${teamId}`);
      console.log(`   Captain: ${team.captainId.substring(0, 16)}...`);
      console.log(`   Members: ${team.memberCount}`);
      console.log(`   Activity: ${team.activityType}`);
      console.log(`   Location: ${team.location || 'Not specified'}`);
      console.log(`   Created: ${new Date(team.createdAt * 1000).toLocaleDateString()}`);
      console.log(`   Description: ${team.description.substring(0, 100)}${team.description.length > 100 ? '...' : ''}`);
      index++;
    }
    
    console.log(`\n🎯 SUCCESS: Found ${this.validTeams.size} valid fitness teams!`);
    
    if (this.validTeams.size >= 10) {
      console.log('✅ Target of 10+ teams achieved!');
    } else {
      console.log(`⚠️  Found ${this.validTeams.size} teams, target was 10-13`);
      console.log('   Consider adjusting filters or checking relay connectivity');
    }
  }
}

// Main execution
async function main() {
  try {
    const discovery = new EnhancedTeamDiscovery();
    const teams = await discovery.discoverTeams();
    
    console.log(`\n🏁 Discovery completed. Found ${teams.length} teams.`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Discovery interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { EnhancedTeamDiscovery };