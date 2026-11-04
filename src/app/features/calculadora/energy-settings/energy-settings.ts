import { Component, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { formatDateTime, formatMeasure, formatTariff } from '../../../shared/utils/presentation';
import { energyStorageKey, readEnergySettings } from '../pricing-settings-preview';

@Component({
  selector: 'app-energy-settings',
  imports: [FormsModule, HlmButton, HlmInput, ...HlmDialogImports, ...HlmTableImports],
  templateUrl: './energy-settings.html',
})
export class EnergySettings {
  @ViewChild('historyDialog') private historyDialog?: HlmDialog;

  protected readonly settings = signal(readEnergySettings());
  protected readonly history = computed(() => [...this.settings()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id));
  protected readonly latest = computed(() => this.history()[0] ?? null);
  protected readonly error = signal('');
  protected tariffPerKwh: number | null = null;
  protected averagePowerW: number | null = null;

  protected save(): void {
    const tariff = Number(this.tariffPerKwh);
    const power = Number(this.averagePowerW);
    if (this.tariffPerKwh === null || this.averagePowerW === null || !Number.isFinite(tariff) || !Number.isFinite(power) || tariff <= 0 || power <= 0) {
      this.error.set('Informe a tarifa e o consumo médio com valores maiores que zero.');
      return;
    }

    const entries = this.settings().filter((item) => item.id !== 0);
    const next = [...entries, {
      id: Math.max(0, ...entries.map((item) => item.id)) + 1,
      tariffPerKwh: tariff,
      averagePowerW: power,
      createdAt: new Date().toISOString(),
    }];
    this.settings.set(next);
    this.tariffPerKwh = null;
    this.averagePowerW = null;
    this.error.set('');
    try {
      localStorage.setItem(energyStorageKey, JSON.stringify(next));
    } catch {
      this.error.set('O navegador não permitiu salvar os dados. Eles ficarão disponíveis apenas nesta visita.');
    }
  }

  protected openHistory(): void {
    this.historyDialog?.open();
  }

  protected closeHistory(): void {
    this.historyDialog?.close();
  }

  protected readonly formatDate = formatDateTime;
  protected readonly formatTariff = formatTariff;
  protected readonly formatPower = formatMeasure;
}
