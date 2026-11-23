import { cashBuckets, cashTotals, previousRange } from './dashboard-data';
import type { CashEntryPreview } from '../financeiro/cash-ledger-preview';

const entry = (date: string, kind: 'receipt' | 'expense', amount: number): CashEntryPreview => ({
  id: `${date}-${kind}-${amount}`, date, kind, amount, description: 'Teste',
  origin: kind === 'receipt' ? 'order' : 'expense', reference: null, party: null,
  method: 'Pix', category: null, note: null,
});

describe('Dados do Dashboard', () => {
  it('compara períodos consecutivos de mesma duração e respeita os limites das datas', () => {
    const current = { from: '2026-03-01', to: '2026-03-31' };
    expect(previousRange(current)).toEqual({ from: '2026-01-29', to: '2026-02-28' });
    const entries = [entry('2026-02-28', 'receipt', 4), entry('2026-03-01', 'receipt', 10), entry('2026-03-31', 'expense', 3), entry('2026-04-01', 'receipt', 20)];
    expect(cashTotals(entries, current)).toEqual({ received: 10, paid: 3, change: 7 });
    expect(cashTotals(entries, previousRange(current))).toEqual({ received: 4, paid: 0, change: 4 });
    const buckets = cashBuckets(entries, current);
    expect(buckets.reduce((sum, bucket) => sum + bucket.received, 0)).toBe(10);
    expect(buckets.reduce((sum, bucket) => sum + bucket.paid, 0)).toBe(3);
  });
});
