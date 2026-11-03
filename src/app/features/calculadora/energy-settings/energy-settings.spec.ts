import { TestBed } from '@angular/core/testing';
import { EnergySettings } from './energy-settings';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';

describe('Energia e impressora', () => {
  beforeEach(async () => {
    localStorage.removeItem('crm-energy-settings-preview');
    await TestBed.configureTestingModule({ imports: [EnergySettings], providers: [provideSpartanHlm()] }).compileComponents();
  });

  afterEach(() => localStorage.removeItem('crm-energy-settings-preview'));

  it('mostra só o último cadastro e preserva os anteriores no histórico', async () => {
    const fixture = TestBed.createComponent(EnergySettings);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const tariff = root.querySelector<HTMLInputElement>('#energy-tariff')!;
    const power = root.querySelector<HTMLInputElement>('#printer-power')!;
    const add = async (tariffValue: string, powerValue: string) => {
      tariff.value = tariffValue;
      tariff.dispatchEvent(new Event('input'));
      power.value = powerValue;
      power.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
      root.querySelector<HTMLButtonElement>('form button[type="submit"]')!.click();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    await add('0.90', '150');
    await add('1.05', '180');

    expect(root.querySelectorAll('section > div table tbody tr')).toHaveLength(1);
    expect(root.querySelector('section > div table tbody')?.textContent).toContain('180 W');
    expect(JSON.parse(localStorage.getItem('crm-energy-settings-preview') ?? '[]')).toHaveLength(2);
    root.querySelector<HTMLButtonElement>('button:not([type="submit"])')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(dialog.querySelector('tbody')?.textContent).toContain('150 W');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    dialog.querySelector<HTMLButtonElement>('[aria-label="Fechar histórico"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
