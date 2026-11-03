import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { Insumos } from './insumos';
import { FilamentsPreview } from './filaments-preview';

describe('Insumos', () => {
  let fixture: ComponentFixture<Insumos>;
  const root = () => document.body;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Insumos], providers: [provideSpartanHlm()] }).compileComponents();
    fixture = TestBed.createComponent(Insumos);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function click(text: string): Promise<void> {
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function fill(id: string, value: string): Promise<void> {
    const input = root().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function editFirst(): Promise<void> {
    root().querySelector<HTMLButtonElement>('[aria-label="Editar Filamento vermelho"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('mostra o saldo atual e soma somente a quantidade adicionada, atualizando o preço', async () => {
    await editFirst();
    expect(root().querySelector('[role="dialog"]')?.textContent).toContain('Saldo atual: 500 g');
    await fill('filament-quantity', '1000');
    expect(root().querySelector('[data-balance-preview]')?.textContent).toContain('1.500 g');
    await fill('filament-price', '130');
    const form = root().querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(TestBed.inject(FilamentsPreview).filaments()[0]).toMatchObject({ balanceGrams: 1500, pricePerKg: 130 });
    expect(root().querySelector('[role="dialog"]')).toBeNull();
    expect(root().querySelector('tbody tr')?.textContent).toContain('1.500 g');
    expect(root().querySelector('tbody tr')?.textContent).toContain('130,00');
  });

  it('limpa a quantidade ao mudar de operação, permite corrigir para zero e cancelar sem salvar', async () => {
    await editFirst();
    await fill('filament-quantity', '1000');
    await click('Corrigir saldo total');
    expect(root().querySelector<HTMLInputElement>('#filament-quantity')?.value).toBe('');
    await fill('filament-quantity', '0');
    expect(root().querySelector('[data-balance-preview]')?.textContent).toContain('0 g');
    await click('Cancelar');
    expect(TestBed.inject(FilamentsPreview).filaments()[0].balanceGrams).toBe(500);
    await editFirst();
    await click('Corrigir saldo total');
    await fill('filament-quantity', '0');
    await click('Salvar alterações');
    expect(TestBed.inject(FilamentsPreview).filaments()[0].balanceGrams).toBe(0);
  });

  it('cadastra um filamento, pesquisa por cor sem acentos e bloqueia cadastros duplicados', async () => {
    await click('+ Cadastrar filamento');
    await fill('filament-name', 'Filamento azul');
    await fill('filament-material', 'PLA');
    await fill('filament-color', 'Azul');
    await fill('filament-price', '125.50');
    await fill('filament-quantity', '1000');
    await click('Cadastrar filamento');
    expect(root().querySelectorAll('tbody tr')).toHaveLength(4);
    await fill('filament-search', 'AZÚL');
    expect(root().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root().querySelector('tbody tr')?.textContent).toContain('Filamento azul');
    await fill('filament-search', 'inexistente');
    expect(root().textContent).toContain('Nenhum filamento encontrado');
    await click('Limpar pesquisa');
    await click('+ Cadastrar filamento');
    await fill('filament-name', 'Outro azul');
    await fill('filament-material', 'pla');
    await fill('filament-color', 'azul');
    await fill('filament-price', '135');
    await fill('filament-quantity', '500');
    await click('Cadastrar filamento');
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Já existe um filamento');
    expect(TestBed.inject(FilamentsPreview).filaments()).toHaveLength(4);
  });

  it('mantém o estoque ao atualizar apenas o preço e permite fechar por Escape', async () => {
    await editFirst();
    await fill('filament-price', '140');
    await click('Salvar alterações');
    expect(TestBed.inject(FilamentsPreview).filaments()[0]).toMatchObject({ balanceGrams: 500, pricePerKg: 140 });
    await editFirst();
    await fill('filament-quantity', '200');
    root().querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root().querySelector('[role="dialog"]')).toBeNull();
    expect(TestBed.inject(FilamentsPreview).filaments()[0].balanceGrams).toBe(500);
  });
});
