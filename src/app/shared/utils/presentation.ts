const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const measure = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const tariff = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const formatMoney = (value: number): string => currency.format(value);
export const formatMeasure = (value: number): string => measure.format(value);
export const formatTariff = (value: number): string => tariff.format(value);
export const formatDateTime = (value: string): string => dateTime.format(new Date(value));

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
