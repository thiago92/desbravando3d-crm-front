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

  it('should require both credentials and never claim a login occurred in the preview', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Informe seu e-mail.');
    expect(compiled.textContent).toContain('Informe sua senha.');

    const email = compiled.querySelector('#email') as HTMLInputElement;
    const password = compiled.querySelector('#password') as HTMLInputElement;
    email.value = 'usuario@exemplo.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'senha-de-teste';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Seus dados não foram enviados.');
  });
});
