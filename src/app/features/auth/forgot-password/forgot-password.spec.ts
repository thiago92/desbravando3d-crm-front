import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../../app';
import { routes } from '../../../app.routes';

describe('ForgotPassword', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should show a generic confirmation only after a valid email', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/recuperar-senha');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Informe seu e-mail.');
    expect(compiled.textContent).not.toContain('Confira seu e-mail');

    const email = compiled.querySelector('#recovery-email') as HTMLInputElement;
    email.value = 'usuario@exemplo.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Confira seu e-mail');
    expect(compiled.textContent).toContain('nenhum e-mail foi enviado');
  });
});
