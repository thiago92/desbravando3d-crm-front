import { TestBed } from '@angular/core/testing';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { UnitSuppliesPreview } from '../insumos/unit-supplies-preview';
import { ProductsPreview } from '../produtos/products-preview';
import { ContactsPreview } from '../clientes-lojas/contacts-preview';
import { FinishedProductsPreview } from '../produtos/finished-products-preview';
import { CashLedgerPreview } from '../financeiro/cash-ledger-preview';
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

  it('vincula por ID o contato cadastrado e preserva nome livre quando não há cadastro', () => {
    const service = TestBed.inject(OrdersPreview);
    const contacts = TestBed.inject(ContactsPreview);
    const contact = contacts.create({ name: 'Cliente Vinculado', typeId: 'person', phone: null, whatsapp: null }, []);
    expect(contact).toHaveProperty('saved');
    if (!('saved' in contact)) return;
    const input = { customer: 'Cliente Vinculado', items: [{ productId: 'preview-1', sizeId: 'vase-small', quantity: 1, marginId: 3 }], discountPercent: 0, deliveryDate: null };
    expect(service.create(input)).toMatchObject({ saved: { customerId: contact.saved.id } });
    expect(service.create({ ...input, customer: 'Cliente sem cadastro' })).toMatchObject({ saved: { customer: 'Cliente sem cadastro' } });
    expect(service.create({ ...input, customerId: 'id-inexistente' })).toHaveProperty('error');
  });

  it('cancela orçamento sem baixar estoque, preserva o registro e impede confirmar depois', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const quote = service.orders().find((order) => order.number === '#013')!;
    const quotePrice = service.priceFor(quote)?.total;
    const before = inventory.filaments().map((filament) => filament.balanceGrams);
    expect(service.cancelOrder(quote.id, 'Cliente desistiu')).toMatchObject({ saved: { cancelReason: 'Cliente desistiu', stage: 'request' } });
    expect(service.orders().find((order) => order.id === quote.id)?.cancelledAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(service.cancelOrder(quote.id, '')).toHaveProperty('error');
    expect(service.advance(quote.id, 'confirmed')).toHaveProperty('error');
    expect(service.saveDiscount(quote.id, 10)).toHaveProperty('error');
    const filament = inventory.filaments()[0];
    inventory.save({ name: filament.name, material: filament.material, color: filament.color, pricePerKg: 200 }, { mode: 'add', grams: null }, filament.id);
    expect(service.priceFor(service.orders().find((order) => order.id === quote.id)!)?.total).toBe(quotePrice);
    expect(inventory.filaments().map((filament) => filament.balanceGrams)).toEqual(before);
    const delivered = service.orders().find((order) => order.number === '#006')!;
    expect(service.cancelOrder(delivered.id, '')).toHaveProperty('error');
  });

  it('estorna insumos de uma encomenda confirmada que ainda não iniciou impressão', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    const before = inventory.filaments().map((item) => item.balanceGrams);
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('saved');
    expect(inventory.filaments().map((item) => item.balanceGrams)).not.toEqual(before);
    expect(service.cancelOrder(order.id, '')).toHaveProperty('saved');
    expect(inventory.filaments().map((item) => item.balanceGrams)).toEqual(before);
    expect(service.pendingFor(service.orders().find((entry) => entry.id === order.id)!)).toBe(0);
  });

  it('devolve filamento e insumo por unidade ao cancelar antes da impressão', () => {
    const service = TestBed.inject(OrdersPreview);
    const catalog = TestBed.inject(ProductsPreview);
    const filaments = TestBed.inject(FilamentsPreview);
    const supplies = TestBed.inject(UnitSuppliesPreview);
    const created = supplies.save('Argola', 0.5, { mode: 'replace', units: 10 });
    if (!('saved' in created)) throw new Error('Falha ao criar insumo de teste');
    const product = catalog.products().find((entry) => entry.id === 'preview-1')!;
    catalog.save({ ...product, sizes: product.sizes.map((size) => size.id === 'vase-small' ? { ...size, unitMaterials: [{ supplyId: created.saved.id, unitsPerUnit: 1 }] } : size) }, product.id);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    const before = filaments.filaments()[0].balanceGrams;
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('saved');
    expect(filaments.filaments()[0].balanceGrams).toBe(before - 200);
    expect(supplies.supplies()[0].balanceUnits).toBe(6);
    expect(service.cancelOrder(order.id, '')).toHaveProperty('saved');
    expect(filaments.filaments()[0].balanceGrams).toBe(before);
    expect(supplies.supplies()[0].balanceUnits).toBe(10);
  });

  it('mantém consumo após impressão iniciada e põe peças prontas canceladas no estoque do produto', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const finished = TestBed.inject(FinishedProductsPreview);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('saved');
    const afterConfirmation = inventory.filaments().map((item) => item.balanceGrams);
    expect(service.advance(order.id, 'printing')).toHaveProperty('saved');
    expect(service.cancelOrder(order.id, '')).toHaveProperty('saved');
    expect(inventory.filaments().map((item) => item.balanceGrams)).toEqual(afterConfirmation);
    expect(finished.quantity('preview-1')).toBe(0);
    const ready = service.orders().find((entry) => entry.number === '#007')!;
    expect(service.cancelOrder(ready.id, '')).toHaveProperty('saved');
    expect(finished.quantity('preview-1', 'vase-small')).toBe(3);
    expect(service.cancelOrder(ready.id, '')).toHaveProperty('error');
    expect(finished.quantity('preview-1', 'vase-small')).toBe(3);
  });

  it('não coloca peça com falha ainda pendente no saldo de produto pronto ao cancelar', () => {
    const service = TestBed.inject(OrdersPreview);
    const finished = TestBed.inject(FinishedProductsPreview);
    const order = service.orders().find((entry) => entry.number === '#007')!;
    expect(service.recordFailure(order.id, { date: '2026-11-16', itemIndex: 0, quantity: 1, reason: '', materials: [{ filamentId: 'filament-preview-1', grams: 10 }], hours: 1 })).toHaveProperty('saved');
    expect(service.cancelOrder(order.id, '')).toHaveProperty('saved');
    expect(finished.quantity('preview-1', 'vase-small')).toBe(2);
  });

  it('não credita produto pronto com parte ainda pendente de reimpressão', () => {
    const service = TestBed.inject(OrdersPreview);
    const finished = TestBed.inject(FinishedProductsPreview);
    const order = service.orders().find((entry) => entry.number === '#007')!;
    expect(service.recordFailure(order.id, { date: '2026-11-16', itemIndex: 0, quantity: 0, materialMode: 'manual', reason: '', materials: [{ filamentId: 'filament-preview-1', grams: 10 }], hours: 1 })).toHaveProperty('saved');
    expect(service.cancelOrder(order.id, '')).toHaveProperty('saved');
    expect(finished.quantity('preview-1', 'vase-small')).toBe(0);
  });

  it('mantém a entrada recebida e encerra o saldo a cobrar ao cancelar', () => {
    const service = TestBed.inject(OrdersPreview);
    const ledger = TestBed.inject(CashLedgerPreview);
    const order = service.orders().find((entry) => entry.number === '#011')!;
    expect(service.recordPayment(order.id, 5, '2026-11-16', 'Pix')).toHaveProperty('saved');
    expect(service.cancelOrder(order.id, 'Cliente desistiu')).toHaveProperty('saved');
    const cancelled = service.orders().find((entry) => entry.id === order.id)!;
    expect(service.receivedFor(cancelled)).toBe(5);
    expect(service.pendingFor(cancelled)).toBe(0);
    expect(ledger.transactions()).toMatchObject([{ amount: 5, kind: 'receipt' }]);
    expect(service.recordPayment(order.id, 1, '2026-11-16', 'Pix')).toHaveProperty('error');
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

  it('inclui argolas no preço e só baixa ambos os estoques quando há saldo suficiente', () => {
    const service = TestBed.inject(OrdersPreview);
    const catalog = TestBed.inject(ProductsPreview);
    const filaments = TestBed.inject(FilamentsPreview);
    const supplies = TestBed.inject(UnitSuppliesPreview);
    const saved = supplies.save('Argola para chaveiro', 0.5, { mode: 'replace', units: 1 });
    expect(saved).toHaveProperty('saved');
    if (!('saved' in saved)) return;
    const product = catalog.products().find((entry) => entry.id === 'preview-1')!;
    catalog.save({ ...product, sizes: product.sizes.map((size) => size.id === 'vase-small' ? { ...size, unitMaterials: [{ supplyId: saved.saved.id, unitsPerUnit: 1 }] } : size) }, product.id);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    const filamentBefore = filaments.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams;
    expect(service.priceFor(order)?.items[0].unitSupplyCost).toBe(0.5);
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('error');
    expect(filaments.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(filamentBefore);
    expect(supplies.supplies()[0].balanceUnits).toBe(1);
    expect(service.orders().find((entry) => entry.id === order.id)?.stage).toBe('request');
    supplies.save(saved.saved.name, saved.saved.pricePerUnit, { mode: 'add', units: 3 }, saved.saved.id);
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('saved');
    expect(supplies.supplies()[0].balanceUnits).toBe(0);
    expect(filaments.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBeLessThan(filamentBefore);
    expect(service.returnToQuote(order.id)).toHaveProperty('saved');
    expect(supplies.supplies()[0].balanceUnits).toBe(4);
    expect(filaments.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(filamentBefore);
  });

  it('usa o consumo real por produto na baixa sem alterar o orçamento e devolve a baixa registrada', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    const beforePrice = service.priceFor(order)!.total;
    const beforeRed = inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams;
    const beforeBlack = inventory.filaments().find((entry) => entry.id === 'filament-preview-2')!.balanceGrams;
    expect(service.saveItemConsumption(order.id, 0, [{ filamentId: 'filament-preview-1', grams: 110 }, { filamentId: 'filament-preview-2', grams: 20 }])).toHaveProperty('saved');
    expect(service.priceFor(service.orders().find((entry) => entry.id === order.id)!)?.total).toBe(beforePrice);
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('saved');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(beforeRed - 110);
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-2')!.balanceGrams).toBeLessThan(beforeBlack - 20);
    expect(service.orders().find((entry) => entry.id === order.id)?.stockConsumption).toContainEqual({ filamentId: 'filament-preview-1', grams: 110 });
    expect(service.returnToQuote(order.id)).toHaveProperty('saved');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(beforeRed);
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-2')!.balanceGrams).toBe(beforeBlack);
  });

  it('rejeita consumo real inválido antes de qualquer baixa', () => {
    const service = TestBed.inject(OrdersPreview);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    expect(service.saveItemConsumption(order.id, 0, [])).toHaveProperty('error');
    expect(service.saveItemConsumption(order.id, 0, [{ filamentId: 'filament-preview-1', grams: 0 }])).toHaveProperty('error');
    expect(service.saveItemConsumption(order.id, 0, [{ filamentId: 'filament-preview-1', grams: 1 }, { filamentId: 'filament-preview-1', grams: 2 }])).toHaveProperty('error');
    expect(order.items[0].filamentConsumptionOverride).toBeUndefined();
    expect(service.saveItemConsumption(order.id, 0, [{ filamentId: 'filament-preview-1', grams: 700 }])).toHaveProperty('saved');
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('error');
    expect(TestBed.inject(FilamentsPreview).filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(500);
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

  it('registra perda sem segunda baixa, exige reposição com saldo e preserva o preço e o caixa', () => {
    const service = TestBed.inject(OrdersPreview);
    const inventory = TestBed.inject(FilamentsPreview);
    const order = service.orders().find((entry) => entry.number === '#013')!;
    const balance = () => inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams;
    const initial = balance();
    expect(service.advance(order.id, 'confirmed')).toHaveProperty('saved');
    expect(service.advance(order.id, 'printing')).toHaveProperty('saved');
    const afterConfirmation = balance();
    const price = service.priceFor(service.orders().find((entry) => entry.id === order.id)!)!.total;
    const failure = { date: '2026-11-16', itemIndex: 0, quantity: 1, reason: 'Peça soltou da mesa', materials: [{ filamentId: 'filament-preview-1', grams: 35 }], hours: 1.5 };
    expect(service.recordFailure(order.id, failure)).toHaveProperty('saved');
    expect(balance()).toBe(afterConfirmation);
    expect(service.advance(order.id, 'ready')).toHaveProperty('error');
    expect(service.recordFailure(order.id, failure)).toHaveProperty('error');
    expect(service.startRetry(order.id, [{ filamentId: 'filament-preview-1', grams: 999 }])).toHaveProperty('error');
    expect(balance()).toBe(afterConfirmation);
    expect(service.startRetry(order.id, [{ filamentId: 'filament-preview-1', grams: 40 }])).toHaveProperty('saved');
    expect(balance()).toBe(afterConfirmation - 40);
    const updated = service.orders().find((entry) => entry.id === order.id)!;
    expect(updated.failures).toMatchObject([{ quantity: 1, materialCost: 4.2, energyCost: 0.18, totalCost: 4.38 }]);
    expect(service.priceFor(updated)?.total).toBe(price);
    expect(service.receivedFor(updated)).toBe(0);
    expect(service.advance(order.id, 'ready')).toHaveProperty('saved');
    expect(balance()).toBe(initial - 240);
  });

  it('permite registrar falha quando pronta sem mudar a etapa e bloqueia a entrega até nova tentativa', () => {
    const service = TestBed.inject(OrdersPreview);
    const order = service.orders().find((entry) => entry.number === '#007')!;
    expect(service.recordFailure(order.id, { date: '2026-11-16', itemIndex: 0, quantity: 1, reason: '', materials: [{ filamentId: 'filament-preview-1', grams: 10 }], hours: 1 })).toMatchObject({ saved: { stage: 'ready', retryPending: true } });
    expect(service.advance(order.id, 'delivered')).toHaveProperty('error');
    expect(service.startRetry(order.id, [{ filamentId: 'filament-preview-1', grams: 10 }])).toMatchObject({ saved: { stage: 'ready', retryPending: false } });
    expect(service.advance(order.id, 'delivered')).toHaveProperty('saved');
  });
});
