import { Injectable, signal } from '@angular/core';
import { PermissionCode } from '../usuarios/users-preview';

export interface CurrentUserIdentity {
  id: string;
  name: string;
  email: string;
  profile: string;
  permissions: PermissionCode[];
}

@Injectable({ providedIn: 'root' })
export class CurrentUser {
  readonly user = signal<CurrentUserIdentity | null>(null);

  setAuthenticatedUser(user: CurrentUserIdentity): void { this.user.set(user); }
  clear(): void { this.user.set(null); }
}
