import { Component, DOCUMENT, DestroyRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSidebarImports, provideHlmSidebarConfig } from '@spartan-ng/helm/sidebar';
import { CurrentUser } from '../../features/auth/current-user';
import { hasPermission, permissionAreas } from '../../features/usuarios/users-preview';
import { TopBar } from './top-bar/top-bar';

type Theme = 'light' | 'dark';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TopBar, HlmButton, ...HlmCollapsibleImports, ...HlmDialogImports, ...HlmSidebarImports],
  providers: [provideHlmSidebarConfig({ closeMobileSidebarOnMenuButtonClick: true })],
  templateUrl: './main-layout.html',
})
export class MainLayout {
  @ViewChild('profileDialog') private profileDialog?: HlmDialog;
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUser = inject(CurrentUser);
  private readonly systemTheme = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  private readonly savedTheme = this.readSavedTheme();
  private manuallyChosenTheme = this.savedTheme !== null;
  protected readonly user = this.currentUser.user;
  protected readonly profileInitial = computed(() => this.user()?.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'P');
  protected readonly accessibleAreas = computed(() => {
    const user = this.user();
    return user ? permissionAreas.filter((area) => hasPermission(user.permissions, `${area.id}:view`)).map((area) => area.label) : [];
  });
  protected readonly theme = signal<Theme>(this.savedTheme ?? (this.systemTheme?.matches ? 'dark' : 'light'));

  protected readonly operationItems = [
    { label: 'Produtos', route: '/produtos', icon: 'M4 7h16M4 12h16M4 17h16' },
    { label: 'Insumos', route: '/insumos', icon: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5' },
    { label: 'Precificação', route: '/precificacao', icon: 'M5 3h14v18H5zM8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2' },
    { label: 'Encomendas', route: '/encomendas', icon: 'M4 5h16v14H4zM8 9h8M8 13h5' },
    { label: 'Consignado', route: '/consignado', icon: 'M3 9l9-5 9 5v10H3zM9 19v-7h6v7' },
  ];

  protected readonly managementItems = [
    { label: 'Clientes e lojas', route: '/clientes-lojas', icon: 'M16 19H4v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2zM10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 8a3 3 0 0 1 0 6M20 19v-2a4 4 0 0 0-2-3.46' },
    { label: 'Financeiro', route: '/financeiro', icon: 'M3 7h18v12H3zM3 10h18M7 15h4' },
    { label: 'Usuários e permissões', route: '/usuarios', icon: 'M16 19H4v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2zM10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 5h5m-2.5-2.5v5' },
    { label: 'Log', route: '/log', icon: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5' },
  ];

  constructor() {
    this.document.documentElement.classList.toggle('dark', this.theme() === 'dark');
    effect(() => this.document.documentElement.classList.toggle('dark', this.theme() === 'dark'));
    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!this.manuallyChosenTheme) this.theme.set(event.matches ? 'dark' : 'light');
    };
    this.systemTheme?.addEventListener?.('change', onSystemThemeChange);
    this.destroyRef.onDestroy(() => this.systemTheme?.removeEventListener?.('change', onSystemThemeChange));
  }

  protected setTheme(theme: Theme): void {
    this.manuallyChosenTheme = true;
    this.theme.set(theme);
    try {
      localStorage.setItem('crm-theme', theme);
    } catch {
      // A preferência permanece ativa nesta visita quando o armazenamento está indisponível.
    }
  }

  protected openProfile(): void { this.profileDialog?.open(); }
  protected closeProfile(): void { this.profileDialog?.close(); }

  private readSavedTheme(): Theme | null {
    try {
      const saved = localStorage.getItem('crm-theme');
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  }
}
