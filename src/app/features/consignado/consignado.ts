import { Component, DestroyRef, ElementRef, Injectable, ViewChild, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { latestEnergySetting, readPercentages } from '../calculadora/pricing-settings-preview';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { calculateItemPrice } from '../encomendas/order-pricing';
import { UnitSuppliesPreview } from '../insumos/unit-supplies-preview';
import { OrdersPreview } from '../encomendas/orders-preview';
import { ProductsPreview, type ProductSize } from '../produtos/products-preview';
import { ContactsPreview } from '../clientes-lojas/contacts-preview';
import { HorizontalDragScroll } from '../../shared/directives/horizontal-drag-scroll';
import { formatMoney, normalizeSearch } from '../../shared/utils/presentation';
import { CashLedgerPreview, type PaymentMethodPreview, validCashDate, validMoney } from '../financeiro/cash-ledger-preview';

type ColumnId = 'quote' | 'confirmed' | 'printing' | 'ready' | 'with-store' | 'awaiting-settlement' | 'partial-settlement' | 'partially-returned' | 'settled' | 'returned';
type OperationalStage = 'quote' | 'confirmed' | 'printing' | 'ready' | 'with-store';
type PreviewCard = {
  number: string;
  store: string;
  contactId?: string;
  product: string;
  productId?: string;
  sizeId?: string;
  marginId?: number;
  column: ColumnId;
  quantity: number;
  sold: number;
  returned: number;
  unitPrice: number;
  received: number;
};
type FilamentConsumption = { filamentId: string; grams: number };
type ConsumptionDraft = { enabled: boolean; lines: { filamentId: string; grams: number | null }[] };
export type Consignment = Omit<PreviewCard, 'column'> & { stage: OperationalStage; filamentConsumptionOverride?: FilamentConsumption[] | null; stockConsumption?: FilamentConsumption[]; failures?: ConsignmentFailurePreview[]; retryPending?: boolean };
export type ConsignmentFailurePreview = {
  id: string;
  materialMode: 'whole' | 'manual';
  date: string;
  quantity: number;
  reason: string;
  materials: { filamentId: string; grams: number; pricePerKg: number }[];
  hours: number;
  materialCost: number;
  energyCost: number;
  totalCost: number;
};

const stages: { id: ColumnId; label: string }[] = [
  { id: 'quote', label: 'Em orçamento' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'printing', label: 'Em impressão' },
  { id: 'ready', label: 'Prontas para entrega' },
  { id: 'with-store', label: 'Com a loja' },
  { id: 'awaiting-settlement', label: 'Aguardando acerto' },
  { id: 'partial-settlement', label: 'Acerto parcial' },
  { id: 'partially-returned', label: 'Devolvidas parcialmente' },
  { id: 'settled', label: 'Acertadas' },
  { id: 'returned', label: 'Devolvidas' },
];
const nextAction: Record<OperationalStage, { target: OperationalStage; label: string } | null> = {
  quote: { target: 'confirmed', label: 'Confirmar consignação' },
  confirmed: { target: 'printing', label: 'Iniciar impressão' },
  printing: { target: 'ready', label: 'Marcar como pronta para entrega' },
  ready: { target: 'with-store', label: 'Registrar entrega à loja' },
  'with-store': null,
};

const exampleProductIds = new Map([
  ['Vaso geométrico', 'preview-1'],
  ['Suporte para celular', 'preview-2'],
  ['Organizador de mesa', 'preview-3'],
]);
const exampleSizeIds = new Map([
  ['Vaso geométrico', 'vase-small'],
  ['Suporte para celular', 'stand-standard'],
  ['Organizador de mesa', 'organizer-standard'],
]);

/** Dados fictícios somente para validar o quadro; não representam contratos da API. */
const examples: PreviewCard[] = [
  { number: '#C-010', store: 'Loja Aurora', product: 'Vaso geométrico', column: 'quote', quantity: 12, sold: 0, returned: 0, unitPrice: 38.88, received: 0 },
  { number: '#C-011', store: 'Ateliê Central', product: 'Suporte para celular', column: 'confirmed', quantity: 8, sold: 0, returned: 0, unitPrice: 24.48, received: 0 },
  { number: '#C-012', store: 'Loja Horizonte', product: 'Organizador de mesa', column: 'printing', quantity: 15, sold: 0, returned: 0, unitPrice: 34.56, received: 0 },
  { number: '#C-013', store: 'Casa Criativa', product: 'Vaso geométrico', column: 'ready', quantity: 6, sold: 0, returned: 0, unitPrice: 38.88, received: 0 },
  { number: '#C-014', store: 'Loja Aurora', product: 'Suporte para celular', column: 'with-store', quantity: 20, sold: 4, returned: 0, unitPrice: 24.48, received: 0 },
  { number: '#C-015', store: 'Ateliê Central', product: 'Organizador de mesa', column: 'awaiting-settlement', quantity: 10, sold: 10, returned: 0, unitPrice: 34.56, received: 0 },
  { number: '#C-016', store: 'Loja Horizonte', product: 'Vaso geométrico', column: 'partial-settlement', quantity: 50, sold: 25, returned: 0, unitPrice: 38.88, received: 972 },
  { number: '#C-017', store: 'Casa Criativa', product: 'Suporte para celular', column: 'partially-returned', quantity: 50, sold: 25, returned: 25, unitPrice: 24.48, received: 300 },
  { number: '#C-018', store: 'Loja Aurora', product: 'Organizador de mesa', column: 'settled', quantity: 8, sold: 8, returned: 0, unitPrice: 34.56, received: 276.48 },
  { number: '#C-019', store: 'Ateliê Central', product: 'Vaso geométrico', column: 'returned', quantity: 5, sold: 0, returned: 5, unitPrice: 38.88, received: 0 },
  { number: '#C-020', store: 'Loja Ponto Arte', product: 'Organizador de mesa', column: 'quote', quantity: 30, sold: 0, returned: 0, unitPrice: 34.56, received: 0 },
  { number: '#C-021', store: 'Galeria das Formas', product: 'Suporte para celular', column: 'quote', quantity: 18, sold: 0, returned: 0, unitPrice: 24.48, received: 0 },
  { number: '#C-022', store: 'Loja Ponto Arte', product: 'Vaso geométrico', column: 'confirmed', quantity: 10, sold: 0, returned: 0, unitPrice: 38.88, received: 0 },
  { number: '#C-023', store: 'Estúdio Presente', product: 'Suporte para celular', column: 'printing', quantity: 24, sold: 0, returned: 0, unitPrice: 24.48, received: 0 },
  { number: '#C-024', store: 'Galeria das Formas', product: 'Organizador de mesa', column: 'ready', quantity: 16, sold: 0, returned: 0, unitPrice: 34.56, received: 0 },
  { number: '#C-025', store: 'Estúdio Presente', product: 'Vaso geométrico', column: 'with-store', quantity: 40, sold: 0, returned: 0, unitPrice: 38.88, received: 0 },
  { number: '#C-026', store: 'Loja Ponto Arte', product: 'Organizador de mesa', column: 'with-store', quantity: 12, sold: 7, returned: 0, unitPrice: 34.56, received: 0 },
  { number: '#C-027', store: 'Galeria das Formas', product: 'Vaso geométrico', column: 'awaiting-settlement', quantity: 6, sold: 6, returned: 0, unitPrice: 38.88, received: 0 },
  { number: '#C-028', store: 'Estúdio Presente', product: 'Suporte para celular', column: 'partial-settlement', quantity: 1, sold: 1, returned: 0, unitPrice: 24.48, received: 12.24 },
  { number: '#C-029', store: 'Loja Ponto Arte', product: 'Organizador de mesa', column: 'partial-settlement', quantity: 20, sold: 8, returned: 0, unitPrice: 34.56, received: 103.68 },
  { number: '#C-030', store: 'Galeria das Formas', product: 'Vaso geométrico', column: 'partially-returned', quantity: 12, sold: 0, returned: 4, unitPrice: 38.88, received: 0 },
  { number: '#C-031', store: 'Estúdio Presente', product: 'Organizador de mesa', column: 'settled', quantity: 15, sold: 15, returned: 0, unitPrice: 34.56, received: 518.4 },
  { number: '#C-032', store: 'Loja Ponto Arte', product: 'Suporte para celular', column: 'returned', quantity: 9, sold: 0, returned: 9, unitPrice: 24.48, received: 0 },
];

function initialStage(column: ColumnId): OperationalStage {
  return column === 'quote' || column === 'confirmed' || column === 'printing' || column === 'ready' ? column : 'with-store';
}

function cents(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function validHundredth(value: number): boolean { return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001; }
function todayDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function visualColumn(card: Consignment): ColumnId {
  if (card.stage !== 'with-store') return card.stage;
  if (card.returned === card.quantity) return 'returned';
  if (card.returned > 0) return 'partially-returned';
  const due = cents(card.sold * card.unitPrice);
  if (card.sold === card.quantity && card.received === due) return 'settled';
  if (card.sold === card.quantity && card.received === 0) return 'awaiting-settlement';
  if (card.received > 0) return 'partial-settlement';
  return 'with-store';
}

export function consignmentStatus(card: Consignment): string {
  return stages.find((stage) => stage.id === visualColumn(card))?.label ?? '';
}

@Injectable({ providedIn: 'root' })
export class ConsignmentsPreview {
  private readonly cashLedger = inject(CashLedgerPreview);
  private readonly inventory = inject(FilamentsPreview);
  readonly entries = signal<Consignment[]>(examples.map(({ column, ...card }) => ({
    ...card,
    stage: initialStage(column),
    productId: exampleProductIds.get(card.product), sizeId: exampleSizeIds.get(card.product),
  })));

  recordFailure(number: string, input: { date: string; quantity: number; reason: string; materialMode?: 'whole' | 'manual'; materials: { filamentId: string; grams: number }[]; hours: number }): { saved: Consignment } | { error: string } {
    const card = this.entries().find((entry) => entry.number === number);
    if (!card || (card.stage !== 'printing' && card.stage !== 'ready') || card.retryPending) return { error: 'Registre a falha apenas durante uma tentativa ativa, em impressão ou pronta para entrega.' };
    if (!Number.isSafeInteger(input.quantity) || (input.materialMode === 'manual' ? input.quantity !== 0 : input.quantity < 1 || input.quantity > card.quantity)) return { error: 'Informe uma quantidade válida de peças perdidas.' };
    if (!validCashDate(input.date)) return { error: 'Informe uma data válida para a falha.' };
    if (!validHundredth(input.hours) || input.hours <= 0) return { error: 'Informe horas gastas maiores que zero, com até duas casas decimais.' };
    if (!input.materials.length || input.materials.some((line) => !this.inventory.filaments().some((filament) => filament.id === line.filamentId) || !validHundredth(line.grams) || line.grams <= 0) || new Set(input.materials.map((line) => line.filamentId)).size !== input.materials.length) return { error: 'Informe filamentos distintos e gramas positivas, com até duas casas decimais.' };
    const materials = input.materials.map((line) => ({ ...line, pricePerKg: this.inventory.filaments().find((filament) => filament.id === line.filamentId)!.pricePerKg }));
    const materialCost = cents(materials.reduce((sum, line) => sum + line.grams * line.pricePerKg / 1000, 0));
    const energy = latestEnergySetting();
    const energyCost = cents((energy?.averagePowerW ?? 0) / 1000 * input.hours * (energy?.tariffPerKwh ?? 0));
    const failure: ConsignmentFailurePreview = { id: crypto.randomUUID(), materialMode: input.materialMode ?? 'whole', date: input.date, quantity: input.quantity, reason: input.reason.trim().slice(0, 500), materials, hours: input.hours, materialCost, energyCost, totalCost: cents(materialCost + energyCost) };
    const saved = { ...card, failures: [...(card.failures ?? []), failure], retryPending: true };
    this.entries.update((items) => items.map((entry) => entry.number === number ? saved : entry));
    return { saved };
  }

  startRetry(number: string, materials: { filamentId: string; grams: number }[]): { saved: Consignment } | { error: string } {
    const card = this.entries().find((entry) => entry.number === number);
    if (!card || (card.stage !== 'printing' && card.stage !== 'ready') || !card.retryPending) return { error: 'Registre uma falha antes de iniciar nova tentativa.' };
    if (!materials.length || materials.some((line) => !validHundredth(line.grams) || line.grams <= 0) || new Set(materials.map((line) => line.filamentId)).size !== materials.length) return { error: 'Informe filamentos distintos e gramas positivas para a nova tentativa.' };
    const result = this.inventory.consume(new Map(materials.map((line) => [line.filamentId, line.grams])));
    if ('error' in result) return result;
    const saved = { ...card, retryPending: false };
    this.entries.update((items) => items.map((entry) => entry.number === number ? saved : entry));
    return { saved };
  }

  recordPayment(number: string, amount: number, date: string, method: PaymentMethodPreview, note = ''): { saved: Consignment } | { error: string } {
    const card = this.entries().find((entry) => entry.number === number);
    if (!card || card.stage !== 'with-store') return { error: 'O recebimento só pode ser registrado após a entrega ao cliente.' };
    const pending = cents(card.sold * card.unitPrice - card.received);
    if (!validMoney(amount) || amount > pending) return { error: `Informe um valor maior que zero e até ${formatMoney(pending)}, com duas casas decimais.` };
    const receipt = this.cashLedger.addReceipt({ date, amount, origin: 'consignment', reference: card.number, party: card.store, method, note });
    if ('error' in receipt) return receipt;
    const saved = { ...card, received: cents(card.received + amount) };
    this.entries.update((items) => items.map((entry) => entry.number === number ? saved : entry));
    return { saved };
  }
}

@Component({
  selector: 'app-consignado',
  imports: [FormsModule, HlmButton, HlmCheckbox, HlmCard, HlmInput, HorizontalDragScroll, ...HlmDialogImports, ...HlmNativeSelectImports],
  templateUrl: './consignado.html',
  styleUrl: './consignado.css',
})
export class Consignado {
  @ViewChild('board') private board?: ElementRef<HTMLElement>;
  @ViewChild('detailsDialog') private detailsDialog?: HlmDialog;
  private readonly catalog = inject(ProductsPreview);
  private readonly contacts = inject(ContactsPreview);
  private readonly orders = inject(OrdersPreview);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly inventory = inject(FilamentsPreview);
  private readonly unitInventory = inject(UnitSuppliesPreview);
  protected readonly products = this.catalog.products;
  protected readonly stores = computed(() => [...new Set([
    ...examples.map((card) => card.store),
    ...this.orders.orders().map((order) => order.customer.trim()),
    ...this.contacts.contacts().map((contact) => contact.name),
  ].filter(Boolean))]);
  protected readonly margins = readPercentages();
  protected readonly creating = signal(false);
  protected createStore = '';
  protected createProductId = '';
  protected createSizeId = '';
  protected createQuantity: number | null = 1;
  protected createMarginId: number | null = null;
  protected readonly createError = signal('');
  protected consumptionDraft: ConsumptionDraft = { enabled: false, lines: [] };
  private readonly consignments = inject(ConsignmentsPreview);
  private readonly entries = this.consignments.entries;
  protected readonly query = signal('');
  private readonly selectedNumber = signal<string | null>(null);
  protected readonly selected = computed(() => this.entries().find((card) => card.number === this.selectedNumber()) ?? null);
  protected readonly selectedStage = computed(() => stages.find((stage) => stage.id === (this.selected() ? visualColumn(this.selected()!) : null)));
  protected readonly action = computed(() => this.selected() ? nextAction[this.selected()!.stage] : null);
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly error = signal('');
  protected readonly notice = signal('');
  private columnChanged = false;
  protected saleQuantity: number | null = null;
  protected returnQuantity: number | null = null;
  protected paymentAmount: number | null = null;
  protected paymentDate = todayDate();
  protected paymentMethod: PaymentMethodPreview = 'Não informado';
  protected failureQuantity = 1;
  protected failureMaterialMode: 'whole' | 'manual' = 'whole';
  protected failureDate = todayDate();
  protected failureReason = '';
  protected failureHours: number | null = null;
  protected failureMaterials: { filamentId: string; grams: number | null }[] = [];
  protected retryMaterials: { filamentId: string; grams: number | null }[] = [];
  protected readonly filtered = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.entries().filter((card) => normalizeSearch(`${card.number} ${card.store} ${card.product}`).includes(term));
  });
  protected readonly columns = computed(() => stages.map((stage) => ({
    ...stage, cards: this.filtered().filter((card) => visualColumn(card) === stage.id),
  })));
  protected readonly money = formatMoney;
  protected readonly measure = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  protected readonly filaments = this.inventory.filaments;
  protected sizeFor(card: Consignment): ProductSize | undefined {
    return this.products().find((product) => product.id === card.productId)?.sizes.find((size) => size.id === card.sizeId);
  }
  protected filamentName(id: string): string {
    const filament = this.filaments().find((entry) => entry.id === id);
    return filament ? `${filament.material} ${filament.color}` : 'Filamento indisponível';
  }
  private draftFor(card: Consignment): ConsumptionDraft {
    const lines = card.filamentConsumptionOverride ?? this.sizeFor(card)?.materials.map((line) => ({ filamentId: line.filamentId, grams: line.gramsPerUnit * card.quantity })) ?? [];
    return { enabled: card.filamentConsumptionOverride != null, lines: lines.map((line) => ({ ...line })) };
  }
  protected setRealConsumption(enabled: boolean): void {
    const card = this.selected();
    if (!card) return;
    this.consumptionDraft = { enabled, lines: enabled ? this.draftFor(card).lines : [] };
    this.error.set('');
  }
  protected addConsumptionLine(): void { this.consumptionDraft.lines.push({ filamentId: '', grams: null }); }
  protected removeConsumptionLine(index: number): void { this.consumptionDraft.lines.splice(index, 1); }
  protected consumptionChanged(card: Consignment): boolean {
    if (!this.consumptionDraft.enabled) return card.filamentConsumptionOverride != null;
    const saved = card.filamentConsumptionOverride;
    return !saved || saved.length !== this.consumptionDraft.lines.length || saved.some((line, index) => line.filamentId !== this.consumptionDraft.lines[index].filamentId || line.grams !== this.consumptionDraft.lines[index].grams);
  }
  protected saveConsumption(): void {
    const card = this.selected();
    if (!card || card.stage !== 'quote' || !card.productId || !card.sizeId) return;
    const lines = this.consumptionDraft.enabled ? this.consumptionDraft.lines : null;
    if (lines && (!lines.length || lines.some((line) => !this.filaments().some((filament) => filament.id === line.filamentId) || line.grams === null || !Number.isFinite(line.grams) || line.grams <= 0 || !Number.isSafeInteger(Math.round(line.grams * 100)) || Math.abs(line.grams * 100 - Math.round(line.grams * 100)) > 0.000001) || new Set(lines.map((line) => line.filamentId)).size !== lines.length)) {
      this.error.set('Informe pelo menos um filamento cadastrado, com gramas positivas e até duas casas decimais, sem repetições.');
      return;
    }
    const updated = { ...card, filamentConsumptionOverride: lines?.map((line) => ({ filamentId: line.filamentId, grams: line.grams! })) ?? null };
    this.update(updated, 'Consumo de filamento para baixa no estoque atualizado.');
    this.consumptionDraft = this.draftFor(updated);
  }
  protected createSizes() { return this.products().find((product) => product.id === this.createProductId)?.sizes ?? []; }
  protected createProductChanged(id: string): void { this.createProductId = id; this.createSizeId = ''; }
  protected createPrice() {
    const size = this.createSizes().find((entry) => entry.id === this.createSizeId);
    const margin = this.margins.find((entry) => entry.id === this.createMarginId);
    const energy = latestEnergySetting();
    if (!size || !margin || !energy || !Number.isSafeInteger(this.createQuantity) || this.createQuantity === null || this.createQuantity < 1) return null;
    return calculateItemPrice({ name: '', productId: this.createProductId, sizeId: size.id, sizeSnapshot: null, quantity: this.createQuantity, marginId: margin.id }, size, this.inventory.filaments(), energy, margin, this.unitInventory.supplies());
  }
  protected openCreate(): void {
    this.selectedNumber.set(null);
    this.createStore = '';
    this.createProductId = '';
    this.createSizeId = '';
    this.createQuantity = 1;
    this.createMarginId = this.margins.find((margin) => margin.name === 'Lojas')?.id ?? this.margins[0]?.id ?? null;
    this.createError.set('');
    this.creating.set(true);
    this.detailsDialog?.open();
  }
  protected saveCreate(): void {
    if (!this.stores().includes(this.createStore)) { this.createError.set('Escolha um cliente cadastrado ou de exemplo.'); return; }
    const product = this.products().find((entry) => entry.id === this.createProductId);
    if (!product) { this.createError.set('Escolha um produto cadastrado.'); return; }
    if (!product.sizes.some((size) => size.id === this.createSizeId)) { this.createError.set('Escolha um tamanho cadastrado para o produto.'); return; }
    if (!Number.isSafeInteger(this.createQuantity) || this.createQuantity === null || this.createQuantity < 1) { this.createError.set('Informe uma quantidade inteira maior que zero.'); return; }
    if (!this.margins.some((margin) => margin.id === this.createMarginId)) { this.createError.set('Escolha uma margem cadastrada em Precificação.'); return; }
    const price = this.createPrice();
    if (!price) { this.createError.set('Não foi possível calcular o preço. Confira o tamanho, os filamentos e a energia cadastrados.'); return; }
    const nextNumber = Math.max(0, ...this.entries().map((card) => Number(card.number.replace(/^#C-/, '')) || 0)) + 1;
    const contact = this.contacts.contacts().find((entry) => normalizeSearch(entry.name) === normalizeSearch(this.createStore));
    const card: Consignment = { number: `#C-${String(nextNumber).padStart(3, '0')}`, store: this.createStore, contactId: contact?.id, product: product.name, productId: product.id, sizeId: this.createSizeId, marginId: this.createMarginId!, stage: 'quote', quantity: this.createQuantity, sold: 0, returned: 0, unitPrice: price.unitPrice, received: 0 };
    this.entries.update((items) => [...items, card]);
    this.query.set('');
    this.selectedNumber.set(card.number);
    this.creating.set(false);
    this.consumptionDraft = this.draftFor(card);
    this.createError.set('');
    this.notice.set(`Consignação ${card.number} criada em Em orçamento nesta prévia.`);
  }
  protected open(card: Consignment): void {
    this.creating.set(false);
    this.selectedNumber.set(card.number);
    this.consumptionDraft = this.draftFor(card);
    this.error.set('');
    this.notice.set('');
    this.columnChanged = false;
    this.failureQuantity = 1;
    this.failureMaterialMode = 'whole';
    this.failureDate = todayDate();
    this.failureReason = '';
    const size = this.sizeFor(card);
    this.failureHours = size?.printHours ?? null;
    this.failureMaterials = [{ filamentId: '', grams: null }];
    this.retryMaterials = (card.failures?.at(-1)?.materials ?? []).map((line) => ({ filamentId: line.filamentId, grams: line.grams }));
    this.detailsDialog?.open();
  }
  protected close(): void { this.detailsDialog?.close(); }
  protected dialogClosed(): void {
    this.selectedNumber.set(null);
    this.creating.set(false);
    this.saleQuantity = this.returnQuantity = this.paymentAmount = null;
    this.paymentDate = todayDate();
    this.paymentMethod = 'Não informado';
    if (this.columnChanged) this.board?.nativeElement.focus({ preventScroll: true });
  }
  protected productImage(card: Consignment): string | null {
    if (this.failedImages().has(card.number)) return null;
    const id = card.productId ?? exampleProductIds.get(card.product);
    return this.catalog.products().find((product) => product.id === id)?.image ?? null;
  }
  protected imageFailed(card: Consignment): void {
    this.failedImages.update((numbers) => new Set([...numbers, card.number]));
  }
  protected soldValue(card: Consignment): number { return cents(card.sold * card.unitPrice); }
  protected beforeDelivery(card: Consignment): boolean { return card.stage !== 'with-store'; }
  protected remaining(card: Consignment): number { return card.quantity - card.sold - card.returned; }
  protected pending(card: Consignment): number { return Math.max(0, cents(this.soldValue(card) - card.received)); }
  protected operationalLabel(card: Consignment): string {
    return card.stage === 'with-store' ? 'Entregue à loja' : stages.find((stage) => stage.id === card.stage)?.label ?? '';
  }

  protected advance(): void {
    const card = this.selected();
    const action = card && nextAction[card.stage];
    if (!card || !action) return;
    if (card.retryPending) { this.error.set('Inicie uma nova tentativa antes de avançar a consignação.'); return; }
    if (action.target === 'confirmed' && card.productId && card.sizeId) {
      if (this.consumptionChanged(card)) { this.error.set('Salve o consumo real antes de confirmar a consignação.'); return; }
      const size = this.catalog.products().find((product) => product.id === card.productId)?.sizes.find((entry) => entry.id === card.sizeId);
      if (!size) { this.error.set('O tamanho cadastrado não está mais disponível.'); return; }
      const filamentRequirements = new Map<string, number>();
      const unitRequirements = new Map<string, number>();
      for (const line of card.filamentConsumptionOverride ?? size.materials) {
        const grams = 'grams' in line ? line.grams : line.gramsPerUnit * card.quantity;
        filamentRequirements.set(line.filamentId, (filamentRequirements.get(line.filamentId) ?? 0) + grams);
      }
      for (const line of size.unitMaterials ?? []) unitRequirements.set(line.supplyId, (unitRequirements.get(line.supplyId) ?? 0) + line.unitsPerUnit * card.quantity);
      const filamentCheck = this.inventory.validateConsumption(filamentRequirements);
      if ('error' in filamentCheck) { this.error.set(filamentCheck.error); return; }
      const unitCheck = this.unitInventory.validateConsumption(unitRequirements);
      if ('error' in unitCheck) { this.error.set(unitCheck.error); return; }
      const filamentResult = this.inventory.consume(filamentRequirements);
      if ('error' in filamentResult) { this.error.set(filamentResult.error); return; }
      const unitResult = this.unitInventory.consume(unitRequirements);
      if ('error' in unitResult) { this.inventory.restore(filamentRequirements); this.error.set(unitResult.error); return; }
      this.update({ ...card, stage: action.target, stockConsumption: [...filamentRequirements].map(([filamentId, grams]) => ({ filamentId, grams })) }, `${action.label} registrada nesta prévia.`);
      return;
    }
    this.update({ ...card, stage: action.target }, `${action.label} registrada nesta prévia.`);
  }

  protected addFailureMaterial(): void { this.failureMaterials.push({ filamentId: '', grams: null }); }
  protected failureQuantityChanged(): void {
    const card = this.selected();
    const size = card && this.sizeFor(card);
    if (size && this.failureMaterialMode === 'whole') this.failureHours = Math.round(size.printHours * this.failureQuantity * 100) / 100;
  }
  protected setFailureMaterialMode(mode: 'whole' | 'manual'): void {
    this.failureMaterialMode = mode;
    if (mode === 'manual') {
      this.failureMaterials = [{ filamentId: '', grams: null }];
      this.failureHours = null;
    } else this.failureQuantityChanged();
  }
  protected failureEstimatedMaterials(): { filamentId: string; grams: number }[] {
    const card = this.selected();
    const size = card && this.sizeFor(card);
    return size?.materials.map((line) => ({ filamentId: line.filamentId, grams: Math.round(line.gramsPerUnit * this.failureQuantity * 100) / 100 })) ?? [];
  }
  protected removeFailureMaterial(index: number): void { this.failureMaterials.splice(index, 1); }
  protected addRetryMaterial(): void { this.retryMaterials.push({ filamentId: '', grams: null }); }
  protected removeRetryMaterial(index: number): void { this.retryMaterials.splice(index, 1); }
  protected recordFailure(): void {
    const card = this.selected();
    if (!card) return;
    const materials = this.failureMaterialMode === 'whole' ? this.failureEstimatedMaterials() : this.failureMaterials.map((line) => ({ filamentId: line.filamentId, grams: line.grams! }));
    if (this.failureMaterialMode === 'whole' && !materials.length) { this.error.set('Cadastre o consumo de filamento no tamanho do produto ou informe a perda manualmente.'); return; }
    const result = this.consignments.recordFailure(card.number, {
      date: this.failureDate, quantity: this.failureMaterialMode === 'whole' ? this.failureQuantity : 0, reason: this.failureReason, hours: this.failureHours!, materialMode: this.failureMaterialMode,
      materials,
    });
    if ('error' in result) { this.error.set(result.error); return; }
    this.retryMaterials = materials.map((line) => ({ ...line }));
    this.failureReason = '';
    this.error.set('');
    this.notice.set('Falha registrada. Informe o material da nova tentativa.');
  }
  protected startRetry(): void {
    const card = this.selected();
    if (!card) return;
    const result = this.consignments.startRetry(card.number, this.retryMaterials.map((line) => ({ filamentId: line.filamentId, grams: line.grams! })));
    if ('error' in result) { this.error.set(result.error); return; }
    this.error.set('');
    this.notice.set('Nova tentativa iniciada e material adicional baixado do estoque.');
  }

  protected recordSale(): void {
    const card = this.selected();
    const quantity = this.saleQuantity;
    if (!card || card.stage !== 'with-store') return;
    if (!Number.isSafeInteger(quantity) || quantity === null || quantity <= 0 || quantity > this.remaining(card)) {
      this.error.set(`Informe de 1 a ${this.remaining(card)} unidades disponíveis na loja.`);
      return;
    }
    this.saleQuantity = null;
    this.update({ ...card, sold: card.sold + quantity }, `${quantity} ${quantity === 1 ? 'unidade vendida registrada' : 'unidades vendidas registradas'}.`);
  }

  protected recordReturn(): void {
    const card = this.selected();
    const quantity = this.returnQuantity;
    if (!card || card.stage !== 'with-store') return;
    if (!Number.isSafeInteger(quantity) || quantity === null || quantity <= 0 || quantity > this.remaining(card)) {
      this.error.set(`Informe de 1 a ${this.remaining(card)} unidades disponíveis na loja.`);
      return;
    }
    this.returnQuantity = null;
    this.update({ ...card, returned: card.returned + quantity }, `${quantity} ${quantity === 1 ? 'unidade devolvida registrada' : 'unidades devolvidas registradas'}.`);
  }

  protected recordPayment(): void {
    const card = this.selected();
    const amount = this.paymentAmount;
    if (!card || card.stage !== 'with-store') return;
    const result = this.consignments.recordPayment(card.number, amount ?? NaN, this.paymentDate, this.paymentMethod);
    if ('error' in result) { this.error.set(result.error); return; }
    if (visualColumn(card) !== visualColumn(result.saved)) this.columnChanged = true;
    this.paymentAmount = null;
    this.error.set('');
    this.notice.set(`Recebimento de ${this.money(amount!)} registrado.`);
  }

  private update(card: Consignment, notice: string): void {
    const previous = this.entries().find((item) => item.number === card.number);
    if (previous && visualColumn(previous) !== visualColumn(card)) this.columnChanged = true;
    this.entries.update((items) => items.map((item) => item.number === card.number ? card : item));
    this.error.set('');
    this.notice.set(notice);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const board = this.board?.nativeElement;
      if (!board) return;
      let frame = 0;
      const fitBoard = () => {
        const top = board.getBoundingClientRect().top + window.scrollY;
        const minimum = window.innerWidth < 640 ? Math.max(220, Math.floor(window.innerHeight * 0.78)) : 480;
        const height = `${Math.max(minimum, Math.floor(window.innerHeight - top - 32))}px`;
        if (board.style.getPropertyValue('--kanban-height') !== height) board.style.setProperty('--kanban-height', height);
      };
      const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fitBoard);
      });
      observer?.observe(board.parentElement!);
      window.addEventListener('resize', fitBoard);
      fitBoard();
      const requestedNumber = this.route?.snapshot.queryParamMap.get('abrir');
      const requestedCard = this.entries().find((card) => card.number === requestedNumber);
      if (requestedCard) this.open(requestedCard);
      destroyRef.onDestroy(() => {
        observer?.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', fitBoard);
      });
    });
  }
}
