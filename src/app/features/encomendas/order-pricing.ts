import { calculatePrintPrice } from '../calculadora/print-calculator/print-calculation';
import type { EnergySetting, PricingPercentage } from '../calculadora/pricing-settings-preview';
import type { FilamentPreview } from '../insumos/filaments-preview';
import type { ProductPreview, ProductSize } from '../produtos/products-preview';
import type { OrderItemPreview, OrderPreview } from './orders-preview';

export interface ItemPrice {
  gramsPerUnit: number;
  weightedPricePerKg: number;
  materialCost: number;
  energyCost: number;
  directCost: number;
  unitPrice: number;
  lineTotal: number;
  marginName: string;
  markupPercent: number;
}

export interface OrderPrice {
  items: ItemPrice[];
  subtotal: number;
  discountAmount: number;
  total: number;
  tariffPerKwh: number;
  averagePowerW: number;
  energyIsExample: boolean;
}

const cents = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateItemPrice(item: OrderItemPreview, size: ProductSize, filaments: FilamentPreview[], energy: EnergySetting, margin: PricingPercentage): ItemPrice | null {
  if (!size.materials.length || !Number.isFinite(size.printHours) || size.printHours <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return null;
  let gramsPerUnit = 0;
  let materialCost = 0;
  for (const material of size.materials) {
    const filament = filaments.find((entry) => entry.id === material.filamentId);
    if (!filament || !Number.isFinite(material.gramsPerUnit) || material.gramsPerUnit <= 0) return null;
    gramsPerUnit += material.gramsPerUnit;
    materialCost += material.gramsPerUnit * filament.pricePerKg / 1000;
  }
  const weightedPricePerKg = materialCost * 1000 / gramsPerUnit;
  const calculation = calculatePrintPrice({
    filamentPricePerKg: weightedPricePerKg,
    filamentGrams: gramsPerUnit,
    printHours: size.printHours,
    averagePowerW: energy.averagePowerW,
    tariffPerKwh: energy.tariffPerKwh,
    markupPercent: margin.percentage,
  });
  if (!calculation) return null;
  const unitPrice = cents(calculation.suggestedPrice);
  return { gramsPerUnit, weightedPricePerKg, materialCost: calculation.materialCost, energyCost: calculation.energyCost, directCost: calculation.directCost, unitPrice, lineTotal: cents(unitPrice * item.quantity), marginName: margin.name, markupPercent: margin.percentage };
}

export function calculateOrderPrice(order: OrderPreview, products: ProductPreview[], filaments: FilamentPreview[], energy: EnergySetting | null, margins: PricingPercentage[]): OrderPrice | null {
  if (!energy || !Number.isFinite(order.discountPercent) || order.discountPercent < 0 || order.discountPercent > 100) return null;
  const items: ItemPrice[] = [];
  for (const item of order.items) {
    const size = item.sizeSnapshot ?? products.find((product) => product.id === item.productId)?.sizes.find((entry) => entry.id === item.sizeId);
    const margin = margins.find((entry) => entry.id === item.marginId);
    const price = margin && size ? calculateItemPrice(item, size, filaments, energy, margin) : null;
    if (!price) return null;
    items.push(price);
  }
  const subtotal = cents(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountAmount = cents(subtotal * order.discountPercent / 100);
  return { items, subtotal, discountAmount, total: cents(subtotal - discountAmount), tariffPerKwh: energy.tariffPerKwh, averagePowerW: energy.averagePowerW, energyIsExample: energy.id === 0 };
}
