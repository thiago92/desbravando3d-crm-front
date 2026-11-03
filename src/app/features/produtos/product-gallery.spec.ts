import { TestBed } from '@angular/core/testing';
import { ProductGallery } from './product-gallery';

describe('Galeria de produto', () => {
  it('seleciona imagens, preserva espaços nulos e trata falha de carregamento', () => {
    const fixture = TestBed.createComponent(ProductGallery);
    fixture.componentRef.setInput('name', 'Vaso');
    fixture.componentRef.setInput('principal', '/principal.png');
    fixture.componentRef.setInput('gallery', ['/detalhe.png', null]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const thumbnails = root.querySelectorAll<HTMLButtonElement>('.thumbnail');
    expect(thumbnails).toHaveLength(3);
    thumbnails[1].click();
    fixture.detectChanges();
    expect(root.querySelector('img.main-image')?.getAttribute('src')).toBe('/detalhe.png');
    root.querySelector('img.main-image')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.querySelector('.image-area')?.textContent).toContain('Imagem indisponível');
    thumbnails[2].click();
    fixture.detectChanges();
    expect(root.querySelector('.image-area')?.textContent).toContain('Sem imagem');
    thumbnails[0].click();
    fixture.detectChanges();
    expect(root.querySelector('img.main-image')?.getAttribute('src')).toBe('/principal.png');
  });

  it('amplia a região do cursor e restaura a imagem quando o mouse sai', () => {
    const fixture = TestBed.createComponent(ProductGallery);
    fixture.componentRef.setInput('name', 'Vaso');
    fixture.componentRef.setInput('principal', '/principal.png');
    fixture.componentRef.setInput('gallery', null);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const area = root.querySelector<HTMLElement>('.image-area')!;
    vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 200, height: 100 } as DOMRect);
    const event = new Event('pointermove');
    Object.defineProperties(event, { pointerType: { value: 'mouse' }, clientX: { value: 160 }, clientY: { value: 45 } });
    area.dispatchEvent(event);
    fixture.detectChanges();
    const image = root.querySelector<HTMLImageElement>('.main-image')!;
    expect(image.style.transform).toBe('scale(2.5)');
    expect(image.style.transformOrigin).toBe('75% 25%');
    area.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(image.style.transform).toBe('scale(1)');
    expect(root.querySelectorAll('.thumbnail')).toHaveLength(1);
  });

  it('aceita imagem principal e galeria nulas', () => {
    const fixture = TestBed.createComponent(ProductGallery);
    fixture.componentRef.setInput('name', 'Sem foto');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.image-area')?.textContent).toContain('Sem imagem');
    expect(root.querySelector('.zoom-toggle')).toBeNull();
    expect(root.querySelectorAll('img')).toHaveLength(0);
  });
});
