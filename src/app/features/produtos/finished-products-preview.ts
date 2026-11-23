import { Injectable, signal } from '@angular/core';

export interface FinishedProductBalancePreview {
  productId: string;
  sizeId: string;
  quantity: number;
}

/** Peças prontas vindas de encomendas canceladas nesta visita. */
@Injectable({ providedIn: 'root' })
export class FinishedProductsPreview {
  private readonly entries = signal<readonly FinishedProductBalancePreview[]>([]);
  readonly balances = this.entries.asReadonly();

  quantity(productId: string, sizeId?: string): number {
    return this.entries().filter((entry) => entry.productId === productId && (!sizeId || entry.sizeId === sizeId))
      .reduce((sum, entry) => sum + entry.quantity, 0);
  }

  add(items: readonly { productId: string; sizeId: string; quantity: number }[]): void {
    this.entries.update((current) => {
      const balances = current.map((entry) => ({ ...entry }));
      for (const item of items) {
        const existing = balances.find((entry) => entry.productId === item.productId && entry.sizeId === item.sizeId);
        if (existing) existing.quantity += item.quantity;
        else balances.push({ ...item });
      }
      return balances;
    });
  }
}
