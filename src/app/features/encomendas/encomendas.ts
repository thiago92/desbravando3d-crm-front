import { Component, DestroyRef, ElementRef, ViewChild, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { readPercentages } from '../calculadora/pricing-settings-preview';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { ProductsPreview } from '../produtos/products-preview';
import { formatMeasure, formatMoney, normalizeSearch } from '../../shared/utils/presentation';
import { OrderItemPreview, OrderPreview, OrdersPreview, nextOrderAction, orderColumn } from './orders-preview';
import { HorizontalDragScroll } from './directives/horizontal-drag-scroll';

const stages: { id: OrderPreview['stage']; label: string }[] = [
  { id: 'request', label: 'Em orçamento' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'printing', label: 'Em impressão' },
  { id: 'ready', label: 'Prontas para entrega' },
  { id: 'delivered', label: 'Entregues' },
];

@Component({
  selector: 'app-encomendas',
  imports: [FormsModule, HlmButton, HlmCard, HlmInput, HorizontalDragScroll, ...HlmDialogImports, ...HlmNativeSelectImports],
  templateUrl: './encomendas.html',
  styleUrl: './encomendas.css',
})
export class Encomendas {
  @ViewChild('orderDialog') private dialog?: HlmDialog;
  @ViewChild('board') private board?: ElementRef<HTMLElement>;
  private readonly preview = inject(OrdersPreview);
  private readonly catalog = inject(ProductsPreview);
  private readonly inventory = inject(FilamentsPreview);
  protected readonly margins = readPercentages();
  protected readonly query = signal('');
  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.preview.orders().find((order) => order.id === this.selectedId()) ?? null);
  protected readonly selectedPrice = computed(() => {
    const order = this.selected();
    return order ? this.preview.priceFor(order) : null;
  });
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly advancing = signal(false);
  protected discountValue = 0;
  protected deliveryDateValue = '';
  protected sizeDrafts: string[] = [];
  protected marginDrafts: (number | null)[] = [];
  protected readonly filaments = this.inventory.filaments;
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
  protected readonly money = formatMoney;
  protected readonly measure = formatMeasure;
  protected readonly priceFor = (order: OrderPreview) => this.preview.priceFor(order);

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
    return `${order.items[0] ? this.productName(order.items[0]) : 'Itens a definir'}${more > 0 ? ` e mais ${more} ${more === 1 ? 'item' : 'itens'}` : ''}`;
  }

  protected productName(item: OrderItemPreview): string {
    return this.catalog.products().find((product) => product.id === item.productId)?.name ?? item.name;
  }

  protected productImage(item: OrderItemPreview): string | null {
    if (!item.productId || this.failedImages().has(item.productId)) return null;
    return this.catalog.products().find((product) => product.id === item.productId)?.image ?? null;
  }

  protected imageFailed(item: OrderItemPreview): void {
    if (item.productId) this.failedImages.update((ids) => new Set([...ids, item.productId!]));
  }

  protected productOption(item: OrderItemPreview): string {
    const size = this.preview.sizeFor(item);
    return size ? `${size.name} · ${this.measure(size.heightCm)} × ${this.measure(size.widthCm)} × ${this.measure(size.depthCm)} cm` : 'Tamanho não disponível';
  }

  protected sizeOptions(item: OrderItemPreview) {
    return this.catalog.products().find((product) => product.id === item.productId)?.sizes ?? [];
  }

  protected sizeFor(item: OrderItemPreview) { return this.preview.sizeFor(item); }

  protected deliveryLabel(date: string | null): string {
    return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`)) : 'Prazo a definir';
  }

  protected filamentName(id: string): string {
    const filament = this.filaments().find((entry) => entry.id === id);
    return filament ? `${filament.material} ${filament.color}` : 'Filamento indisponível';
  }

  protected paymentLabel(order: OrderPreview): string {
    return { 'not-defined': 'Pagamento a definir', pending: 'Pagamento pendente', received: 'Pagamento recebido' }[order.payment];
  }

  protected open(order: OrderPreview): void {
    this.selectedId.set(order.id);
    this.discountValue = order.discountPercent;
    this.deliveryDateValue = order.deliveryDate ?? '';
    this.sizeDrafts = order.items.map((item) => item.sizeId);
    this.marginDrafts = order.items.map((item) => item.marginId);
    this.error.set('');
    this.notice.set('');
    this.advancing.set(false);
    this.dialog?.open();
  }

  protected saveDiscount(): void {
    const order = this.selected();
    if (!order) return;
    const result = this.preview.saveDiscount(order.id, this.discountValue);
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set(`Desconto da encomenda ${order.number} atualizado.`);
  }

  protected saveDeliveryDate(): void {
    const order = this.selected();
    if (!order) return;
    const result = this.preview.saveDeliveryDate(order.id, this.deliveryDateValue || null);
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set('Prazo de entrega atualizado.');
  }

  protected saveItemSelection(index: number): void {
    const order = this.selected();
    if (!order) return;
    const result = this.preview.saveItemSelection(order.id, index, this.sizeDrafts[index], this.marginDrafts[index]);
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set(`Tamanho e margem de ${this.productName(order.items[index])} atualizados.`);
  }

  protected advance(): void {
    const order = this.selected();
    const action = this.action();
    if (!order || !action || this.advancing()) return;
    if (order.stage === 'request' && this.discountValue !== order.discountPercent) {
      this.error.set('Salve o desconto antes de confirmar a encomenda.');
      return;
    }
    if (order.stage === 'request' && (this.deliveryDateValue !== (order.deliveryDate ?? '') || order.items.some((item, index) => this.sizeDrafts[index] !== item.sizeId || this.marginDrafts[index] !== item.marginId))) {
      this.error.set('Salve o prazo, o tamanho e a margem alterados antes de confirmar a encomenda.');
      return;
    }
    const result = this.preview.advance(order.id, action.target);
    if ('error' in result) { this.error.set(result.error); return; }
    this.advancing.set(true);
    this.error.set('');
    this.notice.set(`Encomenda ${order.number}: ${this.selectedStage()?.label}.`);
    this.close();
  }

  protected returnToQuote(): void {
    const order = this.selected();
    if (!order || this.advancing()) return;
    const result = this.preview.returnToQuote(order.id);
    if ('error' in result) { this.error.set(result.error); return; }
    this.advancing.set(true);
    this.error.set('');
    this.notice.set(`Encomenda ${order.number} devolvida para Em orçamento.`);
    this.close();
  }

  protected close(): void { this.dialog?.close(); }

  protected dialogClosed(): void {
    if (this.advancing()) this.board?.nativeElement.focus({ preventScroll: true });
    this.selectedId.set(null);
  }
}
