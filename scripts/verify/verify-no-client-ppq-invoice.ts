/**
 * Confirms the client no longer creates PPQ invoices at submit time.
 * Run: npx tsx scripts/verify/verify-no-client-ppq-invoice.ts
 */
import { readFileSync } from 'fs';

const src = readFileSync('src/services/backend/SupabaseCompetitionService.ts', 'utf8');
const violations: string[] = [];
if (src.includes('createTopupInvoice')) violations.push('still calls createTopupInvoice');
if (/ppq_bolt11:\s/.test(src)) violations.push('still sends ppq_bolt11 in submit body');
if (/ppq_invoice_id:\s/.test(src)) violations.push('still sends ppq_invoice_id in submit body');

if (violations.length === 0) {
  console.log('PASS: no client-side PPQ invoice creation at submit time');
  process.exit(0);
}
console.error('FAIL:', violations.join('; '));
process.exit(1);
