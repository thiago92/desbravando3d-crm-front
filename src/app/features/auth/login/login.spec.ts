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

  it('validates the login fields and opens the internal preview', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form') as HTMLFormElement;
    const email = compiled.querySelector('#email') as HTMLInputElement;
    const password = compiled.querySelector('#password') as HTMLInputElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Informe seu e-mail.');
    expect(compiled.textContent).toContain('Informe sua senha.');
    expect(router.url).toBe('/login');

    email.value = 'usuario@exemplo.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'qualquer-senha';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/inicio');
    expect(compiled.querySelector('main h1')?.textContent).toContain('Dashboard');
    expect(compiled.querySelector('header')?.textContent).toContain('Desbravando 3D');
    expect(compiled.querySelector('header')?.textContent).not.toContain('Início');
    expect(compiled.querySelector('header')?.textContent).toContain('Prévia');
    expect(compiled.querySelector('nav')?.textContent).toContain('Encomendas do site');
  });
});
