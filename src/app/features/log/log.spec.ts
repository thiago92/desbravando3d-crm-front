import { describe, expect, it } from 'vitest';
import { filterLogEvents } from './log';

const events: Parameters<typeof filterLogEvents>[0] = [
  {
    id: '1', occurredAt: '2026-10-01T09:00:00', actor: 'João', area: 'Insumos',
    record: 'Filamento preto', action: 'Criação', summary: 'Filamento criado',
    changes: [{ field: 'Cliente', after: 'Maria' }],
  },
  {
    id: '2', occurredAt: '2026-10-02T09:00:00', actor: 'Ana', area: 'Encomendas',
    record: 'Encomenda 2', action: 'Atualização', summary: 'Cliente atualizado',
    changes: [{ field: 'Cliente', before: 'Maria', after: 'Mariana' }],
  },
];

describe('filtro do log', () => {
  it('exige as duas datas e recusa período invertido', () => {
    expect(filterLogEvents(events, '', '2026-10-02', '')).toEqual([]);
    expect(filterLogEvents(events, '2026-10-03', '2026-10-01', '')).toEqual([]);
  });

  it('inclui os dois dias-limite do período', () => {
    expect(filterLogEvents(events, '2026-10-01', '2026-10-01', '')).toHaveLength(1);
    expect(filterLogEvents(events, '2026-10-01', '2026-10-02', '')).toHaveLength(2);
  });

  it('busca também valores anteriores, sem diferenciar acentos e caixa', () => {
    expect(filterLogEvents(events, '2026-10-02', '2026-10-02', 'MARIA')).toHaveLength(1);
    expect(filterLogEvents(events, '2026-10-01', '2026-10-02', 'joao')[0].id).toBe('1');
  });
});
