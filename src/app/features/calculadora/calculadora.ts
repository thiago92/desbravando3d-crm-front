import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { EnergySettings } from './energy-settings/energy-settings';
import { PrintCalculator } from './print-calculator/print-calculator';
import { PricingPercentage, percentagesStorageKey, readPercentages } from './pricing-settings-preview';

@Component({
  selector: 'app-calculadora',
  imports: [FormsModule, EnergySettings, PrintCalculator, HlmButton, HlmInput, ...HlmTableImports],
  templateUrl: './calculadora.html',
})
export class Calculadora {
  protected readonly percentages = signal(readPercentages());
  protected readonly editingId = signal<number | null>(null);
  protected readonly error = signal('');
  protected name = '';
  protected percentage: number | null = null;

  protected save(): void {
    const name = this.name.trim();
    const percentage = Number(this.percentage);
    if (!name || this.percentage === null || !Number.isFinite(percentage) || percentage < 0) {
      this.error.set('Informe um nome e um percentual maior ou igual a zero.');
      return;
    }
    if (this.percentages().some((item) => item.id !== this.editingId() && item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
      this.error.set('Já existe um percentual com esse nome.');
      return;
    }

    const entries = this.percentages();
    const id = this.editingId() ?? Math.max(0, ...entries.map((item) => item.id)) + 1;
    const entry = { id, name, percentage };
    const next = this.editingId() === null ? [...entries, entry] : entries.map((item) => item.id === id ? entry : item);
    this.percentages.set(next);
    this.cancel();
    this.persist(next);
  }

  protected edit(item: PricingPercentage): void {
    this.editingId.set(item.id);
    this.name = item.name;
    this.percentage = item.percentage;
    this.error.set('');
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.name = '';
    this.percentage = null;
    this.error.set('');
  }

  private persist(entries: PricingPercentage[]): void {
    try {
      localStorage.setItem(percentagesStorageKey, JSON.stringify(entries));
    } catch {
      this.error.set('O navegador não permitiu salvar os dados. Eles ficarão disponíveis apenas nesta visita.');
    }
  }
}
