export interface PricingPercentage {
  id: number;
  name: string;
  percentage: number;
}

export interface EnergySetting {
  id: number;
  tariffPerKwh: number;
  averagePowerW: number;
  createdAt: string;
}

export const percentagesStorageKey = 'crm-pricing-percentages-preview';
export const energyStorageKey = 'crm-energy-settings-preview';
const examplePercentages: PricingPercentage[] = [
  { id: 1, name: 'Lojas', percentage: 100 },
  { id: 2, name: 'Amigos', percentage: 300 },
  { id: 3, name: 'Padrão', percentage: 500 },
];
const exampleEnergy: EnergySetting = { id: 0, tariffPerKwh: 0.8, averagePowerW: 150, createdAt: '2000-01-01T00:00:00.000Z' };

export function readPercentages(): PricingPercentage[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(percentagesStorageKey) ?? JSON.stringify(examplePercentages));
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is PricingPercentage =>
      typeof item?.id === 'number' && Number.isSafeInteger(item.id) &&
      typeof item?.name === 'string' && item.name.trim().length > 0 &&
      typeof item?.percentage === 'number' && Number.isFinite(item.percentage) && item.percentage >= 0,
    );
  } catch {
    return [];
  }
}

export function readEnergySettings(): EnergySetting[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(energyStorageKey) ?? JSON.stringify([exampleEnergy]));
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

export function latestEnergySetting(): EnergySetting | null {
  return [...readEnergySettings()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)[0] ?? null;
}
