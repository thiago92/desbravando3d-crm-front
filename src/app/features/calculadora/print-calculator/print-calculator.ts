import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { formatMoney } from '../../../shared/utils/presentation';
import { calculatePrintPrice, type PrintCalculationInputs } from './print-calculation';

const emptyInputs: PrintCalculationInputs = {
  filamentPricePerKg: null,
  filamentGrams: null,
  printHours: null,
  averagePowerW: null,
  tariffPerKwh: null,
  markupPercent: null,
};

const calculatorStorageKey = 'crm-print-calculator-preview';

function readSavedInputs(): PrintCalculationInputs {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(calculatorStorageKey) ?? 'null');
    if (saved === null || typeof saved !== 'object' || Array.isArray(saved)) return { ...emptyInputs };

    const values = saved as Record<string, unknown>;
    if (Object.keys(emptyInputs).some((field) => {
      const value = values[field];
      return value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0);
    })) return { ...emptyInputs };

    return Object.fromEntries(Object.keys(emptyInputs).map((field) => [field, values[field]])) as unknown as PrintCalculationInputs;
  } catch {
    return { ...emptyInputs };
  }
}

@Component({
  selector: 'app-print-calculator',
  imports: [FormsModule, HlmButton, HlmInput],
  templateUrl: './print-calculator.html',
})
export class PrintCalculator {
  readonly embedded = input(false);
  protected readonly inputs = signal<PrintCalculationInputs>(readSavedInputs());
  protected readonly result = computed(() => calculatePrintPrice(this.inputs()));
  protected readonly hasAnyInput = computed(() => Object.values(this.inputs()).some((value) => value !== null));

  protected setInput(field: keyof PrintCalculationInputs, value: number | null): void {
    this.inputs.update((current) => ({ ...current, [field]: value }));
    try {
      localStorage.setItem(calculatorStorageKey, JSON.stringify(this.inputs()));
    } catch {
      // A simulação continua funcionando se o navegador bloquear armazenamento local.
    }
  }

  protected clear(): void {
    this.inputs.set({ ...emptyInputs });
    try {
      localStorage.removeItem(calculatorStorageKey);
    } catch {
      // Os campos ainda são limpos nesta visita.
    }
  }

  protected readonly money = formatMoney;
}
