import { describe, expect, it } from 'vitest';
import { calculatePrintPrice, type PrintCalculationInputs } from './print-calculation';

describe('preço de uma peça impressa', () => {
  it('reproduz o exemplo de R$ 38,88 informado pelo usuário', () => {
    expect(calculatePrintPrice({
      filamentPricePerKg: 120,
      filamentGrams: 50,
      printHours: 4,
      averagePowerW: 150,
      tariffPerKwh: 0.8,
      markupPercent: 500,
    })).toEqual({ materialCost: 6, energyCost: 0.48, directCost: 6.48, suggestedPrice: 38.88 });
  });

  it('reproduz o arredondamento exibido na imagem de referência', () => {
    const result = calculatePrintPrice({
      filamentPricePerKg: 120,
      filamentGrams: 215,
      printHours: 14,
      averagePowerW: 95,
      tariffPerKwh: 0.768,
      markupPercent: 300,
    });
    expect(result?.materialCost).toBeCloseTo(25.8);
    expect(result?.energyCost).toBeCloseTo(1.02144);
    expect(result?.suggestedPrice).toBeCloseTo(107.28576);
  });

  it('aguarda todos os valores e rejeita números negativos', () => {
    const empty: PrintCalculationInputs = {
      filamentPricePerKg: null, filamentGrams: null, printHours: null,
      averagePowerW: null, tariffPerKwh: null, markupPercent: null,
    };
    expect(calculatePrintPrice(empty)).toBeNull();
    expect(calculatePrintPrice({ ...empty, filamentPricePerKg: -1 })).toBeNull();
  });
});
