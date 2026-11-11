import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { ClientesLojas } from './clientes-lojas';
import { ContactsPreview } from './contacts-preview';
import { Consignado } from '../consignado/consignado';

describe('Clientes e lojas: tabela de prévia', () => {
  it('cadastra uma loja com telefone e WhatsApp e a disponibiliza em Consignado', async () => {
    await TestBed.configureTestingModule({ imports: [ClientesLojas, Consignado], providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(ClientesLojas);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Cadastrar cliente'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const fill = (selector: string, value: string) => {
      const input = dialog.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    fill('#create-contact-name', 'Loja Nova');
    const type = dialog.querySelector<HTMLSelectElement>('#create-contact-type')!;
    type.value = 'store';
    type.dispatchEvent(new Event('change'));
    fill('#create-contact-phone', '(11) 3333-4444');
    fill('#create-contact-whatsapp', '(11) 99999-8888');
    await fixture.whenStable();
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.textContent).toContain('Loja Nova');
    expect(dialog.textContent).toContain('(11) 3333-4444');
    expect(dialog.textContent).toContain('(11) 99999-8888');
    expect(root.querySelector('tbody')?.textContent).toContain('Loja Nova');
    expect(TestBed.inject(ContactsPreview).contacts()[0]).toMatchObject({ name: 'Loja Nova', typeId: 'store' });
    dialog.querySelector<HTMLButtonElement>('button[hlmdialogclose]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const consignado = TestBed.createComponent(Consignado);
    document.body.append(consignado.nativeElement);
    consignado.detectChanges();
    await consignado.whenStable();
    [...(consignado.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Novo consignado'))!.click();
    consignado.detectChanges();
    await consignado.whenStable();
    expect([...document.querySelectorAll<HTMLOptionElement>('#create-consignment-store option')].some((option) => option.value === 'Loja Nova')).toBe(true);
  });

  it('cadastra um novo tipo, seleciona no cliente e permite consignação', async () => {
    await TestBed.configureTestingModule({ imports: [ClientesLojas, Consignado], providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(ClientesLojas);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Cadastrar cliente'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const contactDialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    [...contactDialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Cadastrar tipo'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const typeDialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1)!;
    const name = typeDialog.querySelector<HTMLInputElement>('#create-type-name')!;
    name.value = 'Revendedor';
    name.dispatchEvent(new Event('input'));
    expect(typeDialog.querySelector('#create-type-consignment')).toBeNull();
    typeDialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const preview = TestBed.inject(ContactsPreview);
    const customType = preview.types().find((type) => type.name === 'Revendedor')!;
    expect(contactDialog.querySelector<HTMLSelectElement>('#create-contact-type')?.value).toBe(customType.id);
    const contactName = contactDialog.querySelector<HTMLInputElement>('#create-contact-name')!;
    contactName.value = 'Parceiro Novo';
    contactName.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    contactDialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(preview.contacts()[0]).toMatchObject({ name: 'Parceiro Novo', typeId: customType.id });
    expect((fixture.nativeElement as HTMLElement).querySelector('tbody')?.textContent).toContain('Revendedor');

    contactDialog.querySelector<HTMLButtonElement>('button[hlmdialogclose]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const consignado = TestBed.createComponent(Consignado);
    document.body.append(consignado.nativeElement);
    consignado.detectChanges();
    await consignado.whenStable();
    [...(consignado.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Novo consignado'))!.click();
    consignado.detectChanges();
    await consignado.whenStable();
    expect([...document.querySelectorAll<HTMLOptionElement>('#create-consignment-store option')].some((option) => option.value === 'Parceiro Novo')).toBe(true);
  });

  it('oferece para consignação clientes de qualquer tipo e evita tipos duplicados', async () => {
    await TestBed.configureTestingModule({ imports: [Consignado], providers: [provideSpartanHlm()] }).compileComponents();
    const preview = TestBed.inject(ContactsPreview);
    const type = preview.createType('Cliente de feira');
    expect('saved' in type).toBe(true);
    if (!('saved' in type)) return;
    expect(preview.createType('Cliente de FÉIRA')).toEqual({ error: 'Já existe um tipo de cliente com esse nome.' });
    expect('saved' in preview.create({ name: 'Cliente de Evento', typeId: type.saved.id, phone: null, whatsapp: null }, [])).toBe(true);

    const fixture = TestBed.createComponent(Consignado);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Novo consignado'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect([...document.querySelectorAll<HTMLOptionElement>('#create-consignment-store option')].some((option) => option.value === 'Cliente de Evento')).toBe(true);
    expect([...document.querySelectorAll<HTMLOptionElement>('#create-consignment-store option')].some((option) => option.value === 'Maria Silva')).toBe(true);
  });

  it('lista pessoas e lojas dos exemplos e filtra pelo nome sem exigir acentos', async () => {
    await TestBed.configureTestingModule({ imports: [ClientesLojas], providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(ClientesLojas);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('tbody tr')).toHaveLength(17);
    expect([...root.querySelectorAll('thead th')].map((cell) => cell.textContent?.trim())).toEqual(['Nome', 'Tipo', 'Telefone', 'WhatsApp']);
    expect(root.querySelector('tbody')?.textContent).toContain('Maria Silva');
    expect(root.querySelector('tbody')?.textContent).toContain('Loja Aurora');
    expect(root.querySelector('tbody')?.textContent).toContain('Não informado');
    const search = root.querySelector<HTMLInputElement>('#contact-search')!;
    search.value = 'atelie';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody')?.textContent).toContain('Ateliê Central');
  });

  it('abre a modal de uma pessoa e mostra suas encomendas e status', async () => {
    await TestBed.configureTestingModule({ imports: [ClientesLojas], providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(ClientesLojas);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const opener = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Consultar pessoa Maria Silva"]')!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Encomendas (1)');
    expect(dialog.textContent).toContain('Telefone');
    expect(dialog.textContent).toContain('WhatsApp');
    expect(dialog.textContent).toContain('Não informado');
    expect(dialog.textContent).toContain('#014');
    expect(dialog.textContent).toContain('Em orçamento');
    expect(dialog.textContent).toContain('Abrir encomenda');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Abrir encomenda')!.click();
    expect(navigate).toHaveBeenCalledWith(['/encomendas'], { queryParams: { abrir: 'order-preview-1' } });
    dialog.querySelector<HTMLButtonElement>('button[hlmdialogclose]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(opener);
  });

  it('mostra os consignados e valores de uma loja', async () => {
    await TestBed.configureTestingModule({ imports: [ClientesLojas], providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(ClientesLojas);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Consultar loja Loja Aurora"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Consignados (3)');
    expect(dialog.textContent).toContain('#C-014');
    expect(dialog.textContent).toContain('Abrir consignado');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Abrir consignado')!.click();
    expect(navigate).toHaveBeenCalledWith(['/consignado'], { queryParams: { abrir: '#C-010' } });
  });
});
