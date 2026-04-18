/**
 * Verify: Cycling event templates (Phase 1 of cycling parity)
 *
 * Confirms:
 *   - SimpleEventCreationModal exposes cycling templates
 *   - Each uses activity_type 'cycling' and a backend-supported scoring method
 *   - No cycling template uses fastest_time (needs Phase 3 schema)
 */

import * as fs from 'fs';
import * as path from 'path';

const MODAL_PATH = path.resolve(
  __dirname,
  '../../src/components/creation/SimpleEventCreationModal.tsx'
);

const SUPPORTED_SCORING = new Set([
  'total_distance',
  'workout_count',
  'total_steps',
  'fastest_time',
]);

const PHASE_1_SAFE_SCORING = new Set(['total_distance', 'workout_count']);

interface Template {
  key: string;
  label: string;
  activityType: string;
  scoringMethod: string;
}

function parseTemplates(src: string): Template[] {
  const arrayMatch = src.match(
    /const EVENT_TEMPLATES:\s*EventTemplate\[\]\s*=\s*\[([\s\S]*?)\n\];/
  );
  if (!arrayMatch) throw new Error('Could not locate EVENT_TEMPLATES array');

  const body = arrayMatch[1];
  const objectRegex = /\{([^{}]*?)\}/g;
  const templates: Template[] = [];
  let m: RegExpExecArray | null;
  while ((m = objectRegex.exec(body)) !== null) {
    const block = m[1];
    const get = (field: string): string | null => {
      const fm = block.match(new RegExp(`${field}:\\s*['"]([^'"]+)['"]`));
      return fm ? fm[1] : null;
    };
    const key = get('key');
    const label = get('label');
    const activityType = get('activityType');
    const scoringMethod = get('scoringMethod');
    if (key && label && activityType && scoringMethod) {
      templates.push({ key, label, activityType, scoringMethod });
    }
  }
  return templates;
}

function main() {
  const src = fs.readFileSync(MODAL_PATH, 'utf-8');
  const templates = parseTemplates(src);

  console.log(`Parsed ${templates.length} event templates:`);
  for (const t of templates) {
    console.log(`  - ${t.key.padEnd(20)} ${t.activityType.padEnd(10)} ${t.scoringMethod}`);
  }

  const cycling = templates.filter((t) => t.activityType === 'cycling');
  const failures: string[] = [];

  if (cycling.length === 0) {
    failures.push('No cycling templates found');
  }

  for (const t of cycling) {
    if (!SUPPORTED_SCORING.has(t.scoringMethod)) {
      failures.push(`${t.key}: scoring_method '${t.scoringMethod}' not supported by backend`);
    }
    if (!PHASE_1_SAFE_SCORING.has(t.scoringMethod)) {
      failures.push(
        `${t.key}: uses '${t.scoringMethod}' — requires Phase 3 schema (cycling time columns). Remove or switch to total_distance / workout_count.`
      );
    }
  }

  console.log(`\nCycling templates: ${cycling.length}`);
  cycling.forEach((t) =>
    console.log(`  ✓ ${t.label} (${t.scoringMethod})`)
  );

  if (failures.length > 0) {
    console.error('\n✗ FAILURES:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('\n✓ Cycling event templates verified — Phase 1 OK');
}

main();
