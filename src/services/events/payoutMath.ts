/**
 * Pure payout math for event prize pools. No React Native / NWC imports —
 * keep this module side-effect free so it stays unit-testable.
 */

export interface Finisher {
  npub: string;
  totalDistanceKm: number;
  name?: string;
  lightningAddress?: string;
}

export interface PayoutRecipient {
  npub: string;
  name?: string;
  amount_sats: number;
  address: string;
  success: boolean;
  error?: string;
}

/** Calculate prize splits. top3 = 50/30/20 (adjusts for fewer); all_participants = equal, remainder to first. */
export function calculateSplits(
  finishers: Finisher[],
  prizePoolSats: number,
  distribution: 'top3' | 'all_participants',
): PayoutRecipient[] {
  if (finishers.length === 0 || prizePoolSats <= 0) return [];

  if (distribution === 'all_participants') {
    const perPerson = Math.floor(prizePoolSats / finishers.length);
    const remainder = prizePoolSats - perPerson * finishers.length;
    return finishers.map((f, i) => ({
      npub: f.npub,
      name: f.name,
      amount_sats: perPerson + (i === 0 ? remainder : 0),
      address: f.lightningAddress || '',
      success: false,
      error: undefined,
    }));
  }

  const ranked = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);
  const top = ranked.slice(0, 3);

  let percentages: number[];
  if (top.length === 1) percentages = [100];
  else if (top.length === 2) percentages = [60, 40];
  else percentages = [50, 30, 20];

  let allocated = 0;
  return top.map((f, i) => {
    const isLast = i === top.length - 1;
    const amount = isLast
      ? prizePoolSats - allocated
      : Math.floor((prizePoolSats * percentages[i]) / 100);
    allocated += amount;
    return {
      npub: f.npub,
      name: f.name,
      amount_sats: amount,
      address: f.lightningAddress || '',
      success: false,
      error: undefined,
    };
  });
}

/** Split recipients into those we can pay (address + positive amount) and those we cannot. */
export function partitionRecipients(recipients: PayoutRecipient[]): {
  payable: PayoutRecipient[];
  unpayable: PayoutRecipient[];
} {
  const payable: PayoutRecipient[] = [];
  const unpayable: PayoutRecipient[] = [];
  for (const r of recipients) {
    if (r.address && r.amount_sats > 0) payable.push(r);
    else unpayable.push(r);
  }
  return { payable, unpayable };
}

/** Drop recipients already paid successfully in a prior run; keep prior failures so they retry. */
export function filterAlreadyPaid(
  recipients: PayoutRecipient[],
  existingResults?: PayoutRecipient[],
): PayoutRecipient[] {
  if (!existingResults || existingResults.length === 0) return recipients;
  const paid = new Set(existingResults.filter(r => r.success).map(r => r.npub));
  return recipients.filter(r => !paid.has(r.npub));
}
