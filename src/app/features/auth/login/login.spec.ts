import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../../app';
import { routes } from '../../../app.routes';

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('opens the internal preview without credentials', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#email')).toBeNull();
    expect(compiled.querySelector('#password')).toBeNull();

    (compiled.querySelector('a[href="/inicio"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/inicio');
    expect(compiled.textContent).toContain('Área interna em construção');
    expect(compiled.querySelector('header')?.textContent).toContain('Desbravando 3D');
    expect(compiled.querySelector('header')?.textContent).toContain('Início');
    expect(compiled.querySelector('header')?.textContent).toContain('Prévia');
  });
});
