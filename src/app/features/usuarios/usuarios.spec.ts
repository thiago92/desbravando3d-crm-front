import { TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { Usuarios } from './usuarios';
import { UsersPreview } from './users-preview';

describe('Usuários: tela de prévia', () => {
  it('permite escolher Visualizar e Gerenciar e salvar um funcionário', async () => {
    await TestBed.configureTestingModule({ imports: [Usuarios], providers: [provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(Usuarios);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === '+ Cadastrar usuário')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const name = document.querySelector<HTMLInputElement>('[name="userName"]')!;
    name.value = 'Funcionário de teste';
    name.dispatchEvent(new Event('input'));
    const email = document.querySelector<HTMLInputElement>('[name="userEmail"]')!;
    email.value = 'funcionario@exemplo.com';
    email.dispatchEvent(new Event('input'));
    const orders = document.querySelector<HTMLElement>('[role="group"][aria-label="Permissões de Encomendas"]')!;
    [...orders.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Gerenciar')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect([...orders.querySelectorAll<HTMLButtonElement>('button')].every((button) => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Cadastrar usuário')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const saved = TestBed.inject(UsersPreview).users()[0];
    expect(saved).toMatchObject({ name: 'Funcionário de teste', email: 'funcionario@exemplo.com', permissions: expect.arrayContaining(['orders:view', 'orders:manage']) });
    expect(root.textContent).toContain('Convite após integração');
  });
});
