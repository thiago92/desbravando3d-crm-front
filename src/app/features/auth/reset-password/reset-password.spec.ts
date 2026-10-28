import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../../app';
import { routes } from '../../../app.routes';

describe('ResetPassword', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should require a link token and matching passwords for the reset preview', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/redefinir-senha');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Link incompleto');
    expect(compiled.querySelector('form')).toBeNull();

    await router.navigateByUrl('/redefinir-senha?token=demonstracao');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const form = compiled.querySelector('form') as HTMLFormElement;
    const password = compiled.querySelector('#new-password') as HTMLInputElement;
    const confirmation = compiled.querySelector('#confirm-password') as HTMLInputElement;

    password.value = 'nova-senha';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    confirmation.value = 'outra-senha';
    confirmation.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('As senhas não coincidem.');
    expect(compiled.textContent).not.toContain('Formulário conferido');

    confirmation.value = 'nova-senha';
    confirmation.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Formulário conferido');
    expect(compiled.textContent).toContain('a senha ainda não foi alterada');
  });
});
