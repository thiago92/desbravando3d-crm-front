import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { formatMeasure, formatMoney, normalizeSearch } from '../../shared/utils/presentation';
import { FilamentPreview, FilamentsPreview, StockMode, calculateStockBalance } from './filaments-preview';
import { UnitSupplyPreview, UnitSuppliesPreview, UnitStockMode, calculateUnitStockBalance } from './unit-supplies-preview';

@Component({
  selector: 'app-insumos',
  imports: [FormsModule, HlmButton, HlmInput, ...HlmDialogImports, ...HlmTableImports, ...HlmToggleGroupImports],
  templateUrl: './insumos.html',
})
export class Insumos {
  @ViewChild('filamentDialog') private dialog?: HlmDialog;
  @ViewChild('unitDialog') private unitDialog?: HlmDialog;
  private readonly inventory = inject(FilamentsPreview);
  private readonly unitInventory = inject(UnitSuppliesPreview);
  protected readonly query = signal('');
  protected readonly selected = signal<FilamentPreview | null>(null);
  protected readonly mode = signal<StockMode>('add');
  protected readonly quantity = signal<number | null>(null);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly saved = signal(false);
  protected readonly filaments = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.inventory.filaments().filter((item) => [item.name, item.material, item.color].some((value) => normalizeSearch(value).includes(term)));
  });
  protected readonly units = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.unitInventory.supplies().filter((item) => normalizeSearch(item.name).includes(term));
  });
  protected readonly nextBalance = computed(() => calculateStockBalance(this.selected()?.balanceGrams ?? 0, {
    mode: this.selected() ? this.mode() : 'replace', grams: this.quantity(),
  }));
  protected readonly measure = formatMeasure;
  protected readonly money = formatMoney;
  protected name = '';
  protected material = '';
  protected color = '';
  protected pricePerKg: number | null = null;
  protected readonly selectedUnit = signal<UnitSupplyPreview | null>(null);
  protected readonly unitMode = signal<UnitStockMode>('add');
  protected readonly unitQuantity = signal<number | null>(null);
  protected readonly unitError = signal('');
  protected readonly unitSaved = signal(false);
  protected unitName = '';
  protected unitPrice: number | null = null;
  protected readonly nextUnitBalance = computed(() => calculateUnitStockBalance(this.selectedUnit()?.balanceUnits ?? 0, {
    mode: this.selectedUnit() ? this.unitMode() : 'replace', units: this.unitQuantity(),
  }));

  protected open(item?: FilamentPreview): void {
    this.selected.set(item ?? null);
    this.name = item?.name ?? '';
    this.material = item?.material ?? '';
    this.color = item?.color ?? '';
    this.pricePerKg = item?.pricePerKg ?? null;
    this.mode.set('add');
    this.quantity.set(null);
    this.error.set('');
    this.notice.set('');
    this.saved.set(false);
    this.dialog?.open();
  }

  protected setMode(value: unknown): void {
    if (value !== 'add' && value !== 'replace') return;
    if (value === this.mode()) return;
    this.mode.set(value);
    this.quantity.set(null);
    this.error.set('');
  }

  protected close(): void { this.dialog?.close(); }
  protected openUnit(item?: UnitSupplyPreview): void {
    this.selectedUnit.set(item ?? null);
    this.unitName = item?.name ?? '';
    this.unitPrice = item?.pricePerUnit ?? null;
    this.unitMode.set('add');
    this.unitQuantity.set(null);
    this.unitError.set('');
    this.unitSaved.set(false);
    this.unitDialog?.open();
  }
  protected setUnitMode(value: unknown): void {
    if (value !== 'add' && value !== 'replace') return;
    if (value === this.unitMode()) return;
    this.unitMode.set(value);
    this.unitQuantity.set(null);
    this.unitError.set('');
  }
  protected saveUnit(): void {
    if (this.unitSaved()) return;
    if (this.unitPrice === null) { this.unitError.set('Informe o preço por unidade.'); return; }
    const result = this.unitInventory.save(this.unitName, this.unitPrice, {
      mode: this.selectedUnit() ? this.unitMode() : 'replace', units: this.unitQuantity(),
    }, this.selectedUnit()?.id);
    if ('error' in result) { this.unitError.set(result.error); return; }
    this.unitSaved.set(true);
    this.notice.set(`${result.saved.name} ${this.selectedUnit() ? 'atualizado' : 'cadastrado'}. Saldo disponível: ${result.saved.balanceUnits} un.`);
    this.unitDialog?.close();
  }

  protected save(): void {
    if (this.saved()) return;
    if (this.pricePerKg === null) { this.error.set('Informe o preço do filamento por kg.'); return; }
    const result = this.inventory.save({ name: this.name, material: this.material, color: this.color, pricePerKg: this.pricePerKg }, {
      mode: this.selected() ? this.mode() : 'replace', grams: this.quantity(),
    }, this.selected()?.id);
    if ('error' in result) { this.error.set(result.error); return; }
    this.saved.set(true);
    this.notice.set(`${result.saved.name} ${this.selected() ? 'atualizado' : 'cadastrado'}. Saldo disponível: ${this.measure(result.saved.balanceGrams)} g.`);
    this.close();
  }
}
