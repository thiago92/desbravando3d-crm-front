import { TestBed } from '@angular/core/testing';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { ProductsPreview } from '../produtos/products-preview';
import { orderColumn, OrdersPreview } from './orders-preview';

describe('Regras de encomendas', () => {
  beforeEach(() => {
    localStorage.removeItem('crm-pricing-percentages-preview');
    localStorage.removeItem('crm-energy-settings-preview');
  });

  it('mantém uma única coluna de orçamento com preços calculados por produto', () => {
    const service = TestBed.inject(OrdersPreview);
    const order = service.orders()[0];
    const price = service.priceFor(order)!;
    expect(orderColumn(order)).toBe('request');
    expect(order.items.map((item) => item.productId)).toEqual(['preview-1', 'preview-3', 'preview-2']);
    expect(price.items).toHaveLength(3);
    expect(price.items[0].lineTotal).toBeCloseTo(price.items[0].unitPrice * 2, 2);
    expect(price.total).toBe(price.subtotal);
  });

  it('cria encomendas com número sequencial, itens validados e pagamento a definir', () => {
    const service = TestBed.inject(OrdersPreview);
    const initialCount = service.orders().length;
    const balanceBefore = TestBed.inject(FilamentsPreview).filaments().find((filament) => filament.id === 'filament-preview-1')!.balanceGrams;
    const input = {
      customer: '  Cliente Teste  ',
      items: [
        { productId: 'preview-1', sizeId: 'vase-small', quantity: 2, marginId: 3 },
        { productId: 'preview-2', sizeId: 'stand-standard', quantity: 1, marginId: 3 },
      ],
      discountPercent: 5,
      deliveryDate: null,
    };
    expect(service.create({ ...input, items: [{ ...input.items[0], sizeId: 'tamanho-inexistente' }] })).toHaveProperty('error');
    expect(service.create({ ...input, items: [{ ...input.items[0], quantity: 0 }] })).toHaveProperty('error');
    expect(service.create({ ...input, deliveryDate: '2026-02-30' })).toHaveProperty('error');
    expect(service.orders()).toHaveLength(initialCount);
    const first = service.create(input);
    expect(first).toHaveProperty('saved');
    if (!('saved' in first)) return;
    expect(first.saved).toMatchObject({ number: '#016', customer: 'Cliente Teste', stage: 'request', payment: 'not-defined', discountPercent: 5, deliveryDate: null });
    expect(first.saved.items).toHaveLength(2);
    expect(service.priceFor(first.saved)?.items).toHaveLength(2);
    expect(TestBed.inject(FilamentsPreview).filaments().find((filament) => filament.id === 'filament-preview-1')!.balanceGrams).toBe(balanceBefore);
    const second = service.create({ ...input, customer: 'Outra pessoa' });
    expect(second).toHaveProperty('saved');
    if ('saved' in second) expect(second.saved.number).toBe('#017');
  });

  it('aplica desconto apenas sobre a soma de todos os produtos', () => {
    const service = TestBed.inject(OrdersPreview);
    const id = service.orders()[0].id;
    const before = service.priceFor(service.orders()[0])!;
    expect(service.saveDiscount(id, 10)).toHaveProperty('saved');
    const after = service.priceFor(service.orders()[0])!;
    expect(after.items).toEqual(before.items);
    expect(after.subtotal).toBe(before.subtotal);
    expect(after.discountAmount).toBeCloseTo(Math.round(before.subtotal * 10) / 100, 2);
    expect(after.total).toBeCloseTo(after.subtotal - after.discountAmount, 2);
    for (const value of [-1, 100.01, NaN, 1.001]) expect(service.saveDiscount(id, value)).toHaveProperty('error');
  });

  it('usa a tarifa e a potência cadastradas no orçamento aberto e preserva pedidos confirmados', () => {
    const service = TestBed.inject(OrdersPreview);
    const request = service.orders()[0];
    const confirmed = service.orders().find((order) => order.number === '#010')!;
    const original = service.priceFor(request)!;
    const frozen = service.priceFor(confirmed)!;
    localStorage.setItem('crm-energy-settings-preview', JSON.stringify([{ id: 1, tariffPerKwh: 1.6, averagePowerW: 300, createdAt: new Date().toISOString() }]));
    const updated = service.priceFor(request)!;
    expect(updated.items[0].energyCost).toBeCloseTo(original.items[0].energyCost * 4, 6);
    expect(updated.total).toBeGreaterThan(original.total);
    expect(service.priceFor(confirmed)?.total).toBe(frozen.total);
  });

  it('lê o consumo do tamanho no catálogo e congela a configuração após confirmar', () => {
    const service = TestBed.inject(OrdersPreview);
    const catalog = TestBed.inject(ProductsPreview);
    const id = service.orders().find((order) => order.number === '#013')!.id;
    const current = () => service.orders().find((order) => order.id === id)!;
    const product = catalog.products().find((entry) => entry.id === 'preview-1')!;
    const { id: productId, ...details } = product;
    const before = service.priceFor(current())!.items[0].materialCost;
    const changeGrams = (grams: number) => catalog.save({ ...details, sizes: product.sizes.map((size) => size.id === 'vase-small' ? { ...size, materials: [{ filamentId: 'filament-preview-1', gramsPerUnit: grams }] } : size) }, productId);
    changeGrams(70);
    expect(service.priceFor(current())!.items[0].materialCost).toBeGreaterThan(before);
    expect(service.advance(id, 'confirmed')).toHaveProperty('saved');
    const frozen = service.priceFor(current())!.total;
    changeGrams(30);
    expect(service.priceFor(current())!.total).toBe(frozen);
    expect(service.sizeFor(current().items[0])?.materials[0].gramsPerUnit).toBe(70);
    expect(service.saveItemSelection(id, 0, 'vase-medium', 3)).toHaveProperty('error');
  });

  it('confirma apenas com estoque suficiente e preserva o preço após alterar o preço do filamento', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const id = service.orders().find((order) => order.number === '#013')!.id;
    const before = inventory.filaments().find((filament) => filament.id === 'filament-preview-2')!.balanceGrams;
    expect(service.saveItemSelection(id, 0, 'vase-medium', 3)).toHaveProperty('saved');
    const expected = service.priceFor(service.orders().find((order) => order.id === id)!)!;
    expect(service.advance(id, 'confirmed')).toHaveProperty('saved');
    expect(inventory.filaments().find((filament) => filament.id === 'filament-preview-2')!.balanceGrams).toBe(before - 560);
    expect(service.advance(id, 'confirmed')).toHaveProperty('error');
    const filament = inventory.filaments().find((entry) => entry.id === 'filament-preview-2')!;
    inventory.save({ name: filament.name, material: filament.material, color: filament.color, pricePerKg: 200 }, { mode: 'add', grams: null }, filament.id);
    expect(service.priceFor(service.orders().find((order) => order.id === id)!)?.total).toBe(expected.total);
  });

  it('devolve somente o consumo baixado ao voltar de Confirmadas e libera novo orçamento', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const id = service.orders().find((order) => order.number === '#013')!.id;
    const balance = inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams;
    expect(service.advance(id, 'confirmed')).toHaveProperty('saved');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(balance - 200);
    expect(service.saveDiscount(id, 5)).toHaveProperty('error');
    expect(service.returnToQuote(id)).toHaveProperty('saved');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(balance);
    expect(service.priceFor(service.orders().find((order) => order.id === id)!)?.total).not.toBeNull();
    expect(service.saveDiscount(id, 5)).toHaveProperty('saved');
    expect(service.returnToQuote(id)).toHaveProperty('error');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(balance);
    expect(service.advance(id, 'confirmed')).toHaveProperty('saved');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(balance - 200);
    expect(service.advance(id, 'printing')).toHaveProperty('saved');
    expect(service.returnToQuote(id)).toHaveProperty('error');
  });

  it('bloqueia confirmação sem saldo em uma cor sem baixar as demais', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const id = service.orders()[0].id;
    expect(service.advance(id, 'confirmed')).toHaveProperty('error');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-2')?.balanceGrams).toBe(1000);
    expect(service.orders()[0].stage).toBe('request');
  });

  it('valida tamanho, margem e prazo antes de alterar o pedido', () => {
    const service = TestBed.inject(OrdersPreview);
    const id = service.orders()[0].id;
    const originalPrice = service.priceFor(service.orders()[0])!.items[0].unitPrice;
    expect(service.saveItemSelection(id, 0, 'not-a-size', 3)).toHaveProperty('error');
    expect(service.saveItemSelection(id, 0, 'vase-small', 999)).toHaveProperty('error');
    expect(service.saveDeliveryDate(id, '2026-02-31')).toHaveProperty('error');
    expect(service.saveDeliveryDate(id, '2026-11-20')).toHaveProperty('saved');
    expect(service.saveDeliveryDate(id, null)).toHaveProperty('saved');
    expect(service.orders()[0].deliveryDate).toBeNull();
    expect(service.saveItemSelection(id, 0, 'vase-small', 1)).toHaveProperty('saved');
    expect(service.orders()[0].items[0].sizeId).toBe('vase-small');
    expect(service.priceFor(service.orders()[0])!.items[0].marginName).toBe('Lojas');
    expect(service.priceFor(service.orders()[0])!.items[0].unitPrice).toBeLessThan(originalPrice);
  });

  it('avança produção e entrega sem exigir pagamento e rejeita saltos', () => {
    const service = TestBed.inject(OrdersPreview);
    const id = service.orders().find((order) => order.number === '#011')!.id;
    expect(service.advance(id, 'delivered')).toHaveProperty('error');
    expect(service.advance(id, 'printing')).toHaveProperty('saved');
    expect(service.advance(id, 'printing')).toHaveProperty('error');
    expect(service.advance(id, 'ready')).toHaveProperty('saved');
    expect(service.advance(id, 'delivered')).toHaveProperty('saved');
    expect(service.orders().find((order) => order.id === id)?.payment).toBe('pending');
  });
});
