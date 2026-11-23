import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/auth/auth-layout/auth-layout').then((module) => module.AuthLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((module) => module.Login),
      },
      {
        path: 'recuperar-senha',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((module) => module.ForgotPassword),
      },
      {
        path: 'redefinir-senha',
        loadComponent: () => import('./features/auth/reset-password/reset-password').then((module) => module.ResetPassword),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((module) => module.MainLayout),
    children: [
      {
        path: 'inicio',
        data: { requiredPermission: 'dashboard:view' },
        loadComponent: () => import('./features/dashboard/dashboard').then((module) => module.Dashboard),
      },
      {
        path: 'produtos',
        data: { requiredPermission: 'products:view' },
        loadComponent: () => import('./features/produtos/produtos').then((module) => module.Produtos),
      },
      {
        path: 'insumos',
        data: { requiredPermission: 'supplies:view' },
        loadComponent: () => import('./features/insumos/insumos').then((module) => module.Insumos),
      },
      {
        path: 'precificacao',
        data: { requiredPermission: 'pricing:view' },
        loadComponent: () => import('./features/calculadora/calculadora').then((module) => module.Calculadora),
      },
      { path: 'calculadora', pathMatch: 'full', redirectTo: 'precificacao' },
      {
        path: 'encomendas',
        data: { requiredPermission: 'orders:view' },
        loadComponent: () => import('./features/encomendas/encomendas').then((module) => module.Encomendas),
      },
      {
        path: 'consignado',
        data: { requiredPermission: 'consignments:view' },
        loadComponent: () => import('./features/consignado/consignado').then((module) => module.Consignado),
      },
      {
        path: 'clientes-lojas',
        data: { requiredPermission: 'contacts:view' },
        loadComponent: () => import('./features/clientes-lojas/clientes-lojas').then((module) => module.ClientesLojas),
      },
      {
        path: 'financeiro',
        data: { requiredPermission: 'finance:view' },
        loadComponent: () => import('./features/financeiro/financeiro').then((module) => module.Financeiro),
      },
      {
        path: 'usuarios',
        data: { requiredPermission: 'users:manage' },
        loadComponent: () => import('./features/usuarios/usuarios').then((module) => module.Usuarios),
      },
      {
        path: 'log',
        data: { requiredPermission: 'audit:view' },
        loadComponent: () => import('./features/log/log').then((module) => module.Log),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
