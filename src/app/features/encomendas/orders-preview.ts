import { Injectable, inject, signal } from '@angular/core';
import { latestEnergySetting, readPercentages } from '../calculadora/pricing-settings-preview';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { UnitSuppliesPreview } from '../insumos/unit-supplies-preview';
import { ProductsPreview, type ProductSize } from '../produtos/products-preview';
import { calculateOrderPrice, type OrderPrice } from './order-pricing';
import { CashLedgerPreview, type PaymentMethodPreview, validMoney } from '../financeiro/cash-ledger-preview';
import { ContactsPreview } from '../clientes-lojas/contacts-preview';
import { normalizeSearch } from '../../shared/utils/presentation';
import { FinishedProductsPreview } from '../produtos/finished-products-preview';

/** Etapas e dados da prévia; o contrato da API ainda será definido. */
export type OrderStagePreview = 'request' | 'confirmed' | 'printing' | 'ready' | 'delivered';
export interface OrderItemPreview {
  name: string;
  productId: string;
  sizeId: string;
  sizeSnapshot: ProductSize | null;
  quantity: number;
  marginId: number | null;
  filamentConsumptionOverride?: { filamentId: string; grams: number }[] | null;
}
export interface OrderPreview {
  id: string;
  number: string;
  customer: string;
  customerId?: string;
  stage: OrderStagePreview;
  items: OrderItemPreview[];
  discountPercent: number;
  pricingSnapshot: OrderPrice | null;
  stockConsumption?: { filamentId: string; grams: number }[];
  unitStockConsumption?: { supplyId: string; units: number }[];
  deliveryDate: string | null;
  payment: 'not-defined' | 'pending' | 'received';
  receivedAmount?: number;
  failures?: PrintFailurePreview[];
  retryPending?: boolean;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface PrintFailurePreview {
  id: string;
  materialMode: 'whole' | 'manual';
  date: string;
  itemIndex: number;
  quantity: number;
  reason: string;
  materials: { filamentId: string; grams: number; pricePerKg: number }[];
  hours: number;
  energyCost: number;
  materialCost: number;
  totalCost: number;
}

export interface NewOrderPreview {
  customer: string;
  customerId?: string;
  items: { productId: string; sizeId: string; quantity: number; marginId: number | null }[];
  discountPercent: number;
  deliveryDate: string | null;
}

export type OrderMutationResult = { saved: OrderPreview } | { error: string };
export const orderColumn = (order: OrderPreview): OrderStagePreview => order.stage;
export const nextOrderAction: Record<OrderStagePreview, { target: OrderStagePreview; label: string } | null> = {
  request: { target: 'confirmed', label: 'Confirmar encomenda' },
  confirmed: { target: 'printing', label: 'Iniciar impressão' },
  printing: { target: 'ready', label: 'Marcar como pronta para entrega' },
  ready: { target: 'delivered', label: 'Marcar como entregue' },
  delivered: null,
};

const defaultMargin = (): number | null => readPercentages().find((entry) => entry.name === 'Padrão')?.id ?? readPercentages()[0]?.id ?? null;
const item = (name: string, quantity: number, productId: string, sizeId: string): OrderItemPreview =>
  ({ name, quantity, productId, sizeId, sizeSnapshot: null, marginId: defaultMargin() });
const deliveryIn = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const validHundredth = (value: number): boolean => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const validDeliveryDate = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  const normalized = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return normalized === date;
};

