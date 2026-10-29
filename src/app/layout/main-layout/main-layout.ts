import { Component, DOCUMENT, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { TopBar } from './top-bar/top-bar';

type Theme = 'light' | 'dark';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TopBar, HlmButton, ...HlmSidebarImports],
  templateUrl: './main-layout.html',
})
export class MainLayout {
  private readonly document = inject(DOCUMENT);
  protected readonly theme = signal<Theme>(this.initialTheme());

  protected readonly operationItems = [
    { label: 'Produtos', route: '/produtos', icon: 'M4 7h16M4 12h16M4 17h16' },
    { label: 'Encomendas', route: '/encomendas', icon: 'M4 5h16v14H4zM8 9h8M8 13h5' },
    { label: 'Consignado', route: '/consignado', icon: 'M3 9l9-5 9 5v10H3zM9 19v-7h6v7' },
  ];

  protected readonly managementItems = [
    { label: 'Clientes e lojas', route: '/clientes-lojas', icon: 'M16 19H4v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2zM10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 8a3 3 0 0 1 0 6M20 19v-2a4 4 0 0 0-2-3.46' },
    { label: 'Financeiro', route: '/financeiro', icon: 'M3 7h18v12H3zM3 10h18M7 15h4' },
  ];

  constructor() {
    effect(() => this.document.documentElement.classList.toggle('dark', this.theme() === 'dark'));
  }

  protected setTheme(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem('crm-theme', theme);
    } catch {
      // A preferência permanece ativa nesta visita quando o armazenamento está indisponível.
    }
  }

  private initialTheme(): Theme {
    try {
      return localStorage.getItem('crm-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
