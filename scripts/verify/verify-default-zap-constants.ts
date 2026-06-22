/**
 * Verifies the shared zap constants and parseStoredZapAmount behavior.
 * Run: npx tsx scripts/verify/verify-default-zap-constants.ts
 */
import {
  DEFAULT_ZAP_AMOUNT_KEY,
  DEFAULT_ZAP_AMOUNT_FALLBACK,
  ZAP_AMOUNT_PRESETS,
  parseStoredZapAmount,
} from '../../src/constants/zap';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); }
  else console.log(`ok: ${name}`);
}

check('key unchanged', DEFAULT_ZAP_AMOUNT_KEY === '@runstr:default_zap_amount');
check('fallback is 50', DEFAULT_ZAP_AMOUNT_FALLBACK === 50);
check('presets', JSON.stringify(ZAP_AMOUNT_PRESETS) === JSON.stringify([21, 50, 100, 500, 1000]));

check('null -> fallback', parseStoredZapAmount(null) === 50);
check('empty -> fallback', parseStoredZapAmount('') === 50);
check('non-numeric -> fallback', parseStoredZapAmount('abc') === 50);
check('zero -> fallback', parseStoredZapAmount('0') === 50);
check('negative -> fallback', parseStoredZapAmount('-5') === 50);
check('valid 500', parseStoredZapAmount('500') === 500);
check('valid with text suffix', parseStoredZapAmount('500sats') === 500); // parseInt tolerates trailing text
check('decimal floors', parseStoredZapAmount('21.9') === 21);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nAll checks passed');
