import { Injectable, signal } from '@angular/core';

export type PaymentMethodPreview = 'Pix' | 'Dinheiro' | 'Cartão' | 'Transferência' | 'Outro' | 'Não informado';
export type CashEntryPreview = {
  id: string;
  date: string;
  kind: 'receipt' | 'expense';
  amount: number;
  description: string;
  origin: 'order' | 'consignment' | 'expense';
  reference: string | null;
  party: string | null;
  method: PaymentMethodPreview;
  category: string | null;
  note: string | null;
  purchase?: { filamentId: string; filamentName: string; quantityGrams: number; pricePerKg: number };
};
export type CashResult = { saved: CashEntryPreview } | { error: string };

const cents = (value: number): number => Math.round(value * 100) / 100;
export const validMoney = (value: number): boolean => Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
export const validCashDate = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isFinite(parsed.getTime()) && `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}` === date;
};

@Injectable({ providedIn: 'root' })
export class CashLedgerPreview {
  private readonly entries = signal<readonly CashEntryPreview[]>([]);
  readonly transactions = this.entries.asReadonly();

  addReceipt(input: { date: string; amount: number; origin: 'order' | 'consignment'; reference: string; party: string; method: PaymentMethodPreview; note?: string | null }): CashResult {
    if (!validMoney(input.amount)) return { error: 'Informe um valor maior que zero, com até duas casas decimais.' };
    if (!validCashDate(input.date)) return { error: 'Informe uma data válida para o recebimento.' };
    const saved: CashEntryPreview = {
      id: crypto.randomUUID(), date: input.date, kind: 'receipt', amount: cents(input.amount),
      description: input.origin === 'order' ? 'Recebimento de encomenda' : 'Repasse de consignado',
      origin: input.origin, reference: input.reference, party: input.party, method: input.method,
      category: null, note: input.note?.trim() || null,
    };
    this.entries.update((entries) => [...entries, saved]);
    return { saved };
  }

  addExpense(input: { date: string; amount: number; description: string; category: string; method: PaymentMethodPreview; note?: string | null; purchase?: CashEntryPreview['purchase'] }): CashResult {
    const description = input.description.trim();
    const category = input.category.trim();
    if (!description || !category) return { error: 'Informe a descrição e a categoria da despesa.' };
    if (!validMoney(input.amount)) return { error: 'Informe um valor maior que zero, com até duas casas decimais.' };
    if (!validCashDate(input.date)) return { error: 'Informe uma data válida para a despesa.' };
    const saved: CashEntryPreview = {
      id: crypto.randomUUID(), date: input.date, kind: 'expense', amount: cents(input.amount),
      description, origin: 'expense', reference: null, party: null, method: input.method,
      category, note: input.note?.trim() || null, purchase: input.purchase,
    };
    this.entries.update((entries) => [...entries, saved]);
    return { saved };
  }
}
