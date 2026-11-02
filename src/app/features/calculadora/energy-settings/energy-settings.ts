import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface EnergySetting {
  id: number;
  tariffPerKwh: number;
  averagePowerW: number;
  createdAt: string;
}

const storageKey = 'crm-energy-settings-preview';

function readSettings(): EnergySetting[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is EnergySetting =>
      typeof item?.id === 'number' && Number.isSafeInteger(item.id) &&
      typeof item?.tariffPerKwh === 'number' && Number.isFinite(item.tariffPerKwh) && item.tariffPerKwh > 0 &&
      typeof item?.averagePowerW === 'number' && Number.isFinite(item.averagePowerW) && item.averagePowerW > 0 &&
      typeof item?.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt)),
    );
  } catch {
    return [];
  }
}

@Component({
  selector: 'app-energy-settings',
  imports: [FormsModule],
  templateUrl: './energy-settings.html',
  styleUrl: './energy-settings.css',
})
export class EnergySettings {
  @ViewChild('historyDialog') private historyDialog?: ElementRef<HTMLDialogElement>;

  protected readonly settings = signal(readSettings());
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

    const entries = this.settings();
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
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      this.error.set('O navegador não permitiu salvar os dados. Eles ficarão disponíveis apenas nesta visita.');
    }
  }

  protected openHistory(): void {
    this.historyDialog?.nativeElement.showModal();
  }

  protected closeHistory(): void {
    this.historyDialog?.nativeElement.close();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }

  protected formatTariff(value: number): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);
  }

  protected formatPower(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  }
}
