import { Injectable, signal } from '@angular/core';

/** Etapas da prévia; os códigos e o contrato da API ainda serão definidos. */
export type OrderStagePreview = 'request' | 'confirmed' | 'printing' | 'ready' | 'delivered';
export type OrderColumnPreview = OrderStagePreview | 'quotation';
export interface OrderPreview {
  id: string;
  number: string;
  customer: string;
  stage: OrderStagePreview;
  items: { name: string; quantity: number }[];
  quotedTotal: number | null;
  payment: 'not-defined' | 'pending' | 'received';
}

export type OrderMutationResult = { saved: OrderPreview } | { error: string };

export function orderColumn(order: OrderPreview): OrderColumnPreview {
  return order.stage === 'request' && order.quotedTotal !== null ? 'quotation' : order.stage;
}

export const nextOrderAction: Record<OrderStagePreview, { target: OrderStagePreview; label: string } | null> = {
  request: { target: 'confirmed', label: 'Confirmar encomenda' },
  confirmed: { target: 'printing', label: 'Iniciar impressão' },
  printing: { target: 'ready', label: 'Marcar como pronta para entrega' },
  ready: { target: 'delivered', label: 'Marcar como entregue' },
  delivered: null,
};

@Injectable({ providedIn: 'root' })
export class OrdersPreview {
  private readonly entries = signal<readonly OrderPreview[]>([
    { id: 'order-preview-1', number: '#014', customer: 'Maria Silva', stage: 'request', items: [{ name: 'Vaso geométrico', quantity: 2 }, { name: 'Organizador de mesa', quantity: 2 }, { name: 'Suporte para celular', quantity: 1 }], quotedTotal: null, payment: 'not-defined' },
    { id: 'order-preview-2', number: '#015', customer: 'João Oliveira', stage: 'request', items: [{ name: 'Peça personalizada', quantity: 1 }], quotedTotal: null, payment: 'not-defined' },
    { id: 'order-preview-3', number: '#012', customer: 'Ana Costa', stage: 'request', items: [{ name: 'Organizador de mesa', quantity: 3 }], quotedTotal: null, payment: 'not-defined' },
    { id: 'order-preview-4', number: '#013', customer: 'Carlos Santos', stage: 'request', items: [{ name: 'Vaso geométrico', quantity: 4 }, { name: 'Suporte para celular', quantity: 2 }], quotedTotal: 160, payment: 'pending' },
    { id: 'order-preview-5', number: '#010', customer: 'Beatriz Lima', stage: 'confirmed', items: [{ name: 'Vaso geométrico', quantity: 2 }], quotedTotal: 80, payment: 'received' },
    { id: 'order-preview-6', number: '#011', customer: 'Pedro Almeida', stage: 'confirmed', items: [{ name: 'Suporte para celular', quantity: 5 }], quotedTotal: 150, payment: 'pending' },
    { id: 'order-preview-7', number: '#008', customer: 'Mariana Souza', stage: 'printing', items: [{ name: 'Organizador de mesa', quantity: 2 }, { name: 'Vaso geométrico', quantity: 1 }], quotedTotal: 130, payment: 'received' },
    { id: 'order-preview-8', number: '#009', customer: 'Lucas Ferreira', stage: 'printing', items: [{ name: 'Peça personalizada', quantity: 2 }], quotedTotal: 95, payment: 'pending' },
    { id: 'order-preview-9', number: '#007', customer: 'Juliana Martins', stage: 'ready', items: [{ name: 'Vaso geométrico', quantity: 3 }], quotedTotal: 120, payment: 'received' },
    { id: 'order-preview-10', number: '#006', customer: 'Rafael Rocha', stage: 'delivered', items: [{ name: 'Organizador de mesa', quantity: 2 }], quotedTotal: 90, payment: 'pending' },
  ]);
  readonly orders = this.entries.asReadonly();

  saveQuote(id: string, amount: number | null): OrderMutationResult {
    const order = this.entries().find((item) => item.id === id);
    if (!order || order.stage !== 'request') return { error: 'O orçamento só pode ser alterado antes da confirmação.' };
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)) {
      return { error: 'Informe um valor válido, maior ou igual a zero, com até duas casas decimais.' };
    }
    return this.update({ ...order, quotedTotal: amount });
  }

  advance(id: string, target: OrderStagePreview): OrderMutationResult {
    const order = this.entries().find((item) => item.id === id);
    if (!order || nextOrderAction[order.stage]?.target !== target) return { error: 'Esta mudança de etapa não está disponível para a encomenda.' };
    if (target === 'confirmed') {
      if (order.quotedTotal === null) return { error: 'Informe o valor do orçamento antes de confirmar a encomenda.' };
      return { error: 'Informe o consumo previsto de filamento por item antes de confirmar a encomenda.' };
    }
    return this.update({ ...order, stage: target });
  }

  private update(saved: OrderPreview): OrderMutationResult {
    this.entries.update((items) => items.map((item) => item.id === saved.id ? saved : item));
    return { saved };
  }
}
