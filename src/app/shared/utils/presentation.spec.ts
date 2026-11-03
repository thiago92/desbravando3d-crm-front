import { formatDateTime, formatMeasure, formatMoney, formatTariff, normalizeSearch } from './presentation';

describe('Apresentação compartilhada', () => {
  it('normaliza acentos e caixa para a pesquisa sem remover separadores', () => {
    expect(normalizeSearch('Preço da PEÇA — Ação')).toBe('preco da peca — acao');
    expect(normalizeSearch('')).toBe('');
  });

  it('preserva as precisões de moeda, medidas e tarifa e a data/hora local', () => {
    expect(formatMoney(12.9)).toContain('12,90');
    expect(formatMeasure(5.5)).toBe('5,5');
    expect(formatMeasure(1.234)).toBe('1,23');
    expect(formatTariff(0.93456)).toBe('0,9346');
    expect(formatTariff(1)).toBe('1,00');
    expect(formatDateTime('2026-11-02T15:30:00')).toContain('02/11/2026');
    expect(formatDateTime('2026-11-02T15:30:00')).toContain('15:30');
  });
});
