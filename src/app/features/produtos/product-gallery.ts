import { Component, computed, input, signal } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-product-gallery',
  imports: [HlmButton],
  template: `
    <div class="image-area" (pointermove)="move($event)" (pointerleave)="hovering.set(false); origin.set('50% 50%')">
      @if (activeImage() && !failed().includes(activeImage()!)) {
        <img class="main-image" [src]="activeImage()!" [alt]="name() + ' — ' + (activeIndex() === 0 ? 'imagem principal' : 'imagem ' + activeIndex())"
          [style.transform]="zoomed() ? 'scale(2.5)' : 'scale(1)'" [style.transform-origin]="origin()" (error)="markFailed(activeImage()!)" />
        <button hlmBtn variant="outline" size="sm" type="button" class="zoom-toggle" [attr.aria-pressed]="zoomed()" (click)="toggleZoom()" aria-label="Ativar ou desativar lupa">⌕ {{ zoomed() ? 'Desativar lupa' : 'Ampliar imagem' }}</button>
      } @else {
        <span class="placeholder">{{ activeImage() ? 'Imagem indisponível' : 'Sem imagem' }}</span>
      }
    </div>
    <p class="hint">{{ activeImage() ? 'Ative a lupa e passe o mouse para ampliar os detalhes. No celular, toque na lupa para ampliar o centro.' : 'Este espaço pode ficar sem imagem.' }}</p>
    <div class="thumbnails" role="group" aria-label="Imagens do produto">
      @for (image of images(); track $index) {
        <button type="button" class="thumbnail" [attr.aria-pressed]="activeIndex() === $index" [attr.aria-label]="$index === 0 ? 'Ver imagem principal' : 'Ver imagem ' + $index" (click)="select($index)">
          @if (image && !failed().includes(image)) { <img [src]="image" alt="" (error)="markFailed(image)" /> }
          @else { <span>{{ image ? 'Indisponível' : 'Sem imagem' }}</span> }
          <span class="caption">{{ $index === 0 ? 'Principal' : 'Imagem ' + $index }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .image-area { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 0.75rem; background: var(--muted); display: flex; align-items: center; justify-content: center; }
    .main-image { width: 100%; height: 100%; object-fit: contain; }
    button { color: var(--foreground); }
    .thumbnail:focus-visible { outline: 2px solid var(--ring); outline-offset: 3px; }
    .zoom-toggle { position: absolute; right: 0.75rem; bottom: 0.75rem; border-radius: 2rem; background: var(--card); }
    .placeholder, .hint { color: var(--muted-foreground); font-size: 0.75rem; }
    .hint { margin: 0.75rem 0; line-height: 1.5; }
    .thumbnails { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.75rem; }
    .thumbnail { min-width: 0; overflow: hidden; border: 2px solid var(--border); border-radius: 0.5rem; background: var(--muted); }
    .thumbnail[aria-pressed='true'] { border-color: var(--primary); }
    .thumbnail img { width: 100%; aspect-ratio: 1; object-fit: cover; }
    .thumbnail > span:first-child { display: flex; aspect-ratio: 1; align-items: center; justify-content: center; color: var(--muted-foreground); font-size: 0.65rem; }
    .caption { display: block; padding: 0.35rem; font-size: 0.65rem; background: var(--card); }
  `,
})
export class ProductGallery {
  readonly name = input.required<string>();
  readonly principal = input<string | null>(null);
  readonly gallery = input<(string | null)[] | null>(null);
  protected readonly images = computed(() => [this.principal(), ...(this.gallery() ?? [])]);
  protected readonly activeIndex = signal(0);
  protected readonly activeImage = computed(() => this.images()[this.activeIndex()] ?? null);
  protected readonly failed = signal<string[]>([]);
  protected readonly zoomEnabled = signal(true);
  protected readonly hovering = signal(false);
  protected readonly origin = signal('50% 50%');
  protected readonly zoomed = computed(() => this.zoomEnabled() && this.hovering());

  protected select(index: number): void {
    this.activeIndex.set(index);
    this.hovering.set(false);
    this.origin.set('50% 50%');
  }
  protected markFailed(image: string): void { this.failed.update((items) => [...items, image]); }
  protected toggleZoom(): void {
    const wasZoomed = this.zoomed();
    this.zoomEnabled.set(!wasZoomed);
    this.hovering.set(true);
  }
  protected move(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.hovering.set(true);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
    this.origin.set(x + '% ' + y + '%');
  }
}
