import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { CashLedgerPreview } from './cash-ledger-preview';
import { Financeiro } from './financeiro';

describe('Financeiro', () => {
  it('mostra cobranças e atualiza os indicadores com recebimento parcial e despesa', async () => {
    await TestBed.configureTestingModule({ imports: [Financeiro], providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(Financeiro);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = document.body;
    const ledger = TestBed.inject(CashLedgerPreview);
    const fill = async (selector: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    expect(root.querySelector('[aria-label="Resumo financeiro"]')?.textContent).toContain('A receber agora');
    expect(root.querySelector('[aria-label="Registrar recebimento de #011"]')).not.toBeNull();
    await fill('#finance-from', '2026-11-01');
    await fill('#finance-to', '2026-11-30');
    root.querySelector<HTMLButtonElement>('[aria-label="Registrar recebimento de #011"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fill('#finance-receipt-amount', '10');
    await fill('#finance-receipt-date', '2026-11-12');
    root.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ledger.transactions()).toMatchObject([{ kind: 'receipt', amount: 10, reference: '#011' }]);
    expect(root.querySelector('[aria-label="Resumo financeiro"]')?.textContent).toContain('R$\u00a010,00');

    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === '+ Registrar despesa')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fill('#finance-expense-description', 'Compra de argolas');
    await fill('#finance-expense-category', 'Insumos');
    await fill('#finance-expense-amount', '4.5');
    await fill('#finance-expense-date', '2026-11-12');
    root.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ledger.transactions()).toHaveLength(2);
    expect(root.querySelector('[aria-label="Resumo financeiro"]')?.textContent).toContain('R$\u00a04,50');
    expect(root.querySelector('[aria-label="Resumo financeiro"]')?.textContent).toContain('R$\u00a05,50');

    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Movimentações')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(root.querySelector('tbody')?.textContent).toContain('Compra de argolas');
    await fill('#finance-from', '2026-12-01');
    await fill('#finance-to', '2026-12-31');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(root.querySelector('[aria-label="Resumo financeiro"]')?.textContent).toContain('A receber agora');
  });
});
