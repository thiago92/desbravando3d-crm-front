import { TestBed } from '@angular/core/testing';
import { Calculadora } from './calculadora';

describe('Calculadora: cadastro de percentuais', () => {
  beforeEach(async () => {
    localStorage.removeItem('crm-pricing-percentages-preview');
    await TestBed.configureTestingModule({ imports: [Calculadora] }).compileComponents();
  });

  afterEach(() => localStorage.removeItem('crm-pricing-percentages-preview'));

  it('cadastra percentuais diferentes e mantém os dados no navegador', async () => {
    const fixture = TestBed.createComponent(Calculadora);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toBe('Precificação');
    expect(root.querySelector('h2')?.textContent).toBe('Margem de lucro');
    const name = root.querySelector<HTMLInputElement>('#percentage-name')!;
    const percentage = root.querySelector<HTMLInputElement>('#percentage-value')!;

    name.value = 'Consignado';
    name.dispatchEvent(new Event('input'));
    percentage.value = '100';
    percentage.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('tbody')?.querySelectorAll('tr')).toHaveLength(4);
    expect(root.querySelector('tbody')?.textContent).toContain('Consignado');
    expect(root.querySelector('tbody')?.textContent).toContain('100%');
    expect(JSON.parse(localStorage.getItem('crm-pricing-percentages-preview') ?? '[]')).toContainEqual({ id: 4, name: 'Consignado', percentage: 100 });
  });
});
