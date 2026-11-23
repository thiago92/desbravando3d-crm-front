import type { CashEntryPreview } from '../financeiro/cash-ledger-preview';

export type DateRange = { from: string; to: string };
export type CashTotals = { received: number; paid: number; change: number };
export type CashBucket = { label: string; received: number; paid: number };

const dayMs = 86_400_000;
const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const date = (value: string): Date => new Date(`${value}T12:00:00`);
export const dateKey = (value: Date): string => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
export const daysInRange = (range: DateRange): number => Math.round((date(range.to).getTime() - date(range.from).getTime()) / dayMs) + 1;
export const previousRange = (range: DateRange): DateRange => {
  const length = daysInRange(range);
  const end = date(range.from);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - length + 1);
  return { from: dateKey(start), to: dateKey(end) };
};
export const inRange = (value: string, range: DateRange): boolean => value >= range.from && value <= range.to;
export function cashTotals(entries: readonly CashEntryPreview[], range: DateRange): CashTotals {
  const matching = entries.filter((entry) => inRange(entry.date, range));
  const received = money(matching.filter((entry) => entry.kind === 'receipt').reduce((sum, entry) => sum + entry.amount, 0));
  const paid = money(matching.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0));
  return { received, paid, change: money(received - paid) };
}
export function cashBuckets(entries: readonly CashEntryPreview[], range: DateRange): CashBucket[] {
  const length = daysInRange(range);
  if (length <= 0) return [];
  const count = Math.min(8, length);
  return Array.from({ length: count }, (_, index) => {
    const startOffset = Math.floor(index * length / count);
    const endOffset = Math.floor((index + 1) * length / count) - 1;
    const start = date(range.from);
    const end = date(range.from);
    start.setDate(start.getDate() + startOffset);
    end.setDate(end.getDate() + endOffset);
    const totals = cashTotals(entries, { from: dateKey(start), to: dateKey(end) });
    return { label: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`, received: totals.received, paid: totals.paid };
  });
}
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
}