const previewOrders: OrderPreview[] = [
    { id: 'order-preview-1', number: '#014', customer: 'Maria Silva', stage: 'request', items: [item('Vaso geométrico', 2, 'preview-1', 'vase-extra'), item('Organizador de mesa', 2, 'preview-3', 'organizer-standard'), item('Suporte para celular', 1, 'preview-2', 'stand-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: null, payment: 'not-defined' },
    { id: 'order-preview-2', number: '#015', customer: 'João Oliveira', stage: 'request', items: [item('Suporte para celular', 1, 'preview-2', 'stand-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: null, payment: 'not-defined' },
    { id: 'order-preview-3', number: '#012', customer: 'Ana Costa', stage: 'request', items: [item('Organizador de mesa', 3, 'preview-3', 'organizer-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: null, payment: 'not-defined' },
    { id: 'order-preview-4', number: '#013', customer: 'Carlos Santos', stage: 'request', items: [item('Vaso geométrico', 4, 'preview-1', 'vase-small'), item('Suporte para celular', 2, 'preview-2', 'stand-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: deliveryIn(14), payment: 'pending' },
    { id: 'order-preview-5', number: '#010', customer: 'Beatriz Lima', stage: 'confirmed', items: [item('Vaso geométrico', 2, 'preview-1', 'vase-medium')], discountPercent: 0, pricingSnapshot: null, deliveryDate: deliveryIn(8), payment: 'received' },
    { id: 'order-preview-6', number: '#011', customer: 'Pedro Almeida', stage: 'confirmed', items: [item('Suporte para celular', 5, 'preview-2', 'stand-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: deliveryIn(10), payment: 'pending' },
    { id: 'order-preview-7', number: '#008', customer: 'Mariana Souza', stage: 'printing', items: [item('Organizador de mesa', 2, 'preview-3', 'organizer-standard'), item('Vaso geométrico', 1, 'preview-1', 'vase-large')], discountPercent: 0, pricingSnapshot: null, deliveryDate: deliveryIn(5), payment: 'received' },
    { id: 'order-preview-8', number: '#009', customer: 'Lucas Ferreira', stage: 'printing', items: [item('Suporte para celular', 2, 'preview-2', 'stand-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: null, payment: 'pending' },
    { id: 'order-preview-9', number: '#007', customer: 'Juliana Martins', stage: 'ready', items: [item('Vaso geométrico', 3, 'preview-1', 'vase-small')], discountPercent: 0, pricingSnapshot: null, deliveryDate: deliveryIn(2), payment: 'received' },
    { id: 'order-preview-10', number: '#006', customer: 'Rafael Rocha', stage: 'delivered', items: [item('Organizador de mesa', 2, 'preview-3', 'organizer-standard')], discountPercent: 0, pricingSnapshot: null, deliveryDate: null, payment: 'pending' },
];

@Injectable({ providedIn: 'root' })
export class OrdersPreview {
  private readonly inventory = inject(FilamentsPreview);
  private readonly unitInventory = inject(UnitSuppliesPreview);
  private readonly catalog = inject(ProductsPreview);
  private readonly cashLedger = inject(CashLedgerPreview);
  private readonly contacts = inject(ContactsPreview);
  private readonly finishedProducts = inject(FinishedProductsPreview);
  private readonly entries = signal<readonly OrderPreview[]>(previewOrders.map((order) => order.stage === 'request' ? order : {
    ...order,
    items: order.items.map((entry) => ({ ...entry, sizeSnapshot: this.copySize(this.catalog.products().find((product) => product.id === entry.productId)?.sizes.find((size) => size.id === entry.sizeId) ?? null) })),
    pricingSnapshot: calculateOrderPrice(order, this.catalog.products(), this.inventory.filaments(), latestEnergySetting(), readPercentages(), this.unitInventory.supplies()),
  }));
  readonly orders = this.entries.asReadonly();

  priceFor(order: OrderPreview): OrderPrice | null {
    return order.pricingSnapshot ?? calculateOrderPrice(order, this.catalog.products(), this.inventory.filaments(), latestEnergySetting(), readPercentages(), this.unitInventory.supplies());
  }

  receivedFor(order: OrderPreview): number {
    return order.receivedAmount ?? (order.payment === 'received' ? this.priceFor(order)?.total ?? 0 : 0);
  }

  pendingFor(order: OrderPreview): number {
    if (order.stage === 'request' || order.cancelledAt) return 0;
    return Math.max(0, Math.round(((this.priceFor(order)?.total ?? 0) - this.receivedFor(order)) * 100) / 100);
  }

  recordPayment(id: string, amount: number, date: string, method: PaymentMethodPreview, note = ''): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage === 'request' || order.cancelledAt) return { error: 'Confirme uma encomenda ativa antes de registrar um recebimento.' };
    const total = this.priceFor(order)?.total;
    if (total == null) return { error: 'O valor da encomenda não está disponível.' };
    const pending = this.pendingFor(order);
    if (!validMoney(amount) || amount > pending) return { error: 'Informe um valor maior que zero e até o saldo pendente, com duas casas decimais.' };
    const receipt = this.cashLedger.addReceipt({ date, amount, origin: 'order', reference: order.number, party: order.customer, method, note });
    if ('error' in receipt) return receipt;
    const receivedAmount = Math.round((this.receivedFor(order) + amount) * 100) / 100;
    return this.update({ ...order, receivedAmount, payment: receivedAmount >= total ? 'received' : 'pending' });
  }

  sizeFor(item: OrderItemPreview): ProductSize | null {
    return item.sizeSnapshot ?? this.catalog.products().find((product) => product.id === item.productId)?.sizes.find((size) => size.id === item.sizeId) ?? null;
  }

  create(input: NewOrderPreview): OrderMutationResult {
    const customer = input.customer.trim();
    if (!customer) return { error: 'Informe o nome do cliente.' };
    const selectedContact = input.customerId ? this.contacts.contacts().find((contact) => contact.id === input.customerId) : this.contacts.contacts().find((contact) => normalizeSearch(contact.name) === normalizeSearch(customer));
    if (input.customerId && (!selectedContact || normalizeSearch(selectedContact.name) !== normalizeSearch(customer))) return { error: 'O contato selecionado não corresponde ao cliente informado.' };
    if (!input.items.length) return { error: 'Adicione pelo menos um produto à encomenda.' };
    if (!validHundredth(input.discountPercent) || input.discountPercent > 100) return { error: 'Informe um desconto de 0% a 100%, com até duas casas decimais.' };
    if (input.deliveryDate !== null && !validDeliveryDate(input.deliveryDate)) return { error: 'Informe uma data válida para a entrega.' };
    const products = this.catalog.products();
    const margins = readPercentages();
    const items: OrderItemPreview[] = [];
    for (const entry of input.items) {
      const product = products.find((candidate) => candidate.id === entry.productId);
      if (!product) return { error: 'Escolha um produto cadastrado para cada item.' };
      if (!product.sizes.some((size) => size.id === entry.sizeId)) return { error: `Escolha um tamanho cadastrado para ${product.name}.` };
      if (!Number.isSafeInteger(entry.quantity) || entry.quantity < 1) return { error: 'Informe uma quantidade inteira maior que zero para cada item.' };
      if (!margins.some((margin) => margin.id === entry.marginId)) return { error: 'Escolha uma margem cadastrada para cada item.' };
      items.push({ name: product.name, productId: product.id, sizeId: entry.sizeId, sizeSnapshot: null, quantity: entry.quantity, marginId: entry.marginId });
    }
    const nextNumber = Math.max(0, ...this.entries().map((order) => Number(order.number.replace(/^#/, '')) || 0)) + 1;
    const saved: OrderPreview = {
      id: crypto.randomUUID(), number: `#${String(nextNumber).padStart(3, '0')}`, customer, customerId: selectedContact?.id,
      stage: 'request', items, discountPercent: input.discountPercent, pricingSnapshot: null,
      deliveryDate: input.deliveryDate, payment: 'not-defined',
    };
    this.entries.update((orders) => [...orders, saved]);
    return { saved };
  }

  saveDiscount(id: string, percent: number): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request' || order.cancelledAt) return { error: 'O desconto só pode ser alterado em orçamentos ativos.' };
    if (!validHundredth(percent) || percent > 100) return { error: 'Informe um desconto de 0% a 100%, com até duas casas decimais.' };
    return this.update({ ...order, discountPercent: percent });
  }

  saveDeliveryDate(id: string, date: string | null): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request' || order.cancelledAt) return { error: 'O prazo só pode ser alterado em orçamentos ativos.' };
    if (date !== null) {
      const parsed = new Date(`${date}T12:00:00`);
      const normalized = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || normalized !== date) return { error: 'Informe uma data válida para a entrega.' };
    }
    return this.update({ ...order, deliveryDate: date });
  }

  saveItemSelection(id: string, index: number, sizeId: string, marginId: number | null): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request' || order.cancelledAt || !order.items[index]) return { error: 'A precificação só pode ser alterada em orçamentos ativos.' };
    const product = this.catalog.products().find((entry) => entry.id === order.items[index].productId);
    if (!product?.sizes.some((size) => size.id === sizeId)) return { error: 'Escolha um tamanho cadastrado para o produto.' };
    if (!readPercentages().some((entry) => entry.id === marginId)) return { error: 'Escolha uma margem cadastrada em Precificação.' };
    const items = order.items.map((entry, position) => position === index ? { ...entry, sizeId, marginId, filamentConsumptionOverride: sizeId === entry.sizeId ? entry.filamentConsumptionOverride : null } : entry);
    return this.update({ ...order, items });
  }

  saveItemConsumption(id: string, index: number, lines: { filamentId: string; grams: number }[] | null): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request' || order.cancelledAt || !order.items[index]) return { error: 'O consumo de estoque só pode ser alterado em orçamentos ativos.' };
    if (lines !== null) {
      if (!lines.length || lines.some((line) => !this.inventory.filaments().some((filament) => filament.id === line.filamentId) || !validHundredth(line.grams) || line.grams <= 0) || new Set(lines.map((line) => line.filamentId)).size !== lines.length) {
        return { error: 'Informe pelo menos um filamento cadastrado, com gramas positivas e até duas casas decimais, sem repetições.' };
      }
    }
    const items = order.items.map((entry, position) => position === index ? { ...entry, filamentConsumptionOverride: lines?.map((line) => ({ ...line })) ?? null } : entry);
    return this.update({ ...order, items });
  }

  advance(id: string, target: OrderStagePreview): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.cancelledAt || nextOrderAction[order.stage]?.target !== target) return { error: 'Esta mudança de etapa não está disponível para a encomenda.' };
    if (order.retryPending) return { error: 'Inicie uma nova tentativa antes de avançar a encomenda.' };
    if (target === 'confirmed') {
      const price = this.priceFor(order);
      if (!price) return { error: 'Complete a precificação dos produtos e cadastre energia e margens antes de confirmar.' };
      const requirements = new Map<string, number>();
      const unitRequirements = new Map<string, number>();
      for (const entry of order.items) {
        const size = this.sizeFor(entry);
        for (const line of entry.filamentConsumptionOverride ?? size?.materials ?? []) {
          const grams = 'grams' in line ? line.grams : line.gramsPerUnit * entry.quantity;
          requirements.set(line.filamentId, (requirements.get(line.filamentId) ?? 0) + grams);
        }
        for (const line of size?.unitMaterials ?? []) {
          unitRequirements.set(line.supplyId, (unitRequirements.get(line.supplyId) ?? 0) + line.unitsPerUnit * entry.quantity);
        }
      }
      const filamentValidation = this.inventory.validateConsumption(requirements);
      if ('error' in filamentValidation) return filamentValidation;
      const unitValidation = this.unitInventory.validateConsumption(unitRequirements);
      if ('error' in unitValidation) return unitValidation;
      const result = this.inventory.consume(requirements);
      if ('error' in result) return result;
      const unitResult = this.unitInventory.consume(unitRequirements);
      if ('error' in unitResult) {
        this.inventory.restore(requirements);
        return unitResult;
      }
      return this.update({ ...order, stage: target, pricingSnapshot: price, stockConsumption: [...requirements].map(([filamentId, grams]) => ({ filamentId, grams })), unitStockConsumption: [...unitRequirements].map(([supplyId, units]) => ({ supplyId, units })), items: order.items.map((entry) => ({ ...entry, sizeSnapshot: this.copySize(this.sizeFor(entry)) })) });
    }
    return this.update({ ...order, stage: target });
  }

  recordFailure(id: string, input: { date: string; itemIndex: number; quantity: number; reason: string; materialMode?: 'whole' | 'manual'; materials: { filamentId: string; grams: number }[]; hours: number }): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.cancelledAt || !['printing', 'ready'].includes(order.stage) || order.retryPending) return { error: 'A falha só pode ser registrada em uma encomenda ativa, em impressão ou pronta para entrega.' };
    const item = order.items[input.itemIndex];
    if (!item || !Number.isSafeInteger(input.quantity) || (input.materialMode === 'manual' ? input.quantity !== 0 : input.quantity < 1 || input.quantity > item.quantity)) return { error: 'Escolha o item e uma quantidade válida de peças perdidas.' };
    if (!validDeliveryDate(input.date)) return { error: 'Informe uma data válida para a falha.' };
    if (!validHundredth(input.hours) || input.hours <= 0) return { error: 'Informe as horas gastas, maiores que zero e com até duas casas decimais.' };
    if (!input.materials.length || input.materials.some((line) => !this.inventory.filaments().some((filament) => filament.id === line.filamentId) || !validHundredth(line.grams) || line.grams <= 0) || new Set(input.materials.map((line) => line.filamentId)).size !== input.materials.length) return { error: 'Informe filamentos distintos e gramas positivas, com até duas casas decimais.' };
    const materials = input.materials.map((line) => ({ ...line, pricePerKg: this.inventory.filaments().find((filament) => filament.id === line.filamentId)!.pricePerKg }));
    const materialCost = Math.round(materials.reduce((sum, line) => sum + line.grams * line.pricePerKg / 1000, 0) * 100) / 100;
    const energy = order.pricingSnapshot ?? this.priceFor(order);
    const energyCost = Math.round(((energy?.averagePowerW ?? 0) / 1000) * input.hours * (energy?.tariffPerKwh ?? 0) * 100) / 100;
    const failure: PrintFailurePreview = { id: crypto.randomUUID(), materialMode: input.materialMode ?? 'whole', date: input.date, itemIndex: input.itemIndex, quantity: input.quantity, reason: input.reason.trim().slice(0, 500), materials, hours: input.hours, materialCost, energyCost, totalCost: Math.round((materialCost + energyCost) * 100) / 100 };
    return this.update({ ...order, failures: [...(order.failures ?? []), failure], retryPending: true });
  }

  startRetry(id: string, materials: { filamentId: string; grams: number }[]): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.cancelledAt || !['printing', 'ready'].includes(order.stage) || !order.retryPending) return { error: 'Registre uma falha antes de iniciar uma nova tentativa.' };
    if (!materials.length || materials.some((line) => !validHundredth(line.grams) || line.grams <= 0) || new Set(materials.map((line) => line.filamentId)).size !== materials.length) return { error: 'Informe filamentos distintos e gramas positivas para a nova tentativa.' };
    const requirements = new Map(materials.map((line) => [line.filamentId, line.grams]));
    const result = this.inventory.consume(requirements);
    if ('error' in result) return result;
    return this.update({ ...order, retryPending: false });
  }

  cancelOrder(id: string, reason: string): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage === 'delivered' || order.cancelledAt) return { error: 'A encomenda entregue ou já cancelada não pode ser cancelada.' };
    if (reason.trim().length > 500) return { error: 'O motivo deve ter até 500 caracteres.' };
    if (order.stage === 'confirmed') {
      const restored = this.restoreConfirmationConsumption(order);
      if ('error' in restored) return restored;
    }
    if (order.stage === 'ready') {
      const unresolved = order.retryPending ? order.failures?.at(-1) : undefined;
      this.finishedProducts.add(order.items.flatMap((item, index) => {
        const quantity = unresolved?.itemIndex === index && unresolved.materialMode === 'manual' ? 0 : item.quantity - (unresolved?.itemIndex === index ? unresolved.quantity : 0);
        return quantity > 0 ? [{ productId: item.productId, sizeId: item.sizeId, quantity }] : [];
      }));
    }
    const date = new Date();
    const cancelledAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return this.update({ ...order, cancelledAt, cancelReason: reason.trim(), pricingSnapshot: this.priceFor(order), stockConsumption: order.stage === 'confirmed' ? undefined : order.stockConsumption, unitStockConsumption: order.stage === 'confirmed' ? undefined : order.unitStockConsumption });
  }

  returnToQuote(id: string): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'confirmed') return { error: 'Somente encomendas confirmadas podem voltar para Em orçamento.' };
    if (this.receivedFor(order) > 0) return { error: 'Esta encomenda já tem valor recebido. O estorno financeiro precisa ser definido antes de voltar para Em orçamento.' };
    // Os exemplos já confirmados não efetuaram baixa nesta visita.
    const restored = this.restoreConfirmationConsumption(order);
    if ('error' in restored) return restored;
    return this.update({ ...order, stage: 'request', pricingSnapshot: null, stockConsumption: undefined, unitStockConsumption: undefined, items: order.items.map((entry) => ({ ...entry, sizeSnapshot: null })) });
  }

  private restoreConfirmationConsumption(order: OrderPreview): { restored: true } | { error: string } {
    const units = new Map((order.unitStockConsumption ?? []).map(({ supplyId, units }) => [supplyId, units]));
    const filaments = new Map((order.stockConsumption ?? []).map(({ filamentId, grams }) => [filamentId, grams]));
    if (units.size) {
      const result = this.unitInventory.restore(units);
      if ('error' in result) return result;
    }
    if (filaments.size) {
      const result = this.inventory.restore(filaments);
      if ('error' in result) {
        if (units.size) this.unitInventory.consume(units);
        return result;
      }
    }
    return { restored: true };
  }

  private update(saved: OrderPreview): OrderMutationResult {
    this.entries.update((items) => items.map((entry) => entry.id === saved.id ? saved : entry));
    return { saved };
  }

  private copySize(size: ProductSize | null): ProductSize | null {
    return size ? { ...size, materials: size.materials.map((line) => ({ ...line })), unitMaterials: size.unitMaterials?.map((line) => ({ ...line })) } : null;
  }
}
