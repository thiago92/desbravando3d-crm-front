import { Injectable, signal } from '@angular/core';
import { normalizeSearch } from '../../shared/utils/presentation';

export interface UnitSupplyPreview {
  id: string;
  name: string;
  balanceUnits: number;
  pricePerUnit: number;
}

export type UnitStockMode = 'add' | 'replace';
export interface UnitStockAdjustment { mode: UnitStockMode; units: number | null }
type SaveResult = { saved: UnitSupplyPreview } | { error: string };

export function calculateUnitStockBalance(current: number, adjustment: UnitStockAdjustment): number | null {
  if (!Number.isSafeInteger(current) || current < 0) return null;
  if (adjustment.units === null) return adjustment.mode === 'add' ? current : null;
  if (!Number.isSafeInteger(adjustment.units) || adjustment.units < 0) return null;
  const balance = adjustment.mode === 'add' ? current + adjustment.units : adjustment.units;
  return Number.isSafeInteger(balance) ? balance : null;
}

@Injectable({ providedIn: 'root' })
export class UnitSuppliesPreview {
  private readonly entries = signal<UnitSupplyPreview[]>([]);
  readonly supplies = this.entries.asReadonly();

  validateConsumption(requirements: ReadonlyMap<string, number>): { error: string } | { valid: true } {
    for (const [id, units] of requirements) {
      const supply = this.entries().find((item) => item.id === id);
      if (!supply || !Number.isSafeInteger(units) || units <= 0) return { error: 'Revise os insumos em unidades e as quantidades previstas.' };
      if (supply.balanceUnits < units) return { error: `Estoque insuficiente de ${supply.name}. Registre uma entrada antes de confirmar.` };
    }
    return { valid: true };
  }

  consume(requirements: ReadonlyMap<string, number>): { error: string } | { consumed: true } {
    const check = this.validateConsumption(requirements);
    if ('error' in check) return check;
    this.entries.update((items) => items.map((item) => {
      const units = requirements.get(item.id);
      return units === undefined ? item : { ...item, balanceUnits: item.balanceUnits - units };
    }));
    return { consumed: true };
  }

  restore(requirements: ReadonlyMap<string, number>): { error: string } | { restored: true } {
    for (const [id, units] of requirements) {
      const supply = this.entries().find((item) => item.id === id);
      if (!supply || !Number.isSafeInteger(units) || units <= 0 || !Number.isSafeInteger(supply.balanceUnits + units)) return { error: 'Não foi possível devolver os insumos em unidades ao estoque.' };
    }
    this.entries.update((items) => items.map((item) => {
      const units = requirements.get(item.id);
      return units === undefined ? item : { ...item, balanceUnits: item.balanceUnits + units };
    }));
    return { restored: true };
  }

  save(nameInput: string, pricePerUnit: number, adjustment: UnitStockAdjustment, id?: string): SaveResult {
    const current = id ? this.entries().find((item) => item.id === id) : undefined;
    if (id && !current) return { error: 'Este insumo não está mais disponível. Reabra o cadastro.' };
    const name = nameInput.trim();
    if (!name || name.length > 120) return { error: 'Informe o nome do insumo, com até 120 caracteres.' };
    if (this.entries().some((item) => item.id !== id && normalizeSearch(item.name) === normalizeSearch(name))) return { error: 'Já existe um insumo em unidades com esse nome.' };
    if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0 || !Number.isSafeInteger(Math.round(pricePerUnit * 100)) || Math.abs(pricePerUnit * 100 - Math.round(pricePerUnit * 100)) > 0.000001) return { error: 'Informe um preço por unidade maior que zero, com até duas casas decimais.' };
    if (!current && adjustment.units === null) return { error: 'Informe o saldo inicial em unidades, inclusive se for zero.' };
    const balanceUnits = calculateUnitStockBalance(current?.balanceUnits ?? 0, adjustment);
    if (balanceUnits === null) return { error: 'Informe uma quantidade inteira maior ou igual a zero.' };
    const saved: UnitSupplyPreview = { id: id ?? crypto.randomUUID(), name, balanceUnits, pricePerUnit };
    this.entries.update((items) => id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]);
    return { saved };
  }
}
