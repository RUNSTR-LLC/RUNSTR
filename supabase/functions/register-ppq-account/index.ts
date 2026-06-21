/**
 * Supabase Edge Function: register-ppq-account
 *
 * The ONLY path by which a user's PPQ.AI key enters the ppq_accounts table.
 * Verifies a NIP-98 (kind 27235) signature proving the request was signed by
 * the npub's owner, then upserts { npub, api_key, credit_id } with service-role.
 *
 * Security: ppq_accounts is RLS deny-all to the public anon key. No nsec ever
 * reaches this function — only the user's signature is sent. A PPQ.AI key
 * controls only AI credits (no withdrawal).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyNip98 } from './nip98.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { npub, api_key, credit_id } = await req.json();

    if (!npub || !npub.startsWith('npub1') || npub.length < 60) {
      return json({ error: 'Invalid npub' }, 400);
    }
    if (!api_key || !credit_id) {
      return json({ error: 'api_key and credit_id required' }, 400);
    }

    // NIP-98 proof of ownership. The url must match exactly what the client signed.
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/register-ppq-account`;
    const proof = await verifyNip98({
      authHeader: req.headers.get('Authorization'),
      url: functionUrl,
      method: 'POST',
      expectedNpub: npub,
    });
    if (!proof.valid) {
      console.warn('[register-ppq-account] NIP-98 rejected:', proof.reason);
      return json({ error: 'ownership proof failed' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('ppq_accounts')
      .upsert({ npub, api_key, credit_id, updated_at: new Date().toISOString() }, { onConflict: 'npub' });

    if (error) {
      console.error('[register-ppq-account] upsert failed:', error.message);
      return json({ error: 'storage failed' }, 500);
    }

    console.log('[register-ppq-account] stored key for', npub.slice(0, 12) + '...');
    return json({ success: true }, 200);
  } catch (e) {
    console.error('[register-ppq-account] error:', e instanceof Error ? e.message : e);
    return json({ error: 'bad request' }, 400);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
