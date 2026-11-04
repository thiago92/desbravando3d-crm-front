import { calculateItemPrice } from './order-pricing';
import type { OrderItemPreview } from './orders-preview';
import type { FilamentPreview } from '../insumos/filaments-preview';
import type { ProductSize } from '../produtos/products-preview';

it('calcula média ponderada do kg multicor e soma energia antes do acréscimo', () => {
  const item: OrderItemPreview = {
    name: 'Peça multicor', productId: 'example', sizeId: 'multicolor', sizeSnapshot: null, quantity: 2, marginId: 3,
  };
  const size: ProductSize = { id: 'multicolor', name: 'Multicor', heightCm: 10, widthCm: 10, depthCm: 10, price: 1, printHours: 8,
    materials: [{ filamentId: 'black', gramsPerUnit: 200 }, { filamentId: 'white', gramsPerUnit: 100 }, { filamentId: 'red', gramsPerUnit: 50 }] };
  const filaments = [
    { id: 'black', pricePerKg: 109 }, { id: 'white', pricePerKg: 100 }, { id: 'red', pricePerKg: 119 },
  ] as FilamentPreview[];
  const price = calculateItemPrice(item, size, filaments, { id: 1, averagePowerW: 150, tariffPerKwh: 0.8, createdAt: '' }, { id: 3, name: 'Padrão', percentage: 500 })!;
  expect(price.gramsPerUnit).toBe(350);
  expect(price.weightedPricePerKg).toBeCloseTo(107.857142857, 6);
  expect(price.materialCost).toBeCloseTo(37.75, 6);
  expect(price.energyCost).toBeCloseTo(0.96, 6);
  expect(price.unitPrice).toBe(232.26);
  expect(price.lineTotal).toBe(464.52);
});
