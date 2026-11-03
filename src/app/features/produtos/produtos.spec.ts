import { TestBed } from '@angular/core/testing';
import { Produtos } from './produtos';
import { ProductsPreview } from './products-preview';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';

describe('Produtos: catálogo de prévia', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Produtos], providers: [provideSpartanHlm()] }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());

  it('identifica a modal pelo título, fecha por Escape e devolve o foco ao produto', async () => {
    const fixture = TestBed.createComponent(Produtos);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement);
    const opener = document.querySelector<HTMLButtonElement>('.product-card')!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toContain('Detalhes do produto');
    expect(dialog.contains(document.activeElement)).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('altera preço e medidas juntos ao selecionar um tamanho e reinicia a seleção ao reabrir', () => {
    const fixture = TestBed.createComponent(Produtos);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement);
    const root = document.body;
    expect(root.querySelector('.product-card')?.textContent).toContain('A partir de R$');
    root.querySelector<HTMLButtonElement>('.product-card')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('hlm-radio')).toHaveLength(4);
    expect(root.querySelector('.size-option')?.textContent).toContain('50 g');
    expect(root.querySelector('.size-option')?.textContent).toContain('10 × 6 × 6 cm');
    expect(root.querySelector('.size-option')?.textContent).not.toContain('Pequeno');
    root.querySelectorAll<HTMLLabelElement>('.size-option')[3].click();
    fixture.detectChanges();
    expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('250 g');
    expect(root.querySelector('dl')?.textContent).toContain('25 cm');
    root.querySelectorAll<HTMLInputElement>('hlm-radio input[type=radio]')[2].click();
    fixture.detectChanges();
    expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('65,00');
    expect(root.querySelector('dl')?.textContent).toContain('20 cm');
    expect(root.querySelector('dl')?.textContent).toContain('12 cm');
    expect(root.querySelector('[role=dialog]')?.textContent).toContain('medidas personalizadas');
    root.querySelector<HTMLButtonElement>('[aria-label="Fechar produto"]')!.click();
    root.querySelectorAll<HTMLButtonElement>('.product-card')[1].click();
    fixture.detectChanges();
    expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('30,00');
    expect(root.querySelector('dl')?.textContent).toContain('12 cm');
    expect(root.querySelector('[role=dialog]')?.textContent).not.toContain('medidas personalizadas');
  });

  it('valida tamanhos incompletos, salva preços manuais e permite remover a última variação', async () => {
    const fixture = TestBed.createComponent(Produtos);
    fixture.detectChanges();
    await fixture.whenStable();
    document.body.append(fixture.nativeElement);
    const root = document.body;
    const click = (text: string) => {
      [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === text)!.click();
      fixture.detectChanges();
    };
    click('+ Cadastrar produto');
    await fixture.whenStable();
    const fill = async (selector: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const submit = () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    await fill('#product-name', 'Miniatura');
    click('+ Adicionar tamanho');
    await fixture.whenStable();
    submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('as três medidas');
    await fill('#size-name-0', 'Mini');
    await fill('#size-height-0', '5.5');
    await fill('#size-width-0', '3');
    await fill('#size-depth-0', '2');
    await fill('#size-price-0', '12.90');
    const checkbox = root.querySelector<HTMLElement>('[role=checkbox]')!;
    checkbox.click();
    await fixture.whenStable();
    submit();
    expect(root.querySelector('dl')?.textContent).toContain('5,5 cm');
    expect(root.querySelector('.size-option')?.textContent).toContain('Peso não informado');
    const saved = TestBed.inject(ProductsPreview).products().find((product) => product.name === 'Miniatura')!;
    expect(saved.sizes[0]).toEqual({ name: 'Mini', heightCm: 5.5, widthCm: 3, depthCm: 2, price: 12.9 });
    expect(saved.customSizes).toBe(true);
    click('Editar produto');
    await fixture.whenStable();
    click('Remover tamanho');
    click('Cancelar');
    expect(root.querySelectorAll('hlm-radio')).toHaveLength(1);
    click('Editar produto');
    await fixture.whenStable();
    click('Remover tamanho');
    submit();
    expect(root.querySelectorAll('hlm-radio')).toHaveLength(0);
    expect(root.querySelector('[role=dialog]')?.textContent).toContain('Nenhum tamanho com preço cadastrado');
    expect(root.querySelectorAll('.product-card')[3].textContent).toContain('Sob orçamento');
  });

  it('mantém a pesquisa ao alternar entre cartões e tabela e mostra estado vazio', async () => {
    const fixture = TestBed.createComponent(Produtos);
    fixture.detectChanges();
    await fixture.whenStable();
    document.body.append(fixture.nativeElement);
    const root = document.body;
    const query = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    query.value = 'GEOMETRICO';
    query.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelectorAll('.product-card')).toHaveLength(1);
    const tableButton = [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Tabela')!;
    tableButton.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody')?.textContent).toContain('Vaso geométrico');
    query.value = 'inexistente';
    query.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Nenhum produto encontrado');
  });

  it('abre detalhes e permite cadastrar, editar e cancelar sem alterar o produto', async () => {
    const fixture = TestBed.createComponent(Produtos);
    fixture.detectChanges();
    await fixture.whenStable();
    document.body.append(fixture.nativeElement);
    const root = document.body;
    const click = (label: string) => {
      [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === label)!.click();
      fixture.detectChanges();
    };
    root.querySelector<HTMLButtonElement>('.product-card')!.click();
    fixture.detectChanges();
    expect(!!root.querySelector('[role=dialog]')).toBe(true);
    expect(root.querySelector('[role=dialog] h3')?.textContent).toBe('Vaso geométrico');
    click('Fechar');
    click('+ Cadastrar produto');
    await fixture.whenStable();
    const fill = async (value: string) => {
      const input = root.querySelector<HTMLInputElement>('#product-name')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await fill('Porta-controle');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelectorAll('.product-card')).toHaveLength(4);
    expect(root.querySelector('[role=dialog] h3')?.textContent).toBe('Porta-controle');
    click('Editar produto');
    await fixture.whenStable();
    await fill('Alteração cancelada');
    click('Cancelar');
    expect(root.querySelector('[role=dialog] h3')?.textContent).toBe('Porta-controle');
    click('Editar produto');
    await fixture.whenStable();
    await fill('Porta-controle duplo');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelector('[role=dialog] h3')?.textContent).toBe('Porta-controle duplo');
    expect(root.querySelectorAll('.product-card')).toHaveLength(4);
  });
});
