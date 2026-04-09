/**
 * Diagnostic: Check push notification pipeline health
 *
 * Verifies:
 * 1. broadcast_tokens table has active tokens with token_key set
 * 2. For a given npub, the SHA256 hash matches a registered token
 * 3. Sends a test push notification to verify Expo delivery
 *
 * Usage:
 *   npx tsx scripts/diagnostics/check-push-notifications.ts
 *   npx tsx scripts/diagnostics/check-push-notifications.ts --send-test
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set these env vars or use: source .env && npx tsx scripts/diagnostics/check-push-notifications.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const sendTest = process.argv.includes('--send-test');

async function sha256(input: string): Promise<string> {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function main() {
  console.log('=== Push Notification Diagnostic ===\n');

  // 1. Check broadcast_tokens table
  console.log('1. Checking broadcast_tokens table...');
  const { data: allTokens, error: allErr } = await supabase
    .from('broadcast_tokens')
    .select('id, token, token_key, platform, is_active')
    .eq('is_active', true);

  if (allErr) {
    console.error('   ERROR querying broadcast_tokens:', allErr.message);
    return;
  }

  console.log(`   Active tokens: ${allTokens?.length || 0}`);

  if (!allTokens || allTokens.length === 0) {
    console.error('   NO ACTIVE TOKENS FOUND - push notifications will not work');
    console.error('   The app must be opened on a physical device to register a token');
    return;
  }

  const withKey = allTokens.filter(t => t.token_key);
  const withoutKey = allTokens.filter(t => !t.token_key);

  console.log(`   With token_key (per-user push): ${withKey.length}`);
  console.log(`   Without token_key (broadcast only): ${withoutKey.length}`);

  if (withoutKey.length > 0) {
    console.warn('\n   WARNING: Tokens without token_key cannot receive reward notifications:');
    for (const t of withoutKey) {
      console.warn(`     - ${t.token.slice(0, 30)}... (${t.platform})`);
    }
    console.warn('   FIX: User needs to open the app while logged in to register token_key');
  }

  // 2. Show registered users (hashed)
  console.log('\n2. Registered per-user push targets:');
  for (const t of withKey) {
    console.log(`   token_key: ${t.token_key!.slice(0, 16)}... | platform: ${t.platform} | token: ${t.token.slice(0, 25)}...`);
  }

  // 3. Test with a known npub
  console.log('\n3. To verify a specific user, set NPUB env var:');
  const testNpub = process.env.NPUB;
  if (testNpub) {
    const hash = await sha256(testNpub);
    console.log(`   npub: ${testNpub.slice(0, 20)}...`);
    console.log(`   SHA256: ${hash}`);

    const match = withKey.find(t => t.token_key === hash);
    if (match) {
      console.log(`   MATCH FOUND - token registered for ${match.platform}`);
      console.log(`   Token: ${match.token.slice(0, 30)}...`);

      // 4. Send test push
      if (sendTest) {
        console.log('\n4. Sending test push notification...');
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: match.token,
            sound: 'default',
            title: 'RUNSTR Push Test',
            body: 'If you see this, push notifications are working!',
            data: { type: 'test' },
            channelId: 'bitcoin_rewards',
          }),
        });

        const pushResult = await pushResponse.json();
        console.log('   Expo Push API response:', JSON.stringify(pushResult, null, 2));

        if (pushResult.data?.status === 'ok') {
          console.log('   SUCCESS - Push accepted by Expo. Check your device!');
        } else if (pushResult.data?.status === 'error') {
          console.error('   FAILED:', pushResult.data.message);
          if (pushResult.data.details?.error === 'DeviceNotRegistered') {
            console.error('   The push token is stale. User needs to reopen the app.');
          } else if (pushResult.data.details?.error === 'InvalidCredentials') {
            console.error('   APNs credentials not configured in Expo project!');
            console.error('   Run: eas credentials to set up APNs key');
          }
        }
      } else {
        console.log('\n   Run with --send-test to send a test push to this device');
      }
    } else {
      console.error(`   NO MATCH - no token registered for this npub`);
      console.error(`   Expected token_key: ${hash}`);
      console.error('   Available keys:', withKey.map(t => t.token_key!.slice(0, 16) + '...').join(', '));
    }
  } else {
    console.log('   NPUB=npub1abc... npx tsx scripts/diagnostics/check-push-notifications.ts');
  }

  // 5. Check notify-user function is deployed
  console.log('\n5. Checking notify-user function is reachable...');
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/notify-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ npub: 'test', title: 'test', body: 'test' }),
    });
    const result = await res.json();
    // It should return { sent: false, error: 'no_tokens' } since 'test' won't match any hash
    if (result.sent === false && result.error === 'no_tokens') {
      console.log('   notify-user function is deployed and responding correctly');
    } else if (result.sent === false) {
      console.log(`   notify-user responded: ${result.error}`);
    } else {
      console.log('   Unexpected response:', result);
    }
  } catch (err) {
    console.error('   notify-user function NOT REACHABLE:', (err as Error).message);
    console.error('   Deploy it with: supabase functions deploy notify-user');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
