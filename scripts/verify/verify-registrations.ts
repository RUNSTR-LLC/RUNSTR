/**
 * Verify Season 2 participant registrations in Supabase
 */
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const COMPETITION_IDS: Record<string, string> = {
  'season2-running': '021fbe4a-8d89-4fa2-b9dc-8499f86143ee',
  'season2-walking': '205b0af3-db18-4ae9-9369-902e93a336a5',
  'season2-cycling': 'de780779-a889-423a-96b7-86eb0748c29d',
};

const OPENMIKE_NPUB = 'npub1a6c3jcdj23ptzcuflek8a04f4hc2cdkat95pd6n3r8jjrwyzrw0q43lfrr';

async function main() {
  for (const [name, id] of Object.entries(COMPETITION_IDS)) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/competition_participants?select=npub&competition_id=eq.${id}`,
      {
        headers: {
          'apikey': SUPABASE_KEY!,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const data = await res.json();
    const hasOpenMike = data.some((r: any) => r.npub === OPENMIKE_NPUB);
    console.log(`${name}: ${data.length} participants | OpenMike: ${hasOpenMike ? 'YES' : 'NO'}`);
  }
}

main().catch(console.error);
