import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { normalizeSearch } from '../../shared/utils/presentation';
import { PermissionArea, PermissionCode, UserPreview, UsersPreview, hasPermission, permissionAreas } from './users-preview';

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, HlmButton, HlmInput, ...HlmDialogImports, ...HlmTableImports],
  templateUrl: './usuarios.html',
})
export class Usuarios {
  @ViewChild('userDialog') private dialog?: HlmDialog;
  private readonly preview = inject(UsersPreview);
  protected readonly users = this.preview.users;
  protected readonly permissionAreas = permissionAreas;
  protected readonly query = signal('');
  protected readonly filtered = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.users().filter((user) => normalizeSearch(`${user.name} ${user.email}`).includes(term));
  });
  protected editingId: string | null = null;
  protected draftName = '';
  protected draftEmail = '';
  protected draftPermissions = new Set<PermissionCode>();
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected openCreate(): void {
    this.editingId = null;
    this.draftName = '';
    this.draftEmail = '';
    this.draftPermissions = new Set<PermissionCode>();
    this.error.set('');
    this.dialog?.open();
  }

  protected openEdit(user: UserPreview): void {
    this.editingId = user.id;
    this.draftName = user.name;
    this.draftEmail = user.email;
    this.draftPermissions = new Set(user.permissions);
    this.error.set('');
    this.dialog?.open();
  }

  protected hasDraft(area: PermissionArea, action: 'view' | 'manage'): boolean {
    return this.draftPermissions.has(`${area}:${action}`);
  }

  protected toggle(area: PermissionArea, action: 'view' | 'manage'): void {
    const code: PermissionCode = `${area}:${action}`;
    const next = new Set(this.draftPermissions);
    if (next.has(code)) {
      next.delete(code);
      if (action === 'view') next.delete(`${area}:manage`);
    } else {
      next.add(code);
      if (action === 'manage') next.add(`${area}:view`);
    }
    this.draftPermissions = next;
  }

  protected summary(user: UserPreview): string {
    return permissionAreas.filter((area) => hasPermission(user.permissions, `${area.id}:view`)).map((area) => area.label).join(', ');
  }

  protected save(): void {
    const result = this.preview.save({ name: this.draftName, email: this.draftEmail, permissions: [...this.draftPermissions] }, this.editingId ?? undefined);
    if ('error' in result) { this.error.set(result.error); return; }
    this.notice.set(this.editingId ? `Permissões de ${result.saved.name} atualizadas nesta prévia.` : `${result.saved.name} cadastrado na prévia. O convite será enviado quando o backend estiver integrado.`);
    this.error.set('');
    this.dialog?.close();
  }

  protected close(): void { this.dialog?.close(); }
}
