import { Injectable, inject, signal } from '@angular/core';
import { CashLedgerPreview, type PaymentMethodPreview, validCashDate } from '../financeiro/cash-ledger-preview';
import { FilamentsPreview } from './filaments-preview';

export interface FilamentPurchasePreview {
  id: string;
  date: string;
  filamentId: string;
  filamentName: string;
  quantityGrams: number;
  pricePerKg: number;
  amount: number;
  paymentMethod: PaymentMethodPreview;
  cashEntryId: string;
}

const validPositiveHundredth = (value: number): boolean => Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;

@Injectable({ providedIn: 'root' })
export class FilamentPurchasesPreview {
  private readonly inventory = inject(FilamentsPreview);
  private readonly ledger = inject(CashLedgerPreview);
  private readonly records = signal<readonly FilamentPurchasePreview[]>([]);
  readonly purchases = this.records.asReadonly();

  record(input: { filamentId: string; quantityKg: number; pricePerKg: number; date: string; paymentMethod: PaymentMethodPreview }): { saved: FilamentPurchasePreview } | { error: string } {
    const filament = this.inventory.filaments().find((entry) => entry.id === input.filamentId);
    if (!filament) return { error: 'Escolha um filamento cadastrado.' };
    if (!Number.isFinite(input.quantityKg) || input.quantityKg <= 0 || Math.abs(input.quantityKg * 1000 - Math.round(input.quantityKg * 1000)) > 0.000001) return { error: 'Informe a quantidade comprada em kg, maior que zero e com até três casas decimais.' };
    const quantityGrams = Math.round(input.quantityKg * 1000);
    if (!Number.isSafeInteger(quantityGrams)) return { error: 'A quantidade comprada é muito grande.' };
    if (!validPositiveHundredth(input.pricePerKg)) return { error: 'Informe o preço por kg maior que zero, com até duas casas decimais.' };
    if (!validCashDate(input.date)) return { error: 'Informe a data válida do pagamento.' };
    const amount = Math.round(input.quantityKg * input.pricePerKg * 100) / 100;
    if (amount <= 0) return { error: 'O valor total da compra deve ser de pelo menos R$ 0,01.' };
    const balance = this.inventory.save({ name: filament.name, material: filament.material, color: filament.color, pricePerKg: input.pricePerKg }, { mode: 'add', grams: quantityGrams }, filament.id);
    if ('error' in balance) return balance;
    const cash = this.ledger.addExpense({ date: input.date, amount, description: `Compra de ${filament.name}`, category: 'Insumos', method: input.paymentMethod, purchase: { filamentId: filament.id, filamentName: filament.name, quantityGrams, pricePerKg: input.pricePerKg } });
    if ('error' in cash) {
      this.inventory.save({ name: filament.name, material: filament.material, color: filament.color, pricePerKg: filament.pricePerKg }, { mode: 'replace', grams: filament.balanceGrams }, filament.id);
      return cash;
    }
    const saved: FilamentPurchasePreview = { id: crypto.randomUUID(), date: input.date, filamentId: filament.id, filamentName: filament.name, quantityGrams, pricePerKg: input.pricePerKg, amount, paymentMethod: input.paymentMethod, cashEntryId: cash.saved.id };
    this.records.update((entries) => [...entries, saved]);
    return { saved };
  }
}
