import { TestBed } from '@angular/core/testing';
import { PrintCalculator } from './print-calculator';

describe('Calculadora de impressão 3D', () => {
  beforeEach(() => localStorage.removeItem('crm-print-calculator-preview'));
  afterEach(() => localStorage.removeItem('crm-print-calculator-preview'));

  it('atualiza o resultado a partir dos seis campos preenchidos na hora', async () => {
    await TestBed.configureTestingModule({ imports: [PrintCalculator] }).compileComponents();
    const fixture = TestBed.createComponent(PrintCalculator);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('label[for="calc-markup"]')?.textContent).toContain('Margem de lucro (%)');
    const values: Record<string, string> = {
      'calc-filament-price': '120', 'calc-filament-grams': '50', 'calc-print-hours': '4',
      'calc-average-power': '150', 'calc-energy-tariff': '0.8', 'calc-markup': '500',
    };
    for (const [id, value] of Object.entries(values)) {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('R$ 38,88');
    expect(root.textContent).toContain('R$ 6,48');

    root.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(root.textContent).not.toContain('R$ 38,88');
    expect(localStorage.getItem('crm-print-calculator-preview')).toBeNull();
  });

  it('restaura os últimos valores ao abrir a calculadora novamente', async () => {
    await TestBed.configureTestingModule({ imports: [PrintCalculator] }).compileComponents();
    const first = TestBed.createComponent(PrintCalculator);
    first.detectChanges();
    const input = (first.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#calc-filament-price')!;
    input.value = '120';
    input.dispatchEvent(new Event('input'));
    await first.whenStable();
    expect(JSON.parse(localStorage.getItem('crm-print-calculator-preview') ?? '{}').filamentPricePerKg).toBe(120);
    first.destroy();

    const reopened = TestBed.createComponent(PrintCalculator);
    reopened.detectChanges();
    await reopened.whenStable();
    reopened.detectChanges();
    expect((reopened.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#calc-filament-price')?.value).toBe('120');
  });

  it('ignora valores salvos inválidos', async () => {
    localStorage.setItem('crm-print-calculator-preview', '{invalid');
    await TestBed.configureTestingModule({ imports: [PrintCalculator] }).compileComponents();
    const fixture = TestBed.createComponent(PrintCalculator);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#calc-filament-price')?.value).toBe('');
  });
});
