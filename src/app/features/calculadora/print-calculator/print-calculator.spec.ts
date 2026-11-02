import { TestBed } from '@angular/core/testing';
import { PrintCalculator } from './print-calculator';

describe('Calculadora de impressão 3D', () => {
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
  });
});
