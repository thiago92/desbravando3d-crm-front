import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { normalizeSearch, formatMoney } from '../../shared/utils/presentation';
import { OrdersPreview } from '../encomendas/orders-preview';
import { ConsignmentsPreview, type Consignment } from '../consignado/consignado';
import { CashLedgerPreview, type CashEntryPreview, type PaymentMethodPreview } from './cash-ledger-preview';

type Receivable = {
  kind: 'order' | 'consignment';
  id: string;
  reference: string;
  party: string;
  description: string;
  total: number;
  received: number;
  pending: number;
};

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const roundMoney = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100;

@Component({
  selector: 'app-financeiro',
  imports: [FormsModule, HlmButton, HlmInput, ...HlmDialogImports, ...HlmNativeSelectImports, ...HlmTableImports, ...HlmToggleGroupImports],
  templateUrl: './financeiro.html',
})
export class Financeiro {
  @ViewChild('receiptDialog') private receiptDialog?: HlmDialog;
  @ViewChild('expenseDialog') private expenseDialog?: HlmDialog;
  private readonly ordersPreview = inject(OrdersPreview);
  private readonly consignmentsPreview = inject(ConsignmentsPreview);
  private readonly ledger = inject(CashLedgerPreview);
  private readonly router = inject(Router);

  protected readonly from = signal(localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  protected readonly to = signal(localDate());
  protected readonly search = signal('');
  protected readonly view = signal<'receivables' | 'transactions' | 'expenses'>('receivables');
  protected readonly notice = signal('');
  protected readonly receiptError = signal('');
  protected readonly expenseError = signal('');
  protected readonly selectedReceivable = signal<Receivable | null>(null);
  protected receiptAmount: number | null = null;
  protected receiptDate = localDate();
  protected receiptMethod: PaymentMethodPreview = 'Não informado';
  protected receiptNote = '';
  protected expenseDescription = '';
  protected expenseCategory = '';
  protected expenseAmount: number | null = null;
  protected expenseDate = localDate();
  protected expenseMethod: PaymentMethodPreview = 'Não informado';
  protected expenseNote = '';
  protected readonly money = formatMoney;
  protected readonly date = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
  protected readonly validPeriod = computed(() => !!this.from() && !!this.to() && this.from() <= this.to());

  protected readonly receivables = computed<Receivable[]>(() => {
    const orders: Receivable[] = this.ordersPreview.orders().flatMap((order) => {
      if (order.stage === 'request') return [];
      const total = this.ordersPreview.priceFor(order)?.total;
      const pending = this.ordersPreview.pendingFor(order);
      return total != null && pending > 0 ? [{
        kind: 'order', id: order.id, reference: order.number, party: order.customer,
        description: 'Encomenda', total, received: this.ordersPreview.receivedFor(order), pending,
      }] : [];
    });
    const consignments: Receivable[] = this.consignmentsPreview.entries().flatMap((card: Consignment) => {
      if (card.stage !== 'with-store' || card.sold <= 0) return [];
      const total = roundMoney(card.sold * card.unitPrice);
      const pending = Math.max(0, roundMoney(total - card.received));
      return pending > 0 ? [{
        kind: 'consignment', id: card.number, reference: card.number, party: card.store,
        description: `Consignado · ${card.sold} ${card.sold === 1 ? 'unidade vendida' : 'unidades vendidas'}`,
        total, received: card.received, pending,
      }] : [];
    });
    return [...orders, ...consignments].sort((a, b) => b.pending - a.pending);
  });
  protected readonly pendingTotal = computed(() => roundMoney(this.receivables().reduce((sum, row) => sum + row.pending, 0)));
  protected readonly transactionsInPeriod = computed(() => this.validPeriod() ? this.ledger.transactions()
    .filter((entry) => entry.date >= this.from() && entry.date <= this.to())
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) : []);
  protected readonly receivedInPeriod = computed(() => roundMoney(this.transactionsInPeriod().filter((entry) => entry.kind === 'receipt').reduce((sum, entry) => sum + entry.amount, 0)));
  protected readonly paidInPeriod = computed(() => roundMoney(this.transactionsInPeriod().filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0)));
  protected readonly cashChange = computed(() => roundMoney(this.receivedInPeriod() - this.paidInPeriod()));
  protected readonly visibleReceivables = computed(() => {
    const term = normalizeSearch(this.search().trim());
    return this.receivables().filter((row) => normalizeSearch(`${row.reference} ${row.party} ${row.description}`).includes(term));
  });
  protected readonly visibleTransactions = computed(() => {
    const term = normalizeSearch(this.search().trim());
    const entries = this.view() === 'expenses' ? this.transactionsInPeriod().filter((entry) => entry.kind === 'expense') : this.transactionsInPeriod();
    return entries.filter((entry) => normalizeSearch(`${entry.description} ${entry.reference ?? ''} ${entry.party ?? ''} ${entry.category ?? ''} ${entry.note ?? ''}`).includes(term));
  });

  protected setView(value: unknown): void {
    if (value === 'receivables' || value === 'transactions' || value === 'expenses') { this.view.set(value); this.search.set(''); }
  }
  protected openReceipt(row: Receivable): void {
    this.selectedReceivable.set(row);
    this.receiptAmount = null;
    this.receiptDate = localDate();
    this.receiptMethod = 'Não informado';
    this.receiptNote = '';
    this.receiptError.set('');
    this.receiptDialog?.open();
  }
  protected saveReceipt(): void {
    const row = this.selectedReceivable();
    if (!row) return;
    const result = row.kind === 'order'
      ? this.ordersPreview.recordPayment(row.id, this.receiptAmount ?? NaN, this.receiptDate, this.receiptMethod, this.receiptNote)
      : this.consignmentsPreview.recordPayment(row.id, this.receiptAmount ?? NaN, this.receiptDate, this.receiptMethod, this.receiptNote);
    if ('error' in result) { this.receiptError.set(result.error); return; }
    this.notice.set(`Recebimento de ${this.money(this.receiptAmount!)} registrado para ${row.reference}.`);
    this.receiptDialog?.close();
  }
  protected openExpense(): void {
    this.expenseDescription = '';
    this.expenseCategory = '';
    this.expenseAmount = null;
    this.expenseDate = localDate();
    this.expenseMethod = 'Não informado';
    this.expenseNote = '';
    this.expenseError.set('');
    this.expenseDialog?.open();
  }
  protected saveExpense(): void {
    const result = this.ledger.addExpense({ date: this.expenseDate, amount: this.expenseAmount ?? NaN, description: this.expenseDescription, category: this.expenseCategory, method: this.expenseMethod, note: this.expenseNote });
    if ('error' in result) { this.expenseError.set(result.error); return; }
    this.notice.set(`Despesa de ${this.money(result.saved.amount)} registrada.`);
    this.expenseDialog?.close();
  }
  protected openSource(row: Receivable): void {
    void this.router.navigate([row.kind === 'order' ? '/encomendas' : '/consignado'], { queryParams: { abrir: row.id } });
  }
  protected origin(entry: CashEntryPreview): string {
    return entry.origin === 'order' ? 'Encomenda' : entry.origin === 'consignment' ? 'Consignado' : entry.category ?? 'Despesa';
  }
}
