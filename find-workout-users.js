#!/usr/bin/env node

/**
 * Find users with actual 1301 workout events for testing
 */

import { SimplePool } from 'nostr-tools';

const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net', 
  'wss://nos.lol',
];

async function findWorkoutUsers() {
  const pool = new SimplePool();
  
  console.log('🔍 Searching for users with 1301 workout events...');
  
  try {
    // Query for recent 1301 events to find active users
    const events = await pool.querySync(RELAY_URLS, {
      kinds: [1301],
      limit: 100,
      since: Math.floor(Date.now()/1000) - 30*24*60*60 // Last 30 days
    });
    
    console.log(`📥 Found ${events.length} recent 1301 events`);
    
    // Count events per user
    const userCounts = {};
    const userSamples = {};
    
    events.forEach(event => {
      const pubkey = event.pubkey;
      userCounts[pubkey] = (userCounts[pubkey] || 0) + 1;
      
      // Store a sample event for each user
      if (!userSamples[pubkey]) {
        userSamples[pubkey] = {
          content: event.content?.slice(0, 100) + '...',
          tags: event.tags?.slice(0, 5),
          created_at: new Date(event.created_at * 1000).toLocaleDateString()
        };
      }
    });
    
    // Sort users by event count
    const sortedUsers = Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10 users
    
    console.log('\n🏃‍♂️ Top users with 1301 workout events:');
    console.log('=' .repeat(60));
    
    sortedUsers.forEach(([pubkey, count], index) => {
      const sample = userSamples[pubkey];
      console.log(`${index + 1}. ${pubkey.slice(0, 16)}... (${count} events)`);
      console.log(`   Sample: ${sample.content}`);
      console.log(`   Tags: ${JSON.stringify(sample.tags)}`);
      console.log(`   Latest: ${sample.created_at}`);
      console.log('');
    });
    
    if (sortedUsers.length > 0) {
      const topUser = sortedUsers[0][0];
      console.log(`🎯 Best test candidate: ${topUser}`);
      console.log(`📊 Has ${sortedUsers[0][1]} workout events in last 30 days`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.close(RELAY_URLS);
  }
}

findWorkoutUsers().catch(console.error);