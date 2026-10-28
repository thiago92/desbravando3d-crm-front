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
  { path: '**', redirectTo: 'login' },
];
