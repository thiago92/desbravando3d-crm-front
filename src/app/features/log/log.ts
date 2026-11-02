import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LogEvent {
  id: string;
  occurredAt: string;
  actor: string;
  area: string;
  record: string;
  action: 'Criação' | 'Atualização';
  summary: string;
  changes: { field: string; before?: string; after: string }[];
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const previewEvents: LogEvent[] = [
  {
    id: 'exemplo-3', occurredAt: `${dateOffset(-1)}T14:25:00`, actor: 'Maria (exemplo)',
    area: 'Encomendas', record: 'Encomenda #102', action: 'Atualização',
    summary: 'Cliente alterado na encomenda #102',
    changes: [{ field: 'Cliente', before: 'Ana', after: 'Maria' }],
  },
  {
    id: 'exemplo-2', occurredAt: `${dateOffset(-4)}T10:40:00`, actor: 'Usuário de exemplo',
    area: 'Insumos', record: 'Filamento preto', action: 'Atualização',
    summary: 'Quantidade do filamento preto atualizada',
    changes: [{ field: 'Quantidade', before: '1000 g', after: '700 g' }],
  },
  {
    id: 'exemplo-1', occurredAt: `${dateOffset(-5)}T09:15:00`, actor: 'Usuário de exemplo',
    area: 'Insumos', record: 'Filamento preto', action: 'Criação',
    summary: 'Filamento preto cadastrado',
    changes: [{ field: 'Quantidade', after: '1000 g' }],
  },
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function filterLogEvents(events: LogEvent[], start: string, end: string, query: string): LogEvent[] {
  if (!start || !end || start > end) return [];
  const term = normalize(query.trim());
  return events.filter((event) => {
    const day = event.occurredAt.slice(0, 10);
    if (day < start || day > end) return false;
    if (!term) return true;
    const searchable = [event.id, event.occurredAt, event.actor, event.area, event.record, event.action, event.summary,
      ...event.changes.flatMap((change) => [change.field, change.before ?? '', change.after])];
    return searchable.some((value) => normalize(value).includes(term));
  });
}

@Component({
  selector: 'app-log',
  imports: [FormsModule],
  templateUrl: './log.html',
})
export class Log {
  protected readonly start = signal(dateOffset(-29));
  protected readonly end = signal(dateOffset(0));
  protected readonly query = signal('');
  protected readonly invalidPeriod = computed(() => !this.start() || !this.end() || this.start() > this.end());
  protected readonly events = computed(() => filterLogEvents(previewEvents, this.start(), this.end(), this.query()));

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }
}
