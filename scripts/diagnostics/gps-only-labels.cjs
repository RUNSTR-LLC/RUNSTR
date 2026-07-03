const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('workout_submissions')
    .select('npub, activity_type, distance_meters, duration_seconds, created_at')
    .like('event_id', 'local_%').limit(5000);
  if (error) return console.error(error.message);
  let usable=0, walkToRun=[], runToWalk=[];
  for (const w of data) {
    const d=w.distance_meters||0, t=w.duration_seconds||0;
    if (d<300||t<120) continue; usable++;
    const s=(d/t)*3.6;
    if (w.activity_type==='walking' && s>=8) walkToRun.push([w.created_at?.slice(0,10),s.toFixed(1),(d/1000).toFixed(2),(t/60).toFixed(0)]);
    else if (w.activity_type==='running' && s>0 && s<6.5) runToWalk.push(s);
  }
  console.log('Usable GPS rows:', usable);
  console.log(`\nWALK-labeled but >=8km/h (your concern): ${walkToRun.length} (${(walkToRun.length/usable*100).toFixed(1)}%)`);
  walkToRun.sort((a,b)=>new Date(b[0])-new Date(a[0])).slice(0,15).forEach(r=>console.log(`  ${r[0]}  ${r[1]} km/h  ${r[2]}km / ${r[3]}min`));
  console.log(`\nRUN-labeled but <6.5km/h (mostly benign: slow/intervals): ${runToWalk.length} (${(runToWalk.length/usable*100).toFixed(1)}%)`);
  const buckets={'<3':0,'3-5':0,'5-6.5':0};
  runToWalk.forEach(s=>{ if(s<3)buckets['<3']++; else if(s<5)buckets['3-5']++; else buckets['5-6.5']++; });
  console.log('  speed buckets:', buckets);
})();
