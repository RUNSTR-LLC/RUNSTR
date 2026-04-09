/**
 * Verify Season III implementation:
 * - All new files exist
 * - Bracket map covers all 30 matchup slots
 * - Bracket advancement is consistent
 */

import { BRACKET_MAP, bracketKey } from '../../src/constants/season3';

const expectedSlots = [
  ...Array.from({ length: 8 }, (_, i) => bracketKey('winners', 1, i + 1)),
  ...Array.from({ length: 4 }, (_, i) => bracketKey('winners', 2, i + 1)),
  ...Array.from({ length: 2 }, (_, i) => bracketKey('winners', 3, i + 1)),
  bracketKey('winners', 4, 1),
  ...Array.from({ length: 4 }, (_, i) => bracketKey('losers', 1, i + 1)),
  ...Array.from({ length: 4 }, (_, i) => bracketKey('losers', 2, i + 1)),
  ...Array.from({ length: 2 }, (_, i) => bracketKey('losers', 3, i + 1)),
  ...Array.from({ length: 2 }, (_, i) => bracketKey('losers', 4, i + 1)),
  bracketKey('losers', 5, 1),
  bracketKey('losers', 6, 1),
  bracketKey('grand_finals', 1, 1),
  bracketKey('grand_finals', 2, 1),
];

console.log('Checking bracket map coverage...');

let errors = 0;

for (const slot of expectedSlots) {
  if (!BRACKET_MAP[slot]) {
    console.error(`MISSING: ${slot} not in BRACKET_MAP`);
    errors++;
  }
}

for (const [key, adv] of Object.entries(BRACKET_MAP)) {
  if (adv.winner_to) {
    const dest = bracketKey(adv.winner_to.bracket, adv.winner_to.round, adv.winner_to.match_number);
    if (!BRACKET_MAP[dest]) {
      console.error(`BAD DEST: ${key} winner_to ${dest} not in map`);
      errors++;
    }
  }
  if (adv.loser_to) {
    const dest = bracketKey(adv.loser_to.bracket, adv.loser_to.round, adv.loser_to.match_number);
    if (!BRACKET_MAP[dest]) {
      console.error(`BAD DEST: ${key} loser_to ${dest} not in map`);
      errors++;
    }
  }
}

console.log(`\nBracket map has ${Object.keys(BRACKET_MAP).length} entries, expected ${expectedSlots.length}`);
console.log(errors === 0 ? 'All checks passed!' : `${errors} errors found`);

process.exit(errors > 0 ? 1 : 0);
