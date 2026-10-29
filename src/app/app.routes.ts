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
        loadComponent: () => import('./features/preview/preview').then((module) => module.Preview),
        data: { title: 'Dashboard', description: 'Os indicadores de encomendas, vendas e arrecadação serão definidos com as regras de cada fluxo.' },
      },
      {
        path: 'produtos',
        loadComponent: () => import('./features/preview/preview').then((module) => module.Preview),
        data: { title: 'Produtos', description: 'O cadastro será desenhado para atender ao CRM e ao futuro e-commerce.' },
      },
      {
        path: 'encomendas',
        loadComponent: () => import('./features/preview/preview').then((module) => module.Preview),
        data: { title: 'Encomendas', description: 'O fluxo de solicitação, orçamento, produção, entrega e pagamento será detalhado antes desta tela.' },
      },
      {
        path: 'consignado',
        loadComponent: () => import('./features/preview/preview').then((module) => module.Preview),
        data: { title: 'Consignado', description: 'Acompanharemos os produtos em cada loja, as vendas informadas e os valores recebidos.' },
      },
      {
        path: 'clientes-lojas',
        loadComponent: () => import('./features/preview/preview').then((module) => module.Preview),
        data: { title: 'Clientes e lojas', description: 'Os dados de clientes e lojas serão definidos junto aos fluxos de encomendas e consignação.' },
      },
      {
        path: 'financeiro',
        loadComponent: () => import('./features/preview/preview').then((module) => module.Preview),
        data: { title: 'Financeiro', description: 'Valores recebidos e pendentes serão apresentados após a definição das regras de pagamento.' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
