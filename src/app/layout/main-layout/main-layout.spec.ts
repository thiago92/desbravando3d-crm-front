import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { MainLayout } from './main-layout';
import { CurrentUser } from '../../features/auth/current-user';

function stubSystemTheme(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    media: query,
    get matches() { return query === '(prefers-color-scheme: dark)' && dark; },
    addEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => { if (type === 'change' && query === '(prefers-color-scheme: dark)') listeners.add(listener); },
    removeEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => { if (type === 'change') listeners.delete(listener); },
  })));
  return { change(nextDark: boolean) {
    dark = nextDark;
    for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent);
  } };
}

describe('MainLayout', () => {
  beforeEach(async () => {
    localStorage.removeItem('crm-theme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('crm-theme');
    document.documentElement.classList.remove('dark');
    vi.unstubAllGlobals();
  });

  it('usa o tema do computador e acompanha mudanças quando não há escolha salva', async () => {
    const system = stubSystemTheme(true);
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('crm-theme')).toBeNull();
    system.change(false);
    fixture.detectChanges();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('mantém a escolha manual apesar de mudanças no tema do computador', async () => {
    const system = stubSystemTheme(true);
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Claro')!.click();
    fixture.detectChanges();
    expect(localStorage.getItem('crm-theme')).toBe('light');
    system.change(false);
    system.change(true);
    fixture.detectChanges();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('restaura a escolha salva ao abrir o CRM novamente', async () => {
    stubSystemTheme(true);
    localStorage.setItem('crm-theme', 'light');
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    const root = fixture.nativeElement as HTMLElement;
    const lightButton = [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Claro')!;
    expect(lightButton.getAttribute('aria-pressed')).toBe('true');
  });

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

    (compiled.querySelector('a[href="/insumos"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/insumos');
    expect(compiled.querySelector('main h1')?.textContent).toBe('Insumos');

    (compiled.querySelector('a[href="/encomendas"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/encomendas');
    expect(compiled.querySelectorAll('main .kanban-column')).toHaveLength(5);

    const darkButton = Array.from(compiled.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Escuro') as HTMLButtonElement;
    darkButton.click();
    fixture.detectChanges();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('crm-theme')).toBe('dark');

    (compiled.querySelector('a[href="/login"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/login');
  });

  it('expands and collapses the navigation groups', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const operation = Array.from(compiled.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Operação') as HTMLButtonElement;
    const management = Array.from(compiled.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Gestão') as HTMLButtonElement;

    expect(operation.getAttribute('aria-expanded')).toBe('true');
    expect(management.getAttribute('aria-expanded')).toBe('true');

    operation.click();
    fixture.detectChanges();
    expect(operation.getAttribute('aria-expanded')).toBe('false');
    expect(management.getAttribute('aria-expanded')).toBe('true');

    operation.click();
    fixture.detectChanges();
    expect(operation.getAttribute('aria-expanded')).toBe('true');
  });

  it('abre o perfil com dados da prévia e mostra os dados da conta quando houver sessão', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    const profileButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="Abrir perfil"]')!;
    profileButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    let dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Usuário não identificado');
    expect(dialog.textContent).toContain('Não disponível nesta prévia');
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Fechar')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    TestBed.inject(CurrentUser).setAuthenticatedUser({ id: 'user-1', name: 'Ana Silva', email: 'ana@exemplo.com', profile: 'Funcionária', permissions: ['orders:view', 'finance:view'] });
    fixture.detectChanges();
    profileButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Ana Silva');
    expect(dialog.textContent).toContain('ana@exemplo.com');
    expect(dialog.textContent).toContain('Funcionária');
    expect(dialog.textContent).toContain('Encomendas, Financeiro');
  });

  it('fecha o menu mobile ao escolher uma rota', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    try {
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/inicio');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const sidebar = fixture.debugElement.query(By.directive(MainLayout)).injector.get(HlmSidebarService);
      sidebar.setOpenMobile(true);
      fixture.detectChanges();
      expect(sidebar.openMobile()).toBe(true);
      document.querySelector<HTMLAnchorElement>('[data-mobile="true"] a[href="/produtos"]')!.click();
      expect(sidebar.openMobile()).toBe(false);
      await fixture.whenStable();
      expect(router.url).toBe('/produtos');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
