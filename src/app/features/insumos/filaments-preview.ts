import { Injectable, signal } from '@angular/core';
import { normalizeSearch } from '../../shared/utils/presentation';

export interface FilamentPreview {
  id: string;
  name: string;
  material: string;
  color: string;
  balanceGrams: number;
  pricePerKg: number;
}

export type StockMode = 'add' | 'replace';
export interface StockAdjustment {
  mode: StockMode;
  grams: number | null;
}
export type FilamentDetails = Pick<FilamentPreview, 'name' | 'material' | 'color' | 'pricePerKg'>;
type SaveResult = { saved: FilamentPreview } | { error: string };

function validAmount(value: number): boolean {
  const scaled = value * 100;
  return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(scaled)) && Math.abs(scaled - Math.round(scaled)) < 0.000001;
}

/** Quantidades em gramas, com até duas casas decimais. Não registra compras financeiras. */
export function calculateStockBalance(current: number, adjustment: StockAdjustment): number | null {
  if (!validAmount(current)) return null;
  if (adjustment.grams === null) return adjustment.mode === 'add' ? current : null;
  if (!validAmount(adjustment.grams)) return null;
  const scaled = adjustment.mode === 'add'
    ? Math.round(current * 100) + Math.round(adjustment.grams * 100)
    : Math.round(adjustment.grams * 100);
  return Number.isSafeInteger(scaled) ? scaled / 100 : null;
}

@Injectable({ providedIn: 'root' })
export class FilamentsPreview {
  private readonly entries = signal<FilamentPreview[]>([
    { id: 'filament-preview-1', name: 'Filamento vermelho', material: 'PLA', color: 'Vermelho', balanceGrams: 500, pricePerKg: 120 },
    { id: 'filament-preview-2', name: 'Filamento preto', material: 'PLA', color: 'Preto', balanceGrams: 1000, pricePerKg: 110 },
    { id: 'filament-preview-3', name: 'Filamento branco', material: 'PETG', color: 'Branco', balanceGrams: 0, pricePerKg: 145 },
  ]);
  readonly filaments = this.entries.asReadonly();

  consume(requirements: ReadonlyMap<string, number>): { error: string } | { consumed: true } {
    for (const [id, grams] of requirements) {
      const filament = this.entries().find((item) => item.id === id);
      if (!filament || !validAmount(grams) || grams <= 0) return { error: 'Revise os filamentos e as quantidades previstas.' };
      if (filament.balanceGrams < grams) return { error: `Estoque insuficiente de ${filament.name}. Registre uma entrada antes de confirmar.` };
    }
    this.entries.update((items) => items.map((item) => {
      const grams = requirements.get(item.id);
      return grams === undefined ? item : { ...item, balanceGrams: (Math.round(item.balanceGrams * 100) - Math.round(grams * 100)) / 100 };
    }));
    return { consumed: true };
  }

  restore(requirements: ReadonlyMap<string, number>): { error: string } | { restored: true } {
    for (const [id, grams] of requirements) {
      const filament = this.entries().find((item) => item.id === id);
      if (!filament || !validAmount(grams) || grams <= 0 || !validAmount(filament.balanceGrams + grams)) {
        return { error: 'Não foi possível devolver o consumo previsto ao estoque.' };
      }
    }
    this.entries.update((items) => items.map((item) => {
      const grams = requirements.get(item.id);
      return grams === undefined ? item : { ...item, balanceGrams: (Math.round(item.balanceGrams * 100) + Math.round(grams * 100)) / 100 };
    }));
    return { restored: true };
  }

  save(details: FilamentDetails, adjustment: StockAdjustment, id?: string): SaveResult {
    const current = id ? this.entries().find((item) => item.id === id) : undefined;
    if (id && !current) return { error: 'Este filamento não está mais disponível. Reabra o cadastro.' };
    const name = details.name.trim();
    const material = details.material.trim();
    const color = details.color.trim();
    if (!name || !material || !color || name.length > 120 || material.length > 60 || color.length > 60) {
      return { error: 'Informe nome, material e cor do filamento.' };
    }
    if (!validAmount(details.pricePerKg) || details.pricePerKg <= 0) {
      return { error: 'Informe um preço por kg maior que zero, com até duas casas decimais.' };
    }
    if (this.entries().some((item) => item.id !== id && normalizeSearch(item.material) === normalizeSearch(material) && normalizeSearch(item.color) === normalizeSearch(color))) {
      return { error: 'Já existe um filamento com esse material e cor. Edite o cadastro existente para adicionar estoque.' };
    }
    if (!current && adjustment.grams === null) return { error: 'Informe o saldo inicial em gramas, inclusive se for zero.' };
    const balanceGrams = calculateStockBalance(current?.balanceGrams ?? 0, adjustment);
    if (balanceGrams === null) return { error: 'Informe uma quantidade válida em gramas, maior ou igual a zero, com até duas casas decimais.' };
    const saved: FilamentPreview = { id: id ?? crypto.randomUUID(), name, material, color, pricePerKg: details.pricePerKg, balanceGrams };
    this.entries.update((items) => id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]);
    return { saved };
  }
}
