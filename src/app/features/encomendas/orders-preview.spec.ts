import { TestBed } from '@angular/core/testing';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { orderColumn, OrdersPreview } from './orders-preview';

describe('Regras de encomendas', () => {
  it('usa a mesma etapa para solicitações e orçamento e deriva a coluna pela presença de valor', () => {
    const service = TestBed.inject(OrdersPreview);
    const current = () => service.orders().find((order) => order.number === '#014')!;
    expect(current().stage).toBe('request');
    expect(orderColumn(current())).toBe('request');
    service.saveQuote(current().id, 150);
    expect(current().stage).toBe('request');
    expect(orderColumn(current())).toBe('quotation');
    service.saveQuote(current().id, 0);
    expect(orderColumn(current())).toBe('quotation');
    service.saveQuote(current().id, null);
    expect(current().stage).toBe('request');
    expect(orderColumn(current())).toBe('request');
  });

  it('não confirma nem reduz o estoque ao precificar e impede confirmação sem estimativas', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const before = inventory.filaments();
    const order = service.orders()[0];
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('error');
    service.saveQuote(order.id, 150);
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('error');
    expect(service.orders()[0].stage).toBe('request');
    expect(inventory.filaments()).toEqual(before);
  });

  it('avança produção e entrega sem exigir pagamento e bloqueia saltos e reenvio da mesma ação', () => {
    const service = TestBed.inject(OrdersPreview);
    const id = service.orders().find((order) => order.number === '#011')!.id;
    const current = () => service.orders().find((order) => order.id === id)!;
    expect(service.advance(id, 'delivered')).toHaveProperty('error');
    expect(current().stage).toBe('confirmed');
    expect(service.advance(id, 'printing')).toHaveProperty('saved');
    expect(service.advance(id, 'printing')).toHaveProperty('error');
    expect(current().stage).toBe('printing');
    expect(service.advance(id, 'ready')).toHaveProperty('saved');
    expect(service.advance(id, 'delivered')).toHaveProperty('saved');
    expect(current().payment).toBe('pending');
    expect(service.advance(id, 'request')).toHaveProperty('error');
    expect(service.saveQuote(id, 999)).toHaveProperty('error');
    expect(current().quotedTotal).toBe(150);
  });

  it('valida o valor informado sem alterar a encomenda em caso de erro', () => {
    const service = TestBed.inject(OrdersPreview);
    const original = service.orders()[0];
    for (const amount of [-1, NaN, Infinity, 1.001]) expect(service.saveQuote(original.id, amount)).toHaveProperty('error');
    expect(service.orders()[0]).toEqual(original);
  });
});
