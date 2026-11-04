import { Injectable, signal } from '@angular/core';

export interface ProductSize {
  id: string;
  name: string;
  weightGrams?: number | null;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  price: number;
  printHours: number;
  materials: { filamentId: string; gramsPerUnit: number }[];
}

export interface ProductPreview {
  id: string;
  name: string;
  description: string;
  image: string | null;
  gallery: (string | null)[] | null;
  sizes: ProductSize[];
  customSizes: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsPreview {
  readonly products = signal<ProductPreview[]>([
    { id: 'preview-1', name: 'Vaso geométrico', description: 'Vaso decorativo com formas geométricas. Produto fictício para explorar a prévia do catálogo.', image: '/products/vase.svg', gallery: ['/products/vase-detail.svg', null], sizes: [
      { id: 'vase-small', name: 'Pequeno', weightGrams: 50, heightCm: 10, widthCm: 6, depthCm: 6, price: 25, printHours: 2, materials: [{ filamentId: 'filament-preview-1', gramsPerUnit: 50 }] },
      { id: 'vase-medium', name: 'Médio', weightGrams: 100, heightCm: 15, widthCm: 9, depthCm: 9, price: 40, printHours: 4, materials: [{ filamentId: 'filament-preview-2', gramsPerUnit: 100 }] },
      { id: 'vase-large', name: 'Grande', weightGrams: 180, heightCm: 20, widthCm: 12, depthCm: 12, price: 65, printHours: 6, materials: [{ filamentId: 'filament-preview-1', gramsPerUnit: 180 }] },
      { id: 'vase-extra', name: 'Extra', weightGrams: 250, heightCm: 25, widthCm: 15, depthCm: 15, price: 90, printHours: 8, materials: [{ filamentId: 'filament-preview-2', gramsPerUnit: 100 }, { filamentId: 'filament-preview-3', gramsPerUnit: 100 }, { filamentId: 'filament-preview-1', gramsPerUnit: 50 }] },
    ], customSizes: true },
    { id: 'preview-2', name: 'Suporte para celular', description: 'Suporte de mesa para apoiar o celular. Produto fictício para explorar a prévia do catálogo.', image: '/products/stand.svg', gallery: null, sizes: [{ id: 'stand-standard', name: 'Padrão', weightGrams: 80, heightCm: 12, widthCm: 8, depthCm: 10, price: 30, printHours: 2, materials: [{ filamentId: 'filament-preview-2', gramsPerUnit: 80 }] }], customSizes: false },
    { id: 'preview-3', name: 'Organizador de mesa', description: 'Organizador para lápis, canetas e pequenos objetos. Produto fictício para explorar a prévia do catálogo.', image: '/products/organizer.svg', gallery: [], sizes: [{ id: 'organizer-standard', name: 'Padrão', weightGrams: 60, heightCm: 10, widthCm: 12, depthCm: 8, price: 25, printHours: 3, materials: [{ filamentId: 'filament-preview-2', gramsPerUnit: 60 }] }], customSizes: true },
  ]);

  save(product: Omit<ProductPreview, 'id'>, id?: string): ProductPreview {
    const saved = { ...product, id: id ?? crypto.randomUUID() };
    this.products.update((items) => id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]);
    return saved;
  }
}
