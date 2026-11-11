import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { Consignado } from './consignado';
import { UnitSuppliesPreview } from '../insumos/unit-supplies-preview';
import { FilamentsPreview } from '../insumos/filaments-preview';
import { ProductsPreview } from '../produtos/products-preview';

describe('Consignado: prévia do kanban', () => {
  it('mantém pelo menos 480 px de altura no desktop quando a janela é baixa', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado] }).compileComponents();
    const fixture = TestBed.createComponent(Consignado);
    fixture.detectChanges();
    await fixture.whenStable();
    const board = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.kanban-board')!;
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1366);
    const height = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(700);
    const rect = vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ top: 330 } as DOMRect);
    window.dispatchEvent(new Event('resize'));
    expect(parseFloat(board.style.getPropertyValue('--kanban-height'))).toBe(480);
    rect.mockRestore();
    height.mockRestore();
    width.mockRestore();
  });

  it('abre o registro indicado por Clientes e lojas', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado], providers: [provideSpartanHlm(), { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ abrir: '#C-014' }) } } }] }).compileComponents();
    const fixture = TestBed.createComponent(Consignado);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector<HTMLElement>('[role="dialog"]')?.textContent).toContain('Consignação #C-014');
  });

  it('cadastra uma consignação na mesma modal e a coloca em Em orçamento', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado], providers: [provideSpartanHlm()] }).compileComponents();
    const supplies = TestBed.inject(UnitSuppliesPreview);
    const ring = supplies.save('Argola', 0.5, { mode: 'replace', units: 0 });
    expect(ring).toHaveProperty('saved');
    if (!('saved' in ring)) return;
    const catalog = TestBed.inject(ProductsPreview);
    const product = catalog.products().find((entry) => entry.id === 'preview-1')!;
    catalog.save({ ...product, sizes: product.sizes.map((size) => size.id === 'vase-small' ? { ...size, unitMaterials: [{ supplyId: ring.saved.id, unitsPerUnit: 1 }] } : size) }, product.id);
    const inventory = TestBed.inject(FilamentsPreview);
    const filamentBefore = inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams;
    const fixture = TestBed.createComponent(Consignado);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const opener = [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Novo consignado'))!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Novo consignado');
    const choose = async (id: string, value: string) => {
      const select = dialog.querySelector<HTMLSelectElement>(`#${id}`)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await choose('create-consignment-store', 'Loja Aurora');
    await choose('create-consignment-product', 'preview-1');
    await choose('create-consignment-size', 'vase-small');
    expect(dialog.textContent).toContain('R$\u00a013,48');
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.textContent).toContain('Consignação #C-033');
    expect(document.querySelector('[data-stage="quote"] [aria-label^="Ver consignação #C-033"]')).not.toBeNull();
    expect(document.querySelectorAll('.consignment-card')).toHaveLength(24);
    expect(dialog.querySelector('#consignment-real-grams-0')).toBeNull();
    dialog.querySelector<HTMLElement>('#consignment-real-consumption')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const realGrams = dialog.querySelector<HTMLInputElement>('#consignment-real-grams-0')!;
    expect(realGrams.value).toBe('50');
    realGrams.value = '700';
    realGrams.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Salvar consumo de estoque')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.textContent).toContain('R$\u00a013,48');
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Confirmar consignação')!;
    confirm.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('Estoque insuficiente de Filamento vermelho');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(filamentBefore);
    const correctedGrams = dialog.querySelector<HTMLInputElement>('#consignment-real-grams-0')!;
    correctedGrams.value = '20';
    correctedGrams.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Salvar consumo de estoque')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    confirm.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('Estoque insuficiente de Argola');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(filamentBefore);
    supplies.save('Argola', 0.5, { mode: 'add', units: 1 }, ring.saved.id);
    confirm.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(supplies.supplies()[0].balanceUnits).toBe(0);
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(filamentBefore - 20);
    dialog.querySelector<HTMLButtonElement>('button[hlmdialogclose]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.kanban-board'));
  });

  it('mantém as colunas e mostra vendas, devoluções e acertos sem misturar as quantidades', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado] }).compileComponents();
    const fixture = TestBed.createComponent(Consignado);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.kanban-column')).toHaveLength(10);
    expect(root.querySelectorAll('.consignment-card')).toHaveLength(23);
    expect(root.querySelector('[data-stage="partially-returned"] h2')?.textContent).toBe('Devolvidas parcialmente');
    expect(root.querySelector('[data-stage="returned"] h2')?.textContent).toBe('Devolvidas');
    const partial = root.querySelector('[data-stage="partially-returned"] .consignment-card')?.textContent ?? '';
    expect(partial).toContain('50');
    expect(partial).toContain('25');
    expect(partial).toContain('R$');
    expect(root.querySelector('[data-stage="returned"] .consignment-card')?.textContent).toContain('Ateliê Central');
    expect(root.querySelector('[data-stage="partial-settlement"]')?.textContent).toContain('#C-028');
    expect(root.querySelector('[data-stage="partial-settlement"]')?.textContent).toContain('R$ 12,24');

    const search = root.querySelector<HTMLInputElement>('#consignment-search')!;
    search.value = 'Casa Criativa';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelectorAll('.kanban-column')).toHaveLength(10);
    expect(root.querySelectorAll('.consignment-card')).toHaveLength(2);
  });

  it('abre os detalhes da consignação com valores pendentes e devolve o foco ao cartão', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado], providers: [provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(Consignado);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();

    const opener = document.querySelector<HTMLButtonElement>('[data-stage="partially-returned"] .consignment-card [aria-label^="Ver consignação #C-017"]')!;
    expect(opener.parentElement?.querySelectorAll('button')).toHaveLength(1);
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Consignação #C-017');
    expect(dialog.textContent).toContain('Casa Criativa');
    expect(dialog.textContent).toContain('R$ 612,00');
    expect(dialog.textContent).toContain('R$ 312,00');
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/products/stand.svg');

    dialog.querySelector<HTMLButtonElement>('button[hlmdialogclose]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('avança etapas e recalcula vendas, recebimentos e devoluções parciais', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado], providers: [provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(Consignado);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('[aria-label^="Ver consignação #C-010"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const inventory = TestBed.inject(FilamentsPreview);
    const balanceBefore = inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams;
    const click = async (label: string) => {
      [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === label)!.click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const fill = async (selector: string, value: string) => {
      const input = dialog.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };

    expect(dialog.querySelector('#consignment-real-grams-0')).toBeNull();
    dialog.querySelector<HTMLElement>('#consignment-real-consumption')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const realGrams = dialog.querySelector<HTMLInputElement>('#consignment-real-grams-0')!;
    expect(realGrams.value).toBe('600');
    realGrams.value = '110';
    realGrams.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    await click('Salvar consumo de estoque');
    await click('Confirmar consignação');
    expect(inventory.filaments().find((entry) => entry.id === 'filament-preview-1')!.balanceGrams).toBe(balanceBefore - 110);
    await click('Iniciar impressão');
    await click('Marcar como pronta para entrega');
    await click('Registrar entrega à loja');
    expect(document.querySelector('[data-stage="with-store"] [aria-label^="Ver consignação #C-010"]')).not.toBeNull();

    await fill('#consignment-sale-quantity', '5');
    await click('Registrar venda');
    expect(dialog.textContent).toContain('R$ 194,40');
    await fill('#consignment-payment', '100');
    await click('Registrar recebimento');
    expect(document.querySelector('[data-stage="partial-settlement"] [aria-label^="Ver consignação #C-010"]')).not.toBeNull();
    expect(dialog.textContent).toContain('R$ 94,40');

    await fill('#consignment-return-quantity', '7');
    await click('Registrar devolução');
    expect(document.querySelector('[data-stage="partially-returned"] [aria-label^="Ver consignação #C-010"]')).not.toBeNull();
    expect(dialog.textContent).toContain('R$ 94,40');
    expect(dialog.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    await fill('#consignment-payment', '94.4');
    await click('Registrar recebimento');
    expect(document.querySelector('[data-stage="partially-returned"] [aria-label^="Ver consignação #C-010"]')).not.toBeNull();
    expect(dialog.textContent).toContain('R$ 0,00');
    await click('Fechar');
    expect(document.activeElement).toBe(document.querySelector('.kanban-board'));
  });

  it('rejeita venda acima do saldo e recebimento acima das vendas', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado], providers: [provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(Consignado);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('[aria-label^="Ver consignação #C-014"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const sale = dialog.querySelector<HTMLInputElement>('#consignment-sale-quantity')!;
    sale.value = '17';
    sale.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    dialog.querySelector<HTMLButtonElement>('form button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('1 a 16 unidades disponíveis');

    const payment = dialog.querySelector<HTMLInputElement>('#consignment-payment')!;
    payment.value = '100';
    payment.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Registrar recebimento')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('R$ 97,92');
    expect(dialog.textContent).toContain('R$ 97,92');
  });
});
