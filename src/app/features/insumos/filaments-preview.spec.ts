import { TestBed } from '@angular/core/testing';
import { calculateStockBalance, FilamentsPreview } from './filaments-preview';

describe('Estoque de filamentos', () => {
  it('soma entradas e permite substituir o saldo, inclusive por zero', () => {
    expect(calculateStockBalance(500, { mode: 'add', grams: 1000 })).toBe(1500);
    expect(calculateStockBalance(500, { mode: 'replace', grams: 1000 })).toBe(1000);
    expect(calculateStockBalance(500, { mode: 'replace', grams: 0 })).toBe(0);
    expect(calculateStockBalance(0.1, { mode: 'add', grams: 0.2 })).toBe(0.3);
    expect(calculateStockBalance(500, { mode: 'add', grams: null })).toBe(500);
  });

  it('impede saldos negativos, quantidade inválida e soma fora do limite numérico', () => {
    for (const grams of [-1, NaN, Infinity, 0.001]) {
      expect(calculateStockBalance(500, { mode: 'add', grams })).toBeNull();
      expect(calculateStockBalance(500, { mode: 'replace', grams })).toBeNull();
    }
    expect(calculateStockBalance(500, { mode: 'replace', grams: null })).toBeNull();
    expect(calculateStockBalance(-500, { mode: 'add', grams: 1000 })).toBeNull();
    expect(calculateStockBalance(90000000000000, { mode: 'add', grams: 90000000000000 })).toBeNull();
  });

  it('mantém um cadastro por material e cor, atualiza o preço e preserva o saldo ao editar só os dados', () => {
    const service = TestBed.inject(FilamentsPreview);
    const original = service.filaments()[0];
    expect(service.save({ ...original, name: 'Outro nome', material: ' pla ', color: ' vermelho ' }, { mode: 'replace', grams: 1000 })).toHaveProperty('error');
    expect(service.filaments()).toHaveLength(3);
    expect(service.save({ ...original, pricePerKg: 135 }, { mode: 'add', grams: 1000 }, original.id)).toHaveProperty('saved');
    expect(service.filaments()[0]).toMatchObject({ pricePerKg: 135, balanceGrams: 1500 });
    service.save({ ...original, pricePerKg: 140 }, { mode: 'add', grams: null }, original.id);
    expect(service.filaments()[0]).toMatchObject({ pricePerKg: 140, balanceGrams: 1500 });
    expect(service.save({ ...original, material: 'PETG' }, { mode: 'replace', grams: 0 })).toHaveProperty('saved');
    expect(service.filaments()).toHaveLength(4);
  });

  it('valida preço e saldo inicial e não altera nenhum registro em erros ou duplicação na edição', () => {
    const service = TestBed.inject(FilamentsPreview);
    const [red, black] = service.filaments();
    const before = service.filaments();
    expect(service.save({ ...red, color: 'Azul' }, { mode: 'replace', grams: null })).toHaveProperty('error');
    for (const pricePerKg of [0, -1, NaN, Infinity, 0.001]) {
      expect(service.save({ ...red, pricePerKg }, { mode: 'add', grams: 1000 }, red.id)).toHaveProperty('error');
    }
    expect(service.save({ ...black, color: 'Vermelho' }, { mode: 'add', grams: 1000 }, black.id)).toHaveProperty('error');
    expect(service.filaments()).toEqual(before);
  });
});
