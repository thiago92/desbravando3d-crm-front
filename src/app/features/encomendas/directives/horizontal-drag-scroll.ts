import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Pan do quadro com mouse; não move cartões nem altera etapas. */
@Directive({
  selector: '[appHorizontalDragScroll]',
  host: {
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'finish($event)',
    '(pointercancel)': 'cancel($event)',
    '(lostpointercapture)': 'cancel($event)',
    '(pointerleave)': 'leave()',
    '(dragstart)': 'preventNativeDrag($event)',
  },
})
export class HorizontalDragScroll {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private gesture?: { id: number; x: number; y: number; scroll: number };
  private dragging = false;
  private blockClick = false;

  constructor() {
    // Captura antes do botão do cartão, evitando abrir detalhes ao terminar um arraste.
    const suppressDraggedClick = (event: MouseEvent) => {
      if (!this.blockClick || event.detail === 0) return;
      this.blockClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    this.element.addEventListener('click', suppressDraggedClick, true);
    inject(DestroyRef).onDestroy(() => {
      this.element.removeEventListener('click', suppressDraggedClick, true);
      this.reset();
    });
  }

  protected start(event: PointerEvent): void {
    this.blockClick = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || this.element.scrollWidth <= this.element.clientWidth) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    // Deixa as barras nativas do quadro e das colunas operarem normalmente.
    const rect = target.getBoundingClientRect();
    if ((target.scrollHeight > target.clientHeight && event.clientX >= rect.left + target.clientLeft + target.clientWidth) ||
        (target.scrollWidth > target.clientWidth && event.clientY >= rect.top + target.clientTop + target.clientHeight)) return;
    this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: this.element.scrollLeft };
  }

  protected move(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (event.buttons === 0) { this.reset(); return; }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!this.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { this.reset(); return; }
      this.dragging = true;
      this.blockClick = true;
      this.element.classList.add('is-dragging');
      this.element.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    this.element.scrollLeft = gesture.scroll - dx;
  }

  protected finish(event: PointerEvent): void {
    if (event.pointerId === this.gesture?.id) this.reset();
  }

  protected cancel(event: PointerEvent): void {
    if (event.pointerId !== this.gesture?.id) return;
    this.blockClick = false;
    this.reset();
  }

  protected leave(): void { if (!this.dragging) this.reset(); }

  protected preventNativeDrag(event: DragEvent): void {
    if (this.gesture) event.preventDefault();
  }

  private reset(): void {
    const id = this.gesture?.id;
    this.gesture = undefined;
    this.dragging = false;
    this.element.classList.remove('is-dragging');
    if (id !== undefined && this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
  }
}
