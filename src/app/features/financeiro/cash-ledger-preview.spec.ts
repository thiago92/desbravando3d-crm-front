import { TestBed } from '@angular/core/testing';
import { OrdersPreview } from '../encomendas/orders-preview';
import { ConsignmentsPreview } from '../consignado/consignado';
import { CashLedgerPreview } from './cash-ledger-preview';

describe('Lançamentos financeiros da prévia', () => {
  it('registra recebimento parcial da encomenda sem alterar sua etapa', () => {
    const orders = TestBed.inject(OrdersPreview);
    const ledger = TestBed.inject(CashLedgerPreview);
    const order = orders.orders().find((entry) => entry.number === '#011')!;
    const before = orders.pendingFor(order);
    expect(before).toBeGreaterThan(10);
    expect(orders.recordPayment(order.id, before + 1, '2026-11-12', 'Pix')).toHaveProperty('error');
    expect(orders.recordPayment(order.id, 10, '2026-11-12', 'Pix')).toHaveProperty('saved');
    const updated = orders.orders().find((entry) => entry.id === order.id)!;
    expect(updated.stage).toBe('confirmed');
    expect(updated.payment).toBe('pending');
    expect(orders.pendingFor(updated)).toBeCloseTo(before - 10, 2);
    expect(orders.returnToQuote(order.id)).toHaveProperty('error');
    expect(ledger.transactions()).toMatchObject([{ kind: 'receipt', origin: 'order', reference: '#011', amount: 10, date: '2026-11-12' }]);
    expect(orders.recordPayment(order.id, orders.pendingFor(updated), '2026-11-13', 'Dinheiro')).toHaveProperty('saved');
    expect(orders.orders().find((entry) => entry.id === order.id)?.payment).toBe('received');
    expect(orders.pendingFor(orders.orders().find((entry) => entry.id === order.id)!)).toBe(0);
  });

  it('registra repasse parcial sobre unidades vendidas e separa despesa de estoque', () => {
    const consignments = TestBed.inject(ConsignmentsPreview);
    const ledger = TestBed.inject(CashLedgerPreview);
    const card = consignments.entries().find((entry) => entry.number === '#C-014')!;
    expect(card.stage).toBe('with-store');
    expect(card.sold).toBe(4);
    expect(consignments.recordPayment(card.number, 100, '2026-11-12', 'Pix')).toHaveProperty('error');
    expect(consignments.recordPayment(card.number, 12.24, '2026-11-12', 'Pix')).toHaveProperty('saved');
    expect(consignments.entries().find((entry) => entry.number === card.number)).toMatchObject({ stage: 'with-store', sold: 4, received: 12.24 });
    expect(ledger.addExpense({ date: '2026-11-12', amount: 45.5, category: 'Insumos', description: 'Compra de filamento', method: 'Pix' })).toHaveProperty('saved');
    expect(ledger.transactions().map((entry) => [entry.kind, entry.amount])).toEqual([['receipt', 12.24], ['expense', 45.5]]);
    expect(ledger.addExpense({ date: '2026-02-30', amount: 1, category: 'Insumos', description: 'Inválida', method: 'Pix' })).toHaveProperty('error');
    expect(ledger.transactions()).toHaveLength(2);
  });
});
