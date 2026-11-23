import { Component, DestroyRef, ElementRef, ViewChild, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { readPercentages } from '../calculadora/pricing-settings-preview';
import { PrintCalculator } from '../calculadora/print-calculator/print-calculator';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { UnitSuppliesPreview } from '../insumos/unit-supplies-preview';
import { ProductPreview, ProductSize, ProductsPreview } from '../produtos/products-preview';
import { formatMeasure, formatMoney, normalizeSearch } from '../../shared/utils/presentation';
import { NewOrderPreview, OrderItemPreview, OrderPreview, OrdersPreview, nextOrderAction, orderColumn } from './orders-preview';
import { HorizontalDragScroll } from '../../shared/directives/horizontal-drag-scroll';
import { ContactsPreview } from '../clientes-lojas/contacts-preview';

const stages: { id: OrderPreview['stage']; label: string }[] = [
  { id: 'request', label: 'Em orçamento' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'printing', label: 'Em impressão' },
  { id: 'ready', label: 'Prontas para entrega' },
  { id: 'delivered', label: 'Entregues' },
];

type SizeDraft = {
  name: string;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  price: number | null;
  printHours: number | null;
  materials: { filamentId: string; gramsPerUnit: number | null }[];
  unitMaterials: { supplyId: string; unitsPerUnit: number | null }[];
};
type ConsumptionDraft = { enabled: boolean; lines: { filamentId: string; grams: number | null }[] };

@Component({
  selector: 'app-encomendas',
  imports: [FormsModule, HlmButton, HlmCheckbox, HlmCard, HlmInput, HorizontalDragScroll, PrintCalculator, ...HlmDialogImports, ...HlmNativeSelectImports, ...HlmSelectImports],
  templateUrl: './encomendas.html',
  styleUrl: './encomendas.css',
})
export class Encomendas {
  @ViewChild('orderDialog') private dialog?: HlmDialog;
  @ViewChild('calculatorDialog') private calculatorDialog?: HlmDialog;
  @ViewChild('board') private board?: ElementRef<HTMLElement>;
  private readonly preview = inject(OrdersPreview);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly catalog = inject(ProductsPreview);
  private readonly inventory = inject(FilamentsPreview);
  private readonly unitInventory = inject(UnitSuppliesPreview);
  protected readonly registeredContacts = inject(ContactsPreview).contacts;
  protected readonly margins = readPercentages();
  protected readonly query = signal('');
  protected readonly creating = signal(false);
  protected createCustomer = '';
  protected createItems: NewOrderPreview['items'] = [];
  protected createDiscount = 0;
  protected createDeliveryDate = '';
  protected readonly createError = signal('');
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
  protected failureItemIndex = 0;
  protected failureQuantity = 1;
  protected failureMaterialMode: 'whole' | 'manual' = 'whole';
  protected failureDate = new Date().toLocaleDateString('en-CA');
  protected failureReason = '';
  protected cancelReason = '';
  protected failureHours: number | null = null;
  protected failureMaterials: { filamentId: string; grams: number | null }[] = [];
  protected retryMaterials: { filamentId: string; grams: number | null }[] = [];
  protected discountValue = 0;
  protected deliveryDateValue = '';
  protected sizeDrafts: string[] = [];
  protected marginDrafts: (number | null)[] = [];
  protected consumptionDrafts: ConsumptionDraft[] = [];
  protected readonly newSizeItemIndex = signal<number | null>(null);
  protected newSize: SizeDraft = this.emptySize();
  protected readonly newSizeError = signal('');
  protected readonly filaments = this.inventory.filaments;
  protected readonly unitSupplies = this.unitInventory.supplies;
  protected readonly filteredOrders = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.preview.orders().filter((order) => !order.cancelledAt && normalizeSearch(`${order.number} ${order.customer}`).includes(term));
  });
  protected readonly cancelledOrders = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.preview.orders().filter((order) => order.cancelledAt && normalizeSearch(`${order.number} ${order.customer}`).includes(term));
  });
  protected readonly columns = computed(() => stages.map((stage) => ({
    ...stage, orders: this.filteredOrders().filter((order) => orderColumn(order) === stage.id),
  })));
  protected readonly selectedStage = computed(() => {
    const order = this.selected();
    return order?.cancelledAt ? { id: 'request' as const, label: 'Cancelada' } : order ? stages.find((stage) => stage.id === orderColumn(order)) : undefined;
  });
  protected readonly action = computed(() => {
    const order = this.selected();
    return order && !order.cancelledAt ? nextOrderAction[order.stage] : null;
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
        const minimum = window.innerWidth < 640 ? Math.max(220, Math.floor(window.innerHeight * 0.78)) : 480;
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
      const requestedId = this.route?.snapshot.queryParamMap.get('abrir');
      const requestedOrder = this.preview.orders().find((order) => order.id === requestedId);
      if (requestedOrder) this.open(requestedOrder);
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
    return size ? `${this.sizeWeight(size)} · ${this.measure(size.heightCm)} × ${this.measure(size.widthCm)} × ${this.measure(size.depthCm)} cm` : 'Tamanho não disponível';
  }

  protected sizeWeight(size: ProductSize): string {
    return size.weightGrams != null ? `${this.measure(size.weightGrams)} g` : 'Peso não informado';
  }

  protected sizeOptions(item: OrderItemPreview) {
    return this.catalog.products().find((product) => product.id === item.productId)?.sizes ?? [];
  }

  protected readonly products = this.catalog.products;

  protected productForSelect(id: string | null): ProductPreview | undefined {
    return this.products().find((product) => product.id === id);
  }

  protected productImageForSelect(product: ProductPreview): string | null {
    return this.failedImages().has(product.id) ? null : product.image;
  }

  protected productImageFailedForSelect(id: string): void {
    this.failedImages.update((ids) => new Set([...ids, id]));
  }

  protected readonly productNameForSelect = (id: string) => this.productForSelect(id)?.name ?? '';

  protected createSizeOptions(productId: string): ProductSize[] {
    return this.products().find((product) => product.id === productId)?.sizes ?? [];
  }

  protected addCreateItem(): void {
    const defaultMargin = this.margins.find((margin) => margin.name === 'Padrão')?.id ?? this.margins[0]?.id ?? null;
    this.createItems.push({ productId: '', sizeId: '', quantity: 1, marginId: defaultMargin });
  }

  protected removeCreateItem(index: number): void {
    this.createItems.splice(index, 1);
  }

  protected createProductChanged(index: number, productId: string): void {
    this.createItems[index].productId = productId;
    this.createItems[index].sizeId = '';
  }

  protected openCreate(): void {
    this.selectedId.set(null);
    this.createCustomer = '';
    this.createItems = [];
    this.addCreateItem();
    this.createDiscount = 0;
    this.createDeliveryDate = '';
    this.createError.set('');
    this.creating.set(true);
    this.dialog?.open();
  }

  protected saveCreate(): void {
    const result = this.preview.create({
      customer: this.createCustomer, items: this.createItems,
      discountPercent: this.createDiscount, deliveryDate: this.createDeliveryDate || null,
    });
    if ('error' in result) { this.createError.set(result.error); return; }
    const order = result.saved;
    this.selectedId.set(order.id);
    this.discountValue = order.discountPercent;
    this.deliveryDateValue = order.deliveryDate ?? '';
    this.sizeDrafts = order.items.map((item) => item.sizeId);
    this.marginDrafts = order.items.map((item) => item.marginId);
    this.consumptionDrafts = order.items.map((item) => this.consumptionDraft(item));
    this.createError.set('');
    this.creating.set(false);
    this.notice.set(`Encomenda ${order.number} criada em Em orçamento.`);
  }

  protected sizeFor(item: OrderItemPreview) { return this.preview.sizeFor(item); }

  private consumptionDraft(item: OrderItemPreview): ConsumptionDraft {
    const lines = item.filamentConsumptionOverride ?? this.preview.sizeFor(item)?.materials.map((line) => ({ filamentId: line.filamentId, grams: line.gramsPerUnit * item.quantity })) ?? [];
    return { enabled: item.filamentConsumptionOverride !== null && item.filamentConsumptionOverride !== undefined, lines: lines.map((line) => ({ ...line })) };
  }

  protected setRealConsumption(index: number, enabled: boolean): void {
    const item = this.selected()?.items[index];
    if (!item) return;
    this.consumptionDrafts[index] = { enabled, lines: enabled ? this.consumptionDraft(item).lines : [] };
    this.error.set('');
  }

  protected addConsumptionLine(index: number): void { this.consumptionDrafts[index].lines.push({ filamentId: '', grams: null }); }
  protected removeConsumptionLine(index: number, lineIndex: number): void { this.consumptionDrafts[index].lines.splice(lineIndex, 1); }

  protected saveItemConsumption(index: number): void {
    const order = this.selected();
    const draft = this.consumptionDrafts[index];
    if (!order || !draft) return;
    const result = this.preview.saveItemConsumption(order.id, index, draft.enabled ? draft.lines.map((line) => ({ filamentId: line.filamentId, grams: line.grams! })) : null);
    if ('error' in result) { this.error.set(result.error); return; }
    this.consumptionDrafts[index] = this.consumptionDraft(result.saved.items[index]);
    this.error.set('');
    this.notice.set(`Consumo de estoque de ${this.productName(order.items[index])} atualizado.`);
  }

  protected consumptionChanged(index: number): boolean {
    const item = this.selected()?.items[index];
    const draft = this.consumptionDrafts[index];
    if (!item || !draft) return false;
    if (!draft.enabled) return item.filamentConsumptionOverride != null;
    const saved = item.filamentConsumptionOverride;
    return !saved || saved.length !== draft.lines.length || saved.some((line, lineIndex) => line.filamentId !== draft.lines[lineIndex].filamentId || line.grams !== draft.lines[lineIndex].grams);
  }

  private emptySize(): SizeDraft {
    return { name: '', weightGrams: null, heightCm: null, widthCm: null, depthCm: null, price: null, printHours: null, materials: [{ filamentId: '', gramsPerUnit: null }], unitMaterials: [] };
  }

  protected startNewSize(index: number): void {
    this.newSize = this.emptySize();
    this.newSizeError.set('');
    this.newSizeItemIndex.set(index);
  }

  protected cancelNewSize(): void {
    this.newSizeItemIndex.set(null);
    this.newSizeError.set('');
  }

  protected addNewSizeMaterial(): void {
    this.newSize.materials.push({ filamentId: '', gramsPerUnit: null });
  }

  protected removeNewSizeMaterial(index: number): void {
    this.newSize.materials.splice(index, 1);
  }

  protected addNewSizeUnitMaterial(): void {
    this.newSize.unitMaterials.push({ supplyId: '', unitsPerUnit: null });
  }

  protected removeNewSizeUnitMaterial(index: number): void {
    this.newSize.unitMaterials.splice(index, 1);
  }

  protected saveNewSize(index: number): void {
    const order = this.selected();
    const item = order?.items[index];
    const product = this.catalog.products().find((entry) => entry.id === item?.productId);
    if (!order || order.stage !== 'request' || order.cancelledAt || !item || !product || this.newSizeItemIndex() !== index) return;
    const draft = this.newSize;
    const positive = (value: number | null) => value !== null && Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
    if (!draft.name.trim() || !positive(draft.heightCm) || !positive(draft.widthCm) || !positive(draft.depthCm) || !positive(draft.price) || !positive(draft.printHours)) {
      this.newSizeError.set('Informe nome, medidas, preço de catálogo e horas de impressão maiores que zero, com até duas casas decimais.');
      return;
    }
    if (draft.weightGrams !== null && !positive(draft.weightGrams)) {
      this.newSizeError.set('Informe um peso maior que zero, com até duas casas decimais, ou deixe o campo vazio.');
      return;
    }
    if (!draft.materials.length || draft.materials.some((line) => !this.filaments().some((filament) => filament.id === line.filamentId) || !positive(line.gramsPerUnit)) || new Set(draft.materials.map((line) => line.filamentId)).size !== draft.materials.length) {
      this.newSizeError.set('Informe pelo menos um filamento cadastrado, com gramas positivas por unidade e sem repetições.');
      return;
    }
    if (draft.unitMaterials.some((line) => !this.unitSupplies().some((supply) => supply.id === line.supplyId) || !Number.isSafeInteger(line.unitsPerUnit) || line.unitsPerUnit! <= 0) || new Set(draft.unitMaterials.map((line) => line.supplyId)).size !== draft.unitMaterials.length) {
      this.newSizeError.set('Informe insumos por unidade cadastrados, com quantidades inteiras positivas e sem repetições.');
      return;
    }
    const size: ProductSize = {
      id: crypto.randomUUID(), name: draft.name.trim(), weightGrams: draft.weightGrams,
      heightCm: draft.heightCm!, widthCm: draft.widthCm!, depthCm: draft.depthCm!,
      price: draft.price!, printHours: draft.printHours!,
      materials: draft.materials.map((line) => ({ filamentId: line.filamentId, gramsPerUnit: line.gramsPerUnit! })),
      unitMaterials: draft.unitMaterials.map((line) => ({ supplyId: line.supplyId, unitsPerUnit: line.unitsPerUnit! })),
    };
    this.catalog.save({ ...product, sizes: [...product.sizes, size] }, product.id);
    this.sizeDrafts[index] = size.id;
    const result = this.preview.saveItemSelection(order.id, index, size.id, item.marginId);
    if ('error' in result) {
      this.newSizeError.set(result.error);
      return;
    }
    this.consumptionDrafts[index] = this.consumptionDraft(result.saved.items[index]);
    this.cancelNewSize();
    this.error.set('');
    this.notice.set(`Novo tamanho de ${product.name} cadastrado e selecionado nesta encomenda.`);
  }

  protected deliveryLabel(date: string | null): string {
    return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`)) : 'Prazo a definir';
  }

  protected filamentName(id: string): string {
    const filament = this.filaments().find((entry) => entry.id === id);
    return filament ? `${filament.material} ${filament.color}` : 'Filamento indisponível';
  }

  protected unitSupplyName(id: string): string {
    return this.unitSupplies().find((entry) => entry.id === id)?.name ?? 'Insumo indisponível';
  }

  protected paymentLabel(order: OrderPreview): string {
    return { 'not-defined': 'Pagamento a definir', pending: 'Pagamento pendente', received: 'Pagamento recebido' }[order.payment];
  }

  protected open(order: OrderPreview): void {
    this.creating.set(false);
    this.selectedId.set(order.id);
    this.discountValue = order.discountPercent;
    this.deliveryDateValue = order.deliveryDate ?? '';
    this.sizeDrafts = order.items.map((item) => item.sizeId);
    this.marginDrafts = order.items.map((item) => item.marginId);
    this.consumptionDrafts = order.items.map((item) => this.consumptionDraft(item));
    this.cancelNewSize();
    this.error.set('');
    this.notice.set('');
    this.advancing.set(false);
    this.cancelReason = '';
    this.failureItemIndex = 0;
    this.failureQuantity = 1;
    this.failureMaterialMode = 'whole';
    this.failureDate = new Date().toLocaleDateString('en-CA');
    this.failureReason = '';
    this.resetFailureEstimate(order);
    this.retryMaterials = (order.failures?.at(-1)?.materials ?? []).map((line) => ({ filamentId: line.filamentId, grams: line.grams }));
    this.dialog?.open();
  }

  protected resetFailureEstimate(order: OrderPreview): void {
    const item = order.items[this.failureItemIndex];
    const size = item ? this.sizeFor(item) : null;
    this.failureHours = size ? Math.round(size.printHours * this.failureQuantity * 100) / 100 : null;
    this.failureMaterials = [{ filamentId: '', grams: null }];
  }

  protected failureItemChanged(): void {
    const order = this.selected();
    if (!order || !order.items[this.failureItemIndex]) return;
    this.failureQuantity = 1;
    this.resetFailureEstimate(order);
  }

  protected failureQuantityChanged(): void {
    const order = this.selected();
    const item = order?.items[this.failureItemIndex];
    const size = item ? this.sizeFor(item) : null;
    if (size && this.failureMaterialMode === 'whole') this.failureHours = Math.round(size.printHours * this.failureQuantity * 100) / 100;
  }

  protected setFailureMaterialMode(mode: 'whole' | 'manual'): void {
    this.failureMaterialMode = mode;
    if (mode === 'manual') {
      this.failureMaterials = [{ filamentId: '', grams: null }];
      this.failureHours = null;
    } else {
      const order = this.selected();
      if (order) this.failureQuantityChanged();
    }
  }

  protected failureEstimatedMaterials(): { filamentId: string; grams: number }[] {
    const order = this.selected();
    const item = order?.items[this.failureItemIndex];
    const size = item ? this.sizeFor(item) : null;
    return size?.materials.map((line) => ({ filamentId: line.filamentId, grams: Math.round(line.gramsPerUnit * this.failureQuantity * 100) / 100 })) ?? [];
  }

  protected addFailureMaterial(): void { this.failureMaterials.push({ filamentId: '', grams: null }); }
  protected removeFailureMaterial(index: number): void { this.failureMaterials.splice(index, 1); }
  protected addRetryMaterial(): void { this.retryMaterials.push({ filamentId: '', grams: null }); }
  protected removeRetryMaterial(index: number): void { this.retryMaterials.splice(index, 1); }

  protected recordFailure(): void {
    const order = this.selected();
    if (!order) return;
    const materials = this.failureMaterialMode === 'whole' ? this.failureEstimatedMaterials() : this.failureMaterials.map((line) => ({ filamentId: line.filamentId, grams: line.grams! }));
    if (this.failureMaterialMode === 'whole' && !materials.length) { this.error.set('Cadastre o consumo de filamento no tamanho do produto ou informe a perda manualmente.'); return; }
    const result = this.preview.recordFailure(order.id, {
      date: this.failureDate, itemIndex: Number(this.failureItemIndex), quantity: this.failureMaterialMode === 'whole' ? this.failureQuantity : 0,
      reason: this.failureReason, hours: this.failureHours!, materialMode: this.failureMaterialMode,
      materials,
    });
    if ('error' in result) { this.error.set(result.error); return; }
    this.retryMaterials = materials.map((line) => ({ ...line }));
    this.failureReason = '';
    this.error.set('');
    this.notice.set('Falha registrada. Informe o material da nova tentativa antes de continuar.');
  }

  protected startRetry(): void {
    const order = this.selected();
    if (!order) return;
    const result = this.preview.startRetry(order.id, this.retryMaterials.map((line) => ({ filamentId: line.filamentId, grams: line.grams! })));
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set('Nova tentativa iniciada e material adicional baixado do estoque.');
  }

  protected cancelOrder(): void {
    const order = this.selected();
    if (!order) return;
    const result = this.preview.cancelOrder(order.id, this.cancelReason);
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set(`Encomenda ${order.number} cancelada. Ela permanece consultável abaixo do quadro.`);
    this.advancing.set(true);
    this.close();
  }

  protected stageAtCancellation(order: OrderPreview): string {
    return stages.find((stage) => stage.id === order.stage)?.label ?? '';
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
    this.consumptionDrafts[index] = this.consumptionDraft(result.saved.items[index]);
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
    if (order.stage === 'request' && order.items.some((_, index) => this.consumptionChanged(index))) {
      this.error.set('Salve o consumo real de cada produto antes de confirmar a encomenda.');
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

  protected openCalculator(): void { this.calculatorDialog?.open(); }

  protected dialogClosed(): void {
    this.cancelNewSize();
    this.creating.set(false);
    if (this.advancing()) this.board?.nativeElement.focus({ preventScroll: true });
    this.selectedId.set(null);
  }
}
