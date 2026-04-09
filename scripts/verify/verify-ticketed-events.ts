/**
 * Verification script for Ticketed Events type-level changes
 *
 * Checks that the runstrEvent types, helper functions, and defaults
 * are correctly configured for the ticketed events feature.
 *
 * Run: npx tsx scripts/verify/verify-ticketed-events.ts
 */

import {
  calculatePayouts,
  getValidPayoutSchemes,
  DEFAULT_FORM_STATE,
} from '../../src/types/runstrEvent';
import type { PayoutRecipient } from '../../src/types/runstrEvent';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

console.log('=== Ticketed Events Verification ===\n');

// --- getValidPayoutSchemes ---
console.log('getValidPayoutSchemes:');

const participationSchemes = getValidPayoutSchemes('participation');
check(
  "participation includes 'random_winner'",
  participationSchemes.includes('random_winner'),
);
check(
  "participation includes 'fixed_amount'",
  participationSchemes.includes('fixed_amount'),
);

const fastestTimeSchemes = getValidPayoutSchemes('fastest_time');
check(
  "fastest_time does NOT include 'random_winner'",
  !fastestTimeSchemes.includes('random_winner'),
);

// --- calculatePayouts with random_winner ---
console.log('\ncalculatePayouts (random_winner):');

const recipients: PayoutRecipient[] = [
  { npub: 'npub1aaa', rank: 1 },
  { npub: 'npub1bbb', rank: 2 },
  { npub: 'npub1ccc', rank: 3 },
];

const payouts = calculatePayouts(21000, 'random_winner', recipients);
check('returns exactly 1 payout', payouts.length === 1);
check('payout amount is 21000', payouts[0]?.amountSats === 21000);

// --- DEFAULT_FORM_STATE ---
console.log('\nDEFAULT_FORM_STATE:');

check('ticketPledgeDays === 0', DEFAULT_FORM_STATE.ticketPledgeDays === 0);
check("winnerSelection === 'ranked'", DEFAULT_FORM_STATE.winnerSelection === 'ranked');
check("qualifyingDistance === ''", DEFAULT_FORM_STATE.qualifyingDistance === '');

// --- Summary ---
const total = passed + failed;
console.log(`\n=== Results: ${passed}/${total} passed ===`);

if (failed > 0) {
  console.log(`${failed} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('All checks passed!');
}
