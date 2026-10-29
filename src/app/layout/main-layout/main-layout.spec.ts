import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';

describe('MainLayout', () => {
  beforeEach(async () => {
    localStorage.removeItem('crm-theme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem('crm-theme'));

  it('navigates between preview sections and keeps the chosen theme', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/encomendas-do-site"]')).toBeNull();

    (compiled.querySelector('a[href="/produtos"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/produtos');
    expect(compiled.querySelector('main h1')?.textContent).toBe('Produtos');

    const darkButton = Array.from(compiled.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Escuro') as HTMLButtonElement;
    darkButton.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.crm-shell')?.classList.contains('crm-dark')).toBe(true);
    expect(localStorage.getItem('crm-theme')).toBe('dark');

    (compiled.querySelector('a[href="/login"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/login');
  });
});
