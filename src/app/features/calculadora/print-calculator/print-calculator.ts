import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculatePrintPrice, type PrintCalculationInputs } from './print-calculation';

const emptyInputs: PrintCalculationInputs = {
  filamentPricePerKg: null,
  filamentGrams: null,
  printHours: null,
  averagePowerW: null,
  tariffPerKwh: null,
  markupPercent: null,
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-print-calculator',
  imports: [FormsModule],
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

  protected money(value: number): string {
    return currencyFormatter.format(value);
  }
}
