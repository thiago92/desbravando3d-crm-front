import { Component, computed, signal } from '@angular/core';
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

@Component({
  selector: 'app-print-calculator',
  imports: [FormsModule, HlmButton, HlmInput],
  templateUrl: './print-calculator.html',
})
export class PrintCalculator {
  protected readonly inputs = signal<PrintCalculationInputs>({ ...emptyInputs });
  protected readonly result = computed(() => calculatePrintPrice(this.inputs()));
  protected readonly hasAnyInput = computed(() => Object.values(this.inputs()).some((value) => value !== null));

  protected setInput(field: keyof PrintCalculationInputs, value: number | null): void {
    this.inputs.update((current) => ({ ...current, [field]: value }));
  }

  protected clear(): void {
    this.inputs.set({ ...emptyInputs });
  }

  protected readonly money = formatMoney;
}
