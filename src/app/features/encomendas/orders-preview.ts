import { Injectable, inject, signal } from '@angular/core';
import { latestEnergySetting, readPercentages } from '../calculadora/pricing-settings-preview';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { ProductsPreview, type ProductSize } from '../produtos/products-preview';
import { calculateOrderPrice, type OrderPrice } from './order-pricing';

/** Etapas e dados da prévia; o contrato da API ainda será definido. */
export type OrderStagePreview = 'request' | 'confirmed' | 'printing' | 'ready' | 'delivered';
export interface OrderItemPreview {
  name: string;
  productId: string;
  sizeId: string;
  sizeSnapshot: ProductSize | null;
  quantity: number;
  marginId: number | null;
}
export interface OrderPreview {
  id: string;
  number: string;
  customer: string;
  stage: OrderStagePreview;
  items: OrderItemPreview[];
  discountPercent: number;
  pricingSnapshot: OrderPrice | null;
  stockConsumption?: { filamentId: string; grams: number }[];
  deliveryDate: string | null;
  payment: 'not-defined' | 'pending' | 'received';
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
  private readonly catalog = inject(ProductsPreview);
  private readonly entries = signal<readonly OrderPreview[]>(previewOrders.map((order) => order.stage === 'request' ? order : {
    ...order,
    items: order.items.map((entry) => ({ ...entry, sizeSnapshot: this.copySize(this.catalog.products().find((product) => product.id === entry.productId)?.sizes.find((size) => size.id === entry.sizeId) ?? null) })),
    pricingSnapshot: calculateOrderPrice(order, this.catalog.products(), this.inventory.filaments(), latestEnergySetting(), readPercentages()),
  }));
  readonly orders = this.entries.asReadonly();

  priceFor(order: OrderPreview): OrderPrice | null {
    return order.pricingSnapshot ?? calculateOrderPrice(order, this.catalog.products(), this.inventory.filaments(), latestEnergySetting(), readPercentages());
  }

  sizeFor(item: OrderItemPreview): ProductSize | null {
    return item.sizeSnapshot ?? this.catalog.products().find((product) => product.id === item.productId)?.sizes.find((size) => size.id === item.sizeId) ?? null;
  }

  saveDiscount(id: string, percent: number): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request') return { error: 'O desconto só pode ser alterado antes da confirmação.' };
    if (!validHundredth(percent) || percent > 100) return { error: 'Informe um desconto de 0% a 100%, com até duas casas decimais.' };
    return this.update({ ...order, discountPercent: percent });
  }

  saveDeliveryDate(id: string, date: string | null): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request') return { error: 'O prazo só pode ser alterado antes da confirmação nesta prévia.' };
    if (date !== null) {
      const parsed = new Date(`${date}T12:00:00`);
      const normalized = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || normalized !== date) return { error: 'Informe uma data válida para a entrega.' };
    }
    return this.update({ ...order, deliveryDate: date });
  }

  saveItemSelection(id: string, index: number, sizeId: string, marginId: number | null): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'request' || !order.items[index]) return { error: 'A precificação só pode ser alterada antes da confirmação.' };
    const product = this.catalog.products().find((entry) => entry.id === order.items[index].productId);
    if (!product?.sizes.some((size) => size.id === sizeId)) return { error: 'Escolha um tamanho cadastrado para o produto.' };
    if (!readPercentages().some((entry) => entry.id === marginId)) return { error: 'Escolha uma margem cadastrada em Precificação.' };
    const items = order.items.map((entry, position) => position === index ? { ...entry, sizeId, marginId } : entry);
    return this.update({ ...order, items });
  }

  advance(id: string, target: OrderStagePreview): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || nextOrderAction[order.stage]?.target !== target) return { error: 'Esta mudança de etapa não está disponível para a encomenda.' };
    if (target === 'confirmed') {
      const price = this.priceFor(order);
      if (!price) return { error: 'Complete a precificação dos produtos e cadastre energia e margens antes de confirmar.' };
      const requirements = new Map<string, number>();
      for (const entry of order.items) for (const line of this.sizeFor(entry)?.materials ?? []) {
        requirements.set(line.filamentId, (requirements.get(line.filamentId) ?? 0) + line.gramsPerUnit * entry.quantity);
      }
      const result = this.inventory.consume(requirements);
      if ('error' in result) return result;
      return this.update({ ...order, stage: target, pricingSnapshot: price, stockConsumption: [...requirements].map(([filamentId, grams]) => ({ filamentId, grams })), items: order.items.map((entry) => ({ ...entry, sizeSnapshot: this.copySize(this.sizeFor(entry)) })) });
    }
    return this.update({ ...order, stage: target });
  }

  returnToQuote(id: string): OrderMutationResult {
    const order = this.entries().find((entry) => entry.id === id);
    if (!order || order.stage !== 'confirmed') return { error: 'Somente encomendas confirmadas podem voltar para Em orçamento.' };
    // Os exemplos já confirmados não efetuaram baixa nesta visita.
    if (order.stockConsumption?.length) {
      const result = this.inventory.restore(new Map(order.stockConsumption.map(({ filamentId, grams }) => [filamentId, grams])));
      if ('error' in result) return result;
    }
    return this.update({ ...order, stage: 'request', pricingSnapshot: null, stockConsumption: undefined, items: order.items.map((entry) => ({ ...entry, sizeSnapshot: null })) });
  }

  private update(saved: OrderPreview): OrderMutationResult {
    this.entries.update((items) => items.map((entry) => entry.id === saved.id ? saved : entry));
    return { saved };
  }

  private copySize(size: ProductSize | null): ProductSize | null {
    return size ? { ...size, materials: size.materials.map((line) => ({ ...line })) } : null;
  }
}
