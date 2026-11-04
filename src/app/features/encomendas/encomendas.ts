import { Component, DestroyRef, ElementRef, ViewChild, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { formatMoney, normalizeSearch } from '../../shared/utils/presentation';
import { OrderPreview, OrderColumnPreview, OrdersPreview, nextOrderAction, orderColumn } from './orders-preview';
import { HorizontalDragScroll } from './directives/horizontal-drag-scroll';

const stages: { id: OrderColumnPreview; label: string }[] = [
  { id: 'request', label: 'Solicitações' },
  { id: 'quotation', label: 'Em orçamento' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'printing', label: 'Em impressão' },
  { id: 'ready', label: 'Prontas para entrega' },
  { id: 'delivered', label: 'Entregues' },
];

@Component({
  selector: 'app-encomendas',
  imports: [FormsModule, HlmButton, HlmCard, HlmInput, HorizontalDragScroll, ...HlmDialogImports],
  templateUrl: './encomendas.html',
  styleUrl: './encomendas.css',
})
export class Encomendas {
  @ViewChild('orderDialog') private dialog?: HlmDialog;
  @ViewChild('board') private board?: ElementRef<HTMLElement>;
  private readonly preview = inject(OrdersPreview);
  protected readonly query = signal('');
  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.preview.orders().find((order) => order.id === this.selectedId()) ?? null);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly advancing = signal(false);
  protected quoteValue: number | null = null;
  protected readonly filteredOrders = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.preview.orders().filter((order) => normalizeSearch(`${order.number} ${order.customer}`).includes(term));
  });
  protected readonly columns = computed(() => stages.map((stage) => ({
    ...stage, orders: this.filteredOrders().filter((order) => orderColumn(order) === stage.id),
  })));
  protected readonly selectedStage = computed(() => {
    const order = this.selected();
    return order ? stages.find((stage) => stage.id === orderColumn(order)) : undefined;
  });
  protected readonly action = computed(() => {
    const order = this.selected();
    return order ? nextOrderAction[order.stage] : null;
  });
  protected readonly columnFor = orderColumn;
  protected readonly money = formatMoney;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const board = this.board?.nativeElement;
      if (!board) return;
      let resizeFrame = 0;
      const fitBoard = () => {
        // Desconta a posição real do quadro, inclusive filtros/avisos e quebras de linha.
        const top = board.getBoundingClientRect().top + window.scrollY;
        const minimum = window.innerWidth < 640 ? Math.max(220, Math.floor(window.innerHeight * 0.78)) : 220;
        const height = `${Math.max(minimum, Math.floor(window.innerHeight - top - 32))}px`;
        if (board.style.getPropertyValue('--kanban-height') !== height) board.style.setProperty('--kanban-height', height);
      };
      // Escreve no próximo frame, fora da entrega do ResizeObserver do contêiner.
      const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(fitBoard);
      });
      observer?.observe(board.parentElement!);
      window.addEventListener('resize', fitBoard);
      fitBoard();
      destroyRef.onDestroy(() => {
        observer?.disconnect();
        cancelAnimationFrame(resizeFrame);
        window.removeEventListener('resize', fitBoard);
      });
    });
  }

  protected units(order: OrderPreview): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  protected summary(order: OrderPreview): string {
    const more = order.items.length - 1;
    return `${order.items[0]?.name ?? 'Itens a definir'}${more > 0 ? ` e mais ${more} ${more === 1 ? 'item' : 'itens'}` : ''}`;
  }

  protected paymentLabel(order: OrderPreview): string {
    return { 'not-defined': 'Pagamento a definir', pending: 'Pagamento pendente', received: 'Pagamento recebido' }[order.payment];
  }

  protected open(order: OrderPreview): void {
    this.selectedId.set(order.id);
    this.quoteValue = order.quotedTotal;
    this.error.set('');
    this.notice.set('');
    this.advancing.set(false);
    this.dialog?.open();
  }

  protected saveQuote(): void {
    const order = this.selected();
    if (!order) return;
    const result = this.preview.saveQuote(order.id, this.quoteValue);
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set(`Orçamento da encomenda ${order.number} atualizado.`);
  }

  protected advance(): void {
    const order = this.selected();
    const action = this.action();
    if (!order || !action || this.advancing()) return;
    if (order.stage === 'request' && this.quoteValue !== order.quotedTotal) {
      this.error.set('Salve as alterações do orçamento antes de confirmar a encomenda.');
      return;
    }
    const result = this.preview.advance(order.id, action.target);
    if ('error' in result) { this.error.set(result.error); return; }
    this.advancing.set(true);
    this.error.set('');
    this.notice.set(`Encomenda ${order.number}: ${this.selectedStage()?.label}.`);
    this.close();
  }

  protected close(): void { this.dialog?.close(); }

  protected dialogClosed(): void {
    if (this.advancing()) this.board?.nativeElement.focus({ preventScroll: true });
    this.selectedId.set(null);
  }
}
