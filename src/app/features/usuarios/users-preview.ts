import { Injectable, signal } from '@angular/core';
import { normalizeSearch } from '../../shared/utils/presentation';

export const permissionAreas = [
  { id: 'dashboard', label: 'Dashboard', manage: false },
  { id: 'products', label: 'Produtos', manage: true },
  { id: 'supplies', label: 'Insumos', manage: true },
  { id: 'pricing', label: 'Precificação', manage: true },
  { id: 'orders', label: 'Encomendas', manage: true },
  { id: 'consignments', label: 'Consignado', manage: true },
  { id: 'contacts', label: 'Clientes e lojas', manage: true },
  { id: 'finance', label: 'Financeiro', manage: true },
  { id: 'audit', label: 'Log', manage: false },
] as const;

export type PermissionArea = typeof permissionAreas[number]['id'];
export type PermissionCode = `${PermissionArea}:view` | `${PermissionArea}:manage` | 'users:manage';
export interface UserPreview {
  id: string;
  name: string;
  email: string;
  permissions: PermissionCode[];
}

export function hasPermission(permissions: readonly PermissionCode[], code: PermissionCode): boolean {
  return permissions.includes(code) || (code.endsWith(':view') && permissions.includes(code.replace(':view', ':manage') as PermissionCode));
}

@Injectable({ providedIn: 'root' })
export class UsersPreview {
  readonly users = signal<UserPreview[]>([]);

  save(input: { name: string; email: string; permissions: readonly PermissionCode[] }, id?: string): { saved: UserPreview } | { error: string } {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || name.length > 120) return { error: 'Informe um nome com até 120 caracteres.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'Informe um e-mail válido.' };
    if (this.users().some((user) => user.id !== id && normalizeSearch(user.email) === normalizeSearch(email))) return { error: 'Este e-mail já está cadastrado na prévia.' };
    const allowed = new Set<PermissionCode>(permissionAreas.flatMap((area) => area.manage ? [`${area.id}:view`, `${area.id}:manage`] as PermissionCode[] : [`${area.id}:view`] as PermissionCode[]));
    if (input.permissions.some((code) => !allowed.has(code))) return { error: 'Há uma permissão inválida.' };
    const permissions = [...new Set(input.permissions)];
    for (const code of [...permissions]) {
      if (!code.endsWith(':manage')) continue;
      const view = code.replace(':manage', ':view') as PermissionCode;
      if (!permissions.includes(view)) permissions.push(view);
    }
    if (!permissions.length) return { error: 'Selecione pelo menos uma permissão.' };
    const current = id ? this.users().find((user) => user.id === id) : undefined;
    if (id && !current) return { error: 'Usuário não encontrado.' };
    const saved: UserPreview = { id: current?.id ?? crypto.randomUUID(), name, email, permissions };
    this.users.update((users) => current ? users.map((user) => user.id === id ? saved : user) : [...users, saved]);
    return { saved };
  }
}
