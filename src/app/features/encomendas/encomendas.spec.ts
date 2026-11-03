import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { Encomendas } from './encomendas';
import { OrdersPreview } from './orders-preview';

describe('Encomendas: prévia do kanban', () => {
  let fixture: ComponentFixture<Encomendas>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Encomendas], providers: [provideSpartanHlm()] }).compileComponents();
    fixture = TestBed.createComponent(Encomendas);
    document.body.append(fixture.nativeElement);
    root = document.body;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('distribui cartões sem imagem em seis etapas e mantém pagamento independente da entrega', () => {
    const columns = root.querySelectorAll('.kanban-column');
    expect([...columns].map((column) => column.querySelector('h2')?.textContent)).toEqual([
      'Solicitações', 'Em orçamento', 'Confirmadas', 'Em impressão', 'Prontas para entrega', 'Entregues',
    ]);
    expect(root.querySelectorAll('.order-card')).toHaveLength(10);
    expect(root.querySelector('.kanban-board img')).toBeNull();
    expect(root.querySelector('[data-stage="request"] .order-card')?.textContent).toContain('5 peças');
    expect(root.querySelector('[data-stage="request"] .order-card')?.textContent).toContain('Valor a definir');
    expect(root.querySelector('[data-stage="request"]')?.textContent).toContain('Ana Costa');
    expect(root.querySelector('[data-stage="quotation"]')?.textContent).not.toContain('Ana Costa');
    expect(root.querySelector('[data-stage="quotation"]')?.textContent).toContain('Aguardando cliente');
    expect(root.querySelector('[data-stage="confirmed"] .order-card')?.textContent).toContain('Pagamento recebido');
    expect(root.querySelector('[data-stage="delivered"] .order-card')?.textContent).toContain('Pagamento pendente');
  });

  it('ajusta a altura ao espaço disponível em vez de somar a altura dos filtros à janela', () => {
    const board = root.querySelector<HTMLElement>('.kanban-board')!;
    const rect = vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ top: 450 } as DOMRect);
    window.dispatchEvent(new Event('resize'));
    expect(parseFloat(board.style.getPropertyValue('--kanban-height'))).toBe(Math.max(220, window.innerHeight - 450 - window.scrollY - 32));
    rect.mockReturnValue({ top: 350 } as DOMRect);
    window.dispatchEvent(new Event('resize'));
    expect(parseFloat(board.style.getPropertyValue('--kanban-height'))).toBe(Math.max(220, window.innerHeight - 350 - window.scrollY - 32));
    rect.mockRestore();
  });

  async function clickText(label: string): Promise<void> {
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === label)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function openOrder(number: string): Promise<void> {
    root.querySelector<HTMLButtonElement>(`[aria-label^="Ver encomenda ${number} "]`)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('move entre Solicitações e Em orçamento ao salvar ou remover o valor sem mudar a etapa', async () => {
    await openOrder('#014');
    const quote = root.querySelector<HTMLInputElement>('#order-quote-value')!;
    quote.value = '150';
    quote.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await clickText('Salvar orçamento');
    expect(root.querySelector('[data-stage="quotation"]')?.textContent).toContain('Maria Silva');
    expect(root.querySelector('[data-stage="request"]')?.textContent).not.toContain('Maria Silva');
    expect(TestBed.inject(OrdersPreview).orders()[0].stage).toBe('request');
    quote.value = '';
    quote.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await clickText('Salvar orçamento');
    expect(root.querySelector('[data-stage="request"]')?.textContent).toContain('Maria Silva');
    expect(root.querySelector('[data-stage="quotation"]')?.textContent).not.toContain('Maria Silva');
  });

  it('mostra os botões de progressão na modal e move o cartão até Entregues com pagamento pendente', async () => {
    await openOrder('#011');
    await clickText('Iniciar impressão');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.querySelector('[data-stage="printing"]')?.textContent).toContain('Pedro Almeida');
    await openOrder('#011');
    await clickText('Marcar como pronta para entrega');
    expect(root.querySelector('[data-stage="ready"]')?.textContent).toContain('Pedro Almeida');
    await openOrder('#011');
    await clickText('Marcar como entregue');
    expect(root.querySelector('[data-stage="delivered"]')?.textContent).toContain('Pedro Almeida');
    expect(TestBed.inject(OrdersPreview).orders().find((order) => order.number === '#011')?.payment).toBe('pending');
    await openOrder('#011');
    expect(root.querySelector('[role="dialog"]')?.textContent).not.toContain('Marcar como entregue');
  });

  function scrollBoard(): HTMLElement {
    const board = root.querySelector<HTMLElement>('.kanban-board')!;
    Object.defineProperties(board, { clientWidth: { value: 600 }, clientHeight: { value: 600 }, scrollWidth: { value: 2000 } });
    board.setPointerCapture = vi.fn();
    board.hasPointerCapture = vi.fn().mockReturnValue(true);
    board.releasePointerCapture = vi.fn();
    return board;
  }

  function pointer(target: HTMLElement, type: string, x: number, y: number, pointerType = 'mouse', button = 0): void {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button, buttons: type === 'pointerup' ? 0 : 1 });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
    target.dispatchEvent(event);
    fixture.detectChanges();
  }

  it('arrasta o quadro a partir do cartão sem abrir detalhes e preserva o próximo clique', async () => {
    const board = scrollBoard();
    const card = root.querySelector<HTMLButtonElement>('.order-card button')!;
    pointer(card, 'pointerdown', 200, 100);
    pointer(board, 'pointermove', 100, 100);
    expect(board.scrollLeft).toBe(100);
    expect(board.classList.contains('is-dragging')).toBe(true);
    expect(board.setPointerCapture).toHaveBeenCalledWith(1);
    pointer(board, 'pointerup', 100, 100);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(board.classList.contains('is-dragging')).toBe(false);
    expect(board.releasePointerCapture).toHaveBeenCalledWith(1);
    pointer(card, 'pointerdown', 100, 100);
    pointer(card, 'pointermove', 98, 100);
    pointer(card, 'pointerup', 98, 100);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('mantém toque e movimento vertical nativos e encerra um arraste cancelado', () => {
    const board = scrollBoard();
    pointer(board, 'pointerdown', 200, 100, 'touch');
    pointer(board, 'pointermove', 100, 100, 'touch');
    expect(board.scrollLeft).toBe(0);
    pointer(board, 'pointerdown', 200, 100);
    pointer(board, 'pointermove', 200, 150);
    pointer(board, 'pointermove', 100, 150);
    expect(board.scrollLeft).toBe(0);
    expect(board.setPointerCapture).not.toHaveBeenCalled();
    pointer(board, 'pointerdown', 200, 100);
    pointer(board, 'pointermove', 100, 100);
    pointer(board, 'pointercancel', 100, 100);
    expect(board.classList.contains('is-dragging')).toBe(false);
    pointer(board, 'pointermove', 50, 100);
    expect(board.scrollLeft).toBe(100);
  });

  it('pesquisa número ou cliente sem acentos e preserva as seis colunas quando não há resultados', async () => {
    const query = root.querySelector<HTMLInputElement>('#order-search')!;
    const search = async (value: string) => {
      query.value = value;
      query.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await search('JOAO');
    expect(root.querySelectorAll('.order-card')).toHaveLength(1);
    expect(root.querySelector('.order-card')?.textContent).toContain('João Oliveira');
    expect(root.querySelector('[data-stage="request"] .column-count')?.textContent).toBe('1');
    expect(root.querySelector('[data-stage="quotation"] .column-count')?.textContent).toBe('0');
    await search('#013');
    expect(root.querySelectorAll('.order-card')).toHaveLength(1);
    expect(root.querySelector('.order-card')?.textContent).toContain('Carlos Santos');
    await search('inexistente');
    expect(root.textContent).toContain('Nenhuma encomenda encontrada');
    expect(root.querySelectorAll('.kanban-column')).toHaveLength(6);
    expect(root.querySelectorAll('.empty-column')).toHaveLength(6);
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Limpar pesquisa')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.order-card')).toHaveLength(10);
  });

  it('abre os itens e quantidades em Dialog, fecha por Escape e restaura o foco no cartão', async () => {
    const opener = root.querySelector<HTMLButtonElement>('[aria-label="Ver encomenda #014 de Maria Silva"]')!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toContain('#014');
    expect(dialog.querySelector('h3')?.textContent).toBe('Maria Silva');
    expect(dialog.querySelectorAll('li')).toHaveLength(3);
    expect(dialog.textContent).toContain('5 peças no total');
    expect(dialog.querySelector('dl')?.textContent).toContain('Valor a definir');
    expect(dialog.querySelector('dl')?.textContent).toContain('Pagamento a definir');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    root.querySelector<HTMLButtonElement>('[aria-label="Ver encomenda #006 de Rafael Rocha"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Entregues');
    expect(root.querySelector('[role="dialog"] dl')?.textContent).toContain('90,00');
    expect(root.querySelector('[role="dialog"] dl')?.textContent).toContain('Pagamento pendente');
  });
});
