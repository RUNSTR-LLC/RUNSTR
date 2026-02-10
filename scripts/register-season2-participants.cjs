/**
 * Register all Season II participants in the competition_participants table
 *
 * This ensures all hardcoded participants appear on leaderboards
 * even if they haven't explicitly joined via the app.
 */

require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// All Season II participants (npubs) - SYNCED from src/constants/season2.ts (source of truth)
const SEASON_2_PARTICIPANTS = [
  'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum', // TheWildHustle
  'npub1w30t22wsuskjlfkfqjau9sg8qt02a9jtfhfs0xqr4w95x5mdmgfqghvnqu', // guy
  'npub1mtnnlhvsmxxmr2zqt08v43sv6m8g6yyfdf4zchsyqygjtctv6seqp93ten', // Lhasa Sensei
  'npub1gvjkhsy9j33v79860hjeffyt40033xu34038lzxcyj4ldxerg0yss3qlym', // LOPES
  'npub1ul0kylrr3kf5kd653kzq3dpach28vtazwrpx40k9j94l7c42eqxsstw6df', // KjetilR
  'npub1jdvvva54m8nchh3t708pav99qk24x6rkx2sh0e7jthh0l8efzt7q9y7jlj', // Kamo Weasel
  'npub1ex2rmruwns42n7ktdete4ahv8zmjqhq9wr0pkraclx0kthzl0phq8csq9m', // Zed
  'npub1ddp28v38kzrws58lvkdp2xrrecrsadsdx2aw3frp3y5x2hhlc0mqtzvsf9', // JokerHasse
  'npub1psjjcyuwu3rtd7wqje8lvzfcplyzu5kg6vv999s872flehuz304qmz4l7p', // Busch21
  'npub1ezezhqv80649fcdty83esf8ctg57v8m3m20m4wl03yctzude3k5q5a4tlz', // Hoov
  'npub13n5htata6pcvg2fllruh3wrfug9jeh6vs8e80dr0xemtyck9aq3sfhp723', // clemsy
  'npub1nl8r463jkdtr0qu0k3dht03jt9t59cttk0j8gtxg9wea2russlnq2zf9d0', // MAKE SONGS LONGER
  'npub1u53hqga9czffu7hqu5fg6sdgyycnssqwcygdh6wc52f83u3t0sfstpnzt7', // Helen Yrmom
  'npub1qfe57xw2u7zsu772ds9zhd49xnc494dvhkrwansa90aat4jsyqpssngt8g', // bitcoin_rene
  'npub1jw0lknj49m2up7ncpxz6kutr73qhnpqf4elds8rzcpavg6pmgg3qwxuhwk', // Johan
  'npub1tfj5kcu5hwp7esdet7zg667yfekjzysduhvrypq8qnvcywevpt6qkc2lh4', // Drew
  'npub1t4q9w5kpknwaqu2t4u7wg9wm2tj4qcpk7dzl7467u9hzkn833xlskuf4sn', // Heiunter
  'npub1zn9f0j4w59t9mslcyaeef28h6qekgaz635v9xmvyy0d6c0ek8dlsqk87vm', // Satty
  'npub1meatjvk2zunckg2y5e3gcdf35p3glnrmtqr5zywkuku5nm9sudmstwnglh', // Harambe's last Bitcoin
  'npub14q8uffuxxnhzd24u4j23kn8a0dt2ux96h5eutt7u76lddhyqa0gs97ct2x', // Uno
  'npub15u3cqhx6vuj3rywg0ph5mfv009lxja6cyvqn2jagaydukq6zmjwqex05rq', // Seth
  'npub1pt5ach6zl673r3wgjkc27za6h0szyc2erv8jfmh7ytqdnj5dq2rquawufz', // MoonKaptain
  'npub1ltvqkaz3kqlksm7eujrmqkmfcpxgpr3x58dk2hjeur3fdfwf7nws8szhw6', // means
  'npub14yzxejghthz6ghae8gkgjru63vvvwpl6d454wud2hycqpqwnugdqcutuw5', // Ben Cousens
  'npub1yrffsyxk5hujkpz6mcpwhwkujqmdwswvdp4sqs2ug26zxmly45hsfpn8p0', // negr0
  'npub1ag5y3zm9n2myxvt8e5pyadewqx3httqhee22rnwxuhww9ake8y3slsekr3', // johnny9
  'npub1cmc0gfulzgsq7alpjs7dy64wmasgrldgtptft7dfyw68yd5xmgfqaf9e4n', // Tumbleweed
  'npub1vcfs2z24y2sc5yy4k7uxsa80vxx6n3w3hf054um4dz8zz2wqwvtsgtkxyw', // Ajax
  'npub1jva9yqypze6re4jjajj8yz040ex2f3pemrp9ymvvfzj8hac89mrszp5ev6', // Nell
  'npub1xyh4fksd588seh836cu9l2xkuhvzrrm3yg5h6v9jyjpwmtdygeysgf47df', // HumbleStacker
  'npub1jstpzth68nwqvag4dextdtjxktx22xtnqewxr09uqqk2n8jaeheq5afdtj', // Lat51_Training
  'npub1patrlck0muvqevgytp4etpen0xsvrlw0hscp4qxgy40n852lqwwsz79h9a', // Patrick
  'npub1mpz30qp2gdr403t2apjzhla56fh94hs8zgznw5pp26q0tztw27dsu60pxm', // ObjectiF MooN
  'npub1a6c3jcdj23ptzcuflek8a04f4hc2cdkat95pd6n3r8jjrwyzrw0q43lfrr', // OpenMike
  'npub1sxu32sx6amsrrhesj3s2n084se49f3czzll3ww7dalgestcjkzaqfa3ftn', // Aaron Tomac
  'npub106auuxzr597dw799u95785hk0866c763yhgug0fxtcvs77e82wxqsac5uf', // Adrien Lacombe
  'npub1z7g4fs4nqgn90zs543dqrag28m77352qxt0evdc42rsjzrllmzfqdl96ge', // Awakening Mind
  'npub1ra5ch494mk5qgvt0p9mnlypu56vu7ke2plx4k0lxupcfv6x43esqre4rvx', // Dani
  'npub1smm7agrxm4xu2axsrv8ex9aqx5ygslupt76cmrhkdpeucsh7xscsd8zl76', // Taljarn
  'npub1qsvv5ttv6mrlh38q8ydmw3gzwq360mdu8re2vr7rk68sqmhmsh4svhsft3', // saiy2k
  'npub1243jnepytmzg38pnk2fx9jznxksg9shztnggk60lgmshuu9hshkqzdh58w', // OrangePillosophy
  'npub15fsrezzy8t632fv970urdqe2va23u0k26rj85s6u34j3p233eppsxm7lkd', // Carol
  'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7', // Jose Sammut
];

