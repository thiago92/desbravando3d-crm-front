import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductPreview, ProductSize, ProductsPreview } from './products-preview';
import { ProductGallery } from './product-gallery';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { formatMeasure, formatMoney, normalizeSearch } from '../../shared/utils/presentation';

@Component({
  selector: 'app-produtos',
  imports: [FormsModule, ProductGallery, HlmButton, HlmInput, ...HlmDialogImports, ...HlmTableImports, ...HlmToggleGroupImports, ...HlmRadioGroupImports, ...HlmNativeSelectImports, HlmTextarea, HlmCheckbox],
  templateUrl: './produtos.html',
  styleUrl: './produtos.css',
})
export class Produtos {
  @ViewChild('productDialog') private dialog?: HlmDialog;
  private readonly catalog = inject(ProductsPreview);
  private readonly inventory = inject(FilamentsPreview);
  protected readonly filaments = this.inventory.filaments;
  protected readonly query = signal('');
  protected readonly view = signal<'grid' | 'table'>('grid');
  protected readonly selected = signal<ProductPreview | null>(null);
  protected readonly editing = signal(false);
  protected readonly image = signal('');
  protected readonly gallery = signal<(string | null)[]>([]);
  protected readonly error = signal('');
  protected readonly readingImage = signal(false);
  protected readonly products = computed(() => {
    const query = normalizeSearch(this.query().trim());
    return this.catalog.products().filter((item) => normalizeSearch(item.name).includes(query));
  });
  protected name = '';
  protected description = '';
  protected sizes: { id: string; name: string; heightCm: number | null; widthCm: number | null; depthCm: number | null; price: number | null; printHours: number | null; weightGrams?: number | null; materials: { filamentId: string; gramsPerUnit: number | null }[] }[] = [];
  protected customSizes = false;
  protected readonly selectedSizeIndex = signal(0);
  protected readonly selectedSize = computed(() => this.selected()?.sizes[this.selectedSizeIndex()] ?? null);
  private imageRequest = 0;

  protected open(product?: ProductPreview): void {
    this.imageRequest++;
    this.readingImage.set(false);
    this.selected.set(product ?? null);
    this.selectedSizeIndex.set(0);
    this.editing.set(!product);
    this.fillForm();
    this.dialog?.open();
  }

  private fillForm(): void {
    const product = this.selected();
    this.name = product?.name ?? '';
    this.description = product?.description ?? '';
    this.sizes = (product?.sizes ?? []).map((size) => ({ ...size, materials: size.materials.map((line) => ({ ...line })) }));
    this.customSizes = product?.customSizes ?? false;
    this.image.set(product?.image ?? '');
    this.gallery.set([...(product?.gallery ?? [])]);
    this.error.set('');
  }

  protected edit(): void { this.fillForm(); this.editing.set(true); }

  protected addSize(): void {
    this.sizes.push({ id: crypto.randomUUID(), name: '', heightCm: null, widthCm: null, depthCm: null, price: null, printHours: null, materials: [] });
  }

  protected addSizeMaterial(index: number): void { this.sizes[index].materials.push({ filamentId: '', gramsPerUnit: null }); }
  protected removeSizeMaterial(index: number, line: number): void { this.sizes[index].materials.splice(line, 1); }
  protected filamentName(id: string): string {
    const filament = this.filaments().find((entry) => entry.id === id);
    return filament ? `${filament.material} ${filament.color}` : 'Filamento indisponível';
  }

  protected readonly money = formatMoney;
  protected readonly measure = formatMeasure;

  protected setView(value: unknown): void {
    if (value === 'grid' || value === 'table') this.view.set(value);
  }

  protected dialogClosed(): void {
    this.imageRequest++;
    this.readingImage.set(false);
  }

  protected priceLabel(product: ProductPreview): string {
    if (!product.sizes.length) return product.customSizes ? 'Sob orçamento' : 'Preço não informado';
    const minimum = Math.min(...product.sizes.map((size) => size.price));
    return `${product.sizes.length > 1 ? 'A partir de ' : ''}${this.money(minimum)}`;
  }

  protected close(): void { this.dialog?.close(); }

  protected cancelEdit(): void {
    this.imageRequest++;
    this.readingImage.set(false);
    if (this.selected()) { this.fillForm(); this.editing.set(false); }
    else this.close();
  }

  protected removeGalleryImage(index: number): void {
    this.gallery.update((items) => items.filter((_, position) => position !== index));
  }

  protected async chooseImage(event: Event, target: 'principal' | 'gallery' = 'principal'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const request = ++this.imageRequest;
    this.readingImage.set(false);
    this.error.set('');
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      this.error.set('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
      input.value = '';
      return;
    }
    this.readingImage.set(true);
    try {
      const images = await Promise.all(files.map(async (file) => {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('read'));
          reader.readAsDataURL(file);
        });
        const preview = new Image();
        preview.src = data;
        await preview.decode();
        return data;
      }));
      if (request === this.imageRequest) {
        if (target === 'principal') this.image.set(images[0]);
        else this.gallery.update((items) => [...items, ...images]);
      }
    } catch {
      if (request === this.imageRequest) this.error.set('Não foi possível abrir a imagem. Escolha outro arquivo.');
    } finally {
      if (request === this.imageRequest) this.readingImage.set(false);
      input.value = '';
    }
  }

  protected save(): void {
    if (this.readingImage()) return;
    if (!this.name.trim()) { this.error.set('Informe o nome do produto.'); return; }
    if (this.sizes.some((size) => !size.name.trim() || [size.heightCm, size.widthCm, size.depthCm, size.price].some((value) => value === null || !Number.isFinite(value) || value <= 0))) {
      this.error.set('Preencha o nome, as três medidas e o preço de cada tamanho com valores maiores que zero.');
      return;
    }
    const validPositive = (value: number | null): boolean => value !== null && Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
    if (this.sizes.some((size) => size.weightGrams != null && !validPositive(size.weightGrams))) {
      this.error.set('Informe um peso maior que zero, com até duas casas decimais, ou deixe o campo vazio.');
      return;
    }
    if (this.sizes.some((size) => !validPositive(size.printHours) || !size.materials.length || size.materials.some((line) => !this.filaments().some((filament) => filament.id === line.filamentId) || !validPositive(line.gramsPerUnit)) || new Set(size.materials.map((line) => line.filamentId)).size !== size.materials.length)) {
      this.error.set('Informe horas de impressão e pelo menos um filamento por tamanho, com gramas por unidade maiores que zero e sem repetir filamentos. Use até duas casas decimais.');
      return;
    }
    const sizes = this.sizes.map((size) => ({ ...size, name: size.name.trim(), printHours: size.printHours!, materials: size.materials.map((line) => ({ filamentId: line.filamentId, gramsPerUnit: line.gramsPerUnit! })) })) as ProductSize[];
    const saved = this.catalog.save({ name: this.name.trim(), description: this.description.trim(), image: this.image() || null, gallery: this.gallery().length ? [...this.gallery()] : null, sizes, customSizes: this.customSizes }, this.selected()?.id);
    this.selected.set(saved);
    this.selectedSizeIndex.set(0);
    this.editing.set(false);
    this.error.set('');
  }
}
