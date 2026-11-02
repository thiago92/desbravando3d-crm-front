export interface PrintCalculationInputs {
  filamentPricePerKg: number | null;
  filamentGrams: number | null;
  printHours: number | null;
  averagePowerW: number | null;
  tariffPerKwh: number | null;
  markupPercent: number | null;
}

export interface PrintCalculationResult {
  materialCost: number;
  energyCost: number;
  directCost: number;
  suggestedPrice: number;
}

export function calculatePrintPrice(inputs: PrintCalculationInputs): PrintCalculationResult | null {
  const values = Object.values(inputs);
  if (values.some((value) => value === null || !Number.isFinite(value) || value < 0)) return null;

  const materialCost = (inputs.filamentPricePerKg! / 1000) * inputs.filamentGrams!;
  const energyCost = (inputs.averagePowerW! / 1000) * inputs.printHours! * inputs.tariffPerKwh!;
  const directCost = materialCost + energyCost;
  const suggestedPrice = directCost * (1 + inputs.markupPercent! / 100);
  if (![materialCost, energyCost, directCost, suggestedPrice].every(Number.isFinite)) return null;
  return { materialCost, energyCost, directCost, suggestedPrice };
}