// Competition IDs (from database - verified 2026-02-10)
const COMPETITIONS = [
  { external_id: 'season2-running', id: '021fbe4a-8d89-4fa2-b9dc-8499f86143ee' },
  { external_id: 'season2-walking', id: '205b0af3-db18-4ae9-9369-902e93a336a5' },
  { external_id: 'season2-cycling', id: 'de780779-a889-423a-96b7-86eb0748c29d' },
];

async function registerParticipant(competitionId, npub) {
  const url = `${SUPABASE_URL}/rest/v1/competition_participants`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        competition_id: competitionId,
        npub: npub,
      }),
    });

    return response.ok || response.status === 409; // 409 = already exists
  } catch (err) {
    console.error(`Error registering ${npub}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  REGISTERING SEASON II PARTICIPANTS');
  console.log('='.repeat(60));
  console.log();
  console.log(`Participants: ${SEASON_2_PARTICIPANTS.length}`);
  console.log(`Competitions: ${COMPETITIONS.length}`);
  console.log();

  let totalRegistrations = 0;
  let errors = 0;

  for (const comp of COMPETITIONS) {
    console.log(`\n📊 ${comp.external_id}:`);

    for (const npub of SEASON_2_PARTICIPANTS) {
      const success = await registerParticipant(comp.id, npub);
      if (success) {
        totalRegistrations++;
        process.stdout.write('.');
      } else {
        errors++;
        process.stdout.write('x');
      }
    }

    console.log(` Done!`);
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log(`  COMPLETE: ${totalRegistrations} registrations, ${errors} errors`);
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
