import {
  calculateSplits,
  partitionRecipients,
  filterAlreadyPaid,
  Finisher,
  PayoutRecipient,
} from '../payoutMath';

const f = (npub: string, km: number, addr?: string): Finisher => ({
  npub,
  totalDistanceKm: km,
  name: npub,
  lightningAddress: addr,
});

describe('calculateSplits', () => {
  it('splits top3 50/30/20 and sums exactly to the pool', () => {
    const r = calculateSplits(
      [f('a', 30, 'a@x.com'), f('b', 20, 'b@x.com'), f('c', 10, 'c@x.com')],
      1000,
      'top3',
    );
    expect(r.map(x => x.amount_sats)).toEqual([500, 300, 200]);
    expect(r.reduce((s, x) => s + x.amount_sats, 0)).toBe(1000);
    expect(r.map(x => x.npub)).toEqual(['a', 'b', 'c']); // ranked by distance desc
  });

  it('gives 100% to the only finisher in top3 mode', () => {
    const r = calculateSplits([f('a', 5, 'a@x.com')], 1000, 'top3');
    expect(r).toHaveLength(1);
    expect(r[0].amount_sats).toBe(1000);
  });

  it('uses 60/40 for exactly two finishers', () => {
    const r = calculateSplits([f('a', 9, 'a@x.com'), f('b', 4, 'b@x.com')], 1000, 'top3');
    expect(r.map(x => x.amount_sats)).toEqual([600, 400]);
  });

  it('splits equally among all participants, remainder to first', () => {
    const r = calculateSplits([f('a', 9), f('b', 8), f('c', 7)], 1000, 'all_participants');
    expect(r.map(x => x.amount_sats)).toEqual([334, 333, 333]);
    expect(r.reduce((s, x) => s + x.amount_sats, 0)).toBe(1000);
  });

  it('returns [] for empty finishers or non-positive pool', () => {
    expect(calculateSplits([], 1000, 'top3')).toEqual([]);
    expect(calculateSplits([f('a', 1, 'a@x.com')], 0, 'top3')).toEqual([]);
  });

  it('passes through missing address as empty string', () => {
    const r = calculateSplits([f('a', 1)], 1000, 'top3');
    expect(r[0].address).toBe('');
  });
});

describe('partitionRecipients', () => {
  it('separates recipients with no address or zero amount as unpayable', () => {
    const recips: PayoutRecipient[] = [
      { npub: 'a', amount_sats: 500, address: 'a@x.com', success: false },
      { npub: 'b', amount_sats: 300, address: '', success: false },
      { npub: 'c', amount_sats: 0, address: 'c@x.com', success: false },
    ];
    const { payable, unpayable } = partitionRecipients(recips);
    expect(payable.map(r => r.npub)).toEqual(['a']);
    expect(unpayable.map(r => r.npub)).toEqual(['b', 'c']);
  });
});

describe('filterAlreadyPaid', () => {
  const recips: PayoutRecipient[] = [
    { npub: 'a', amount_sats: 500, address: 'a@x.com', success: false },
    { npub: 'b', amount_sats: 300, address: 'b@x.com', success: false },
  ];

  it('returns all when there are no prior results', () => {
    expect(filterAlreadyPaid(recips, undefined)).toHaveLength(2);
    expect(filterAlreadyPaid(recips, [])).toHaveLength(2);
  });

  it('drops recipients already paid successfully, keeps prior failures', () => {
    const prior: PayoutRecipient[] = [
      { npub: 'a', amount_sats: 500, address: 'a@x.com', success: true },
      { npub: 'b', amount_sats: 300, address: 'b@x.com', success: false, error: 'timeout' },
    ];
    const out = filterAlreadyPaid(recips, prior);
    expect(out.map(r => r.npub)).toEqual(['b']);
  });
});
