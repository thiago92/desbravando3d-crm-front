import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { formatMoney } from '../../shared/utils/presentation';
import { ConsignmentsPreview, type Consignment } from '../consignado/consignado';
import { OrdersPreview, type OrderStagePreview } from '../encomendas/orders-preview';
import { CashLedgerPreview } from '../financeiro/cash-ledger-preview';
import { FilamentPurchasesPreview } from '../insumos/filament-purchases-preview';
import { cashBuckets, cashTotals, dateKey, percentChange, previousRange, type DateRange } from './dashboard-data';

type Segment = { label: string; value: number; color: string };
type Alert = { title: string; detail: string; link: string; id: string };
type Preset = 'month' | '30' | '90' | 'custom';
const money = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100;
const today = (): string => dateKey(new Date());
const startOfMonth = (): string => dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const pastDays = (days: number): string => {
  const value = new Date();
  value.setDate(value.getDate() - days + 1);
  return dateKey(value);
};
const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e', '#f43f5e', '#6366f1'];
const orderStages: { id: OrderStagePreview; label: string; color: string }[] = [
  { id: 'request', label: 'Em orçamento', color: '#f59e0b' },
  { id: 'confirmed', label: 'Confirmadas', color: '#3b82f6' },
  { id: 'printing', label: 'Em impressão', color: '#8b5cf6' },
  { id: 'ready', label: 'Prontas para entrega', color: '#22c55e' },
  { id: 'delivered', label: 'Entregues', color: '#14b8a6' },
];

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink, HlmButton, HlmInput, ...HlmNativeSelectImports],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly orders = inject(OrdersPreview);
  private readonly consignments = inject(ConsignmentsPreview);
  private readonly ledger = inject(CashLedgerPreview);
  private readonly filamentPurchases = inject(FilamentPurchasesPreview);
  protected readonly formatMoney = formatMoney;
  protected readonly preset = signal<Preset>('month');
  protected readonly from = signal(startOfMonth());
  protected readonly to = signal(today());
  protected readonly range = computed<DateRange>(() => ({ from: this.from(), to: this.to() }));
  protected readonly validRange = computed(() => !!this.from() && !!this.to() && this.from() <= this.to());
  protected readonly current = computed(() => this.validRange() ? cashTotals(this.ledger.transactions(), this.range()) : { received: 0, paid: 0, change: 0 });
  protected readonly previous = computed(() => this.validRange() ? cashTotals(this.ledger.transactions(), previousRange(this.range())) : { received: 0, paid: 0, change: 0 });
  protected readonly comparison = computed(() => ({
    received: percentChange(this.current().received, this.previous().received),
    paid: percentChange(this.current().paid, this.previous().paid),
  }));
  protected readonly buckets = computed(() => this.validRange() ? cashBuckets(this.ledger.transactions(), this.range()) : []);
  protected readonly maxBucket = computed(() => Math.max(1, ...this.buckets().flatMap((bucket) => [bucket.received, bucket.paid])));
  protected readonly currentEntries = computed(() => this.validRange() ? this.ledger.transactions().filter((entry) => entry.date >= this.from() && entry.date <= this.to()) : []);
  protected readonly receiptSegments = computed<Segment[]>(() => [
    { label: 'Encomendas', value: money(this.currentEntries().filter((entry) => entry.kind === 'receipt' && entry.origin === 'order').reduce((sum, entry) => sum + entry.amount, 0)), color: colors[0] },
    { label: 'Consignado', value: money(this.currentEntries().filter((entry) => entry.kind === 'receipt' && entry.origin === 'consignment').reduce((sum, entry) => sum + entry.amount, 0)), color: colors[1] },
  ].filter((item) => item.value > 0));
  protected readonly expenseSegments = computed<Segment[]>(() => {
    const categories = new Map<string, number>();
    for (const entry of this.currentEntries().filter((item) => item.kind === 'expense')) {
      const category = entry.category || 'Sem categoria';
      categories.set(category, money((categories.get(category) ?? 0) + entry.amount));
    }
    const sorted = [...categories].sort((a, b) => b[1] - a[1]);
    const visible = sorted.slice(0, 5).map(([label, value], index) => ({ label, value, color: colors[index] }));
    if (sorted.length > 5) visible.push({ label: 'Outras', value: money(sorted.slice(5).reduce((sum, item) => sum + item[1], 0)), color: colors[5] });
    return visible;
  });
  protected readonly orderRows = computed(() => orderStages.map((stage) => ({ ...stage, count: this.orders.orders().filter((order) => !order.cancelledAt && order.stage === stage.id).length })));
  protected readonly orderMax = computed(() => Math.max(1, ...this.orderRows().map((row) => row.count)));
  protected readonly activeOrders = computed(() => this.orders.orders().filter((order) => !order.cancelledAt && order.stage !== 'request' && order.stage !== 'delivered').length);
  protected readonly failuresInPeriod = computed(() => this.validRange() ? [
    ...this.orders.orders().flatMap((order) => order.failures ?? []),
    ...this.consignments.entries().flatMap((card) => card.failures ?? []),
  ].filter((failure) => failure.date >= this.from() && failure.date <= this.to()) : []);
  protected readonly failedPieces = computed(() => this.failuresInPeriod().reduce((sum, failure) => sum + failure.quantity, 0));
  protected readonly failureCost = computed(() => money(this.failuresInPeriod().reduce((sum, failure) => sum + failure.totalCost, 0)));
  protected readonly filamentEntries = computed(() => this.validRange() ? this.filamentPurchases.purchases().filter((purchase) => purchase.date >= this.from() && purchase.date <= this.to()) : []);
  protected readonly filamentEntryRows = computed(() => {
    const totals = new Map<string, { label: string; grams: number }>();
    for (const purchase of this.filamentEntries()) {
      const current = totals.get(purchase.filamentId);
      totals.set(purchase.filamentId, { label: purchase.filamentName, grams: (current?.grams ?? 0) + purchase.quantityGrams });
    }
    return [...totals.values()].sort((a, b) => b.grams - a.grams);
  });
  protected readonly filamentEntryMax = computed(() => Math.max(1, ...this.filamentEntryRows().map((row) => row.grams)));
  protected readonly filamentEntryTotalKg = computed(() => this.filamentEntries().reduce((sum, purchase) => sum + purchase.quantityGrams, 0) / 1000);
  protected readonly pendingOrders = computed(() => money(this.orders.orders().reduce((sum, order) => sum + this.orders.pendingFor(order), 0)));
  protected readonly consignmentUnits = computed(() => {
    const delivered = this.consignments.entries().filter((card) => card.stage === 'with-store');
    return {
      withStore: delivered.reduce((sum, card) => sum + Math.max(0, card.quantity - card.sold - card.returned), 0),
      sold: delivered.reduce((sum, card) => sum + card.sold, 0),
      returned: delivered.reduce((sum, card) => sum + card.returned, 0),
    };
  });
  protected readonly consignmentSegments = computed<Segment[]>(() => [
    { label: 'Com as lojas', value: this.consignmentUnits().withStore, color: colors[0] },
    { label: 'Vendidas', value: this.consignmentUnits().sold, color: colors[3] },
    { label: 'Devolvidas', value: this.consignmentUnits().returned, color: colors[2] },
  ].filter((item) => item.value > 0));
  protected readonly pendingConsignments = computed(() => money(this.consignments.entries().reduce((sum, card) => sum + (card.stage === 'with-store' ? Math.max(0, money(card.sold * card.unitPrice - card.received)) : 0), 0)));
  protected readonly totalPending = computed(() => money(this.pendingOrders() + this.pendingConsignments()));
  protected readonly soldValue = computed(() => money(this.consignments.entries().reduce((sum, card) => sum + (card.stage === 'with-store' ? card.sold * card.unitPrice : 0), 0)));
  protected readonly consignmentReceived = computed(() => money(this.consignments.entries().reduce((sum, card) => sum + (card.stage === 'with-store' ? card.received : 0), 0)));
  protected readonly alerts = computed<Alert[]>(() => {
    const ready = this.orders.orders().filter((order) => !order.cancelledAt && order.stage === 'ready').map((order) => ({ title: `${order.number} pronta para entrega`, detail: order.customer, link: '/encomendas', id: order.id }));
    const unpaid = this.orders.orders().filter((order) => !order.cancelledAt && order.stage === 'delivered' && this.orders.pendingFor(order) > 0).map((order) => ({ title: `${order.number} entregue com pagamento pendente`, detail: `${order.customer} · ${formatMoney(this.orders.pendingFor(order))}`, link: '/encomendas', id: order.id }));
    const consignments = this.consignments.entries().filter((card) => card.stage === 'with-store' && card.sold > 0 && money(card.sold * card.unitPrice - card.received) > 0).sort((a, b) => money(b.sold * b.unitPrice - b.received) - money(a.sold * a.unitPrice - a.received)).map((card: Consignment) => ({ title: `${card.number} aguardando repasse`, detail: `${card.store} · ${formatMoney(money(card.sold * card.unitPrice - card.received))}`, link: '/consignado', id: card.number }));
    return [...ready, ...unpaid, ...consignments].slice(0, 6);
  });

  protected selectPreset(value: Preset): void {
    this.preset.set(value);
    if (value === 'custom') return;
    this.from.set(value === 'month' ? startOfMonth() : pastDays(value === '30' ? 30 : 90));
    this.to.set(today());
  }
  protected setFrom(value: string): void { this.preset.set('custom'); this.from.set(value); }
  protected setTo(value: string): void { this.preset.set('custom'); this.to.set(value); }
  protected barHeight(value: number): number { return Math.max(value > 0 ? 4 : 0, value / this.maxBucket() * 100); }
  protected orderWidth(value: number): number { return value / this.orderMax() * 100; }
  protected donut(segments: Segment[]): string {
    const total = segments.reduce((sum, item) => sum + item.value, 0);
    if (!total) return 'conic-gradient(var(--muted) 0 100%)';
    let offset = 0;
    return `conic-gradient(${segments.map((item) => {
      const start = offset;
      offset += item.value / total * 100;
      return `${item.color} ${start}% ${offset}%`;
    }).join(', ')})`;
  }
  protected segmentPercent(value: number, segments: Segment[]): number {
    const total = segments.reduce((sum, item) => sum + item.value, 0);
    return total ? Math.round(value / total * 100) : 0;
  }
  protected receiptSummary(): string {
    return this.receiptSegments().length
      ? this.receiptSegments().map((segment) => `${segment.label}: ${formatMoney(segment.value)}`).join('; ')
      : 'Nenhum recebimento datado no período';
  }
}
