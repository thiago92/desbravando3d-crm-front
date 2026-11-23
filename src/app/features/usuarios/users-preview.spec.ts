import { TestBed } from '@angular/core/testing';
import { UsersPreview, hasPermission } from './users-preview';

describe('Usuários: prévia de permissões', () => {
  it('cadastra e atualiza usuário com permissões por área sem criar senha', () => {
    const preview = TestBed.inject(UsersPreview);
    const created = preview.save({ name: '  Ana  ', email: 'ANA@EXEMPLO.COM', permissions: ['orders:manage'] });
    expect(created).toMatchObject({ saved: { name: 'Ana', email: 'ana@exemplo.com', permissions: expect.arrayContaining(['orders:view', 'orders:manage']) } });
    if (!('saved' in created)) return;
    expect(hasPermission(created.saved.permissions, 'orders:view')).toBe(true);
    expect(hasPermission(created.saved.permissions, 'finance:view')).toBe(false);
    expect(preview.save({ name: 'Outra', email: 'ana@exemplo.com', permissions: ['dashboard:view'] })).toHaveProperty('error');
    expect(preview.save({ name: 'Ana', email: 'ana@exemplo.com', permissions: [] }, created.saved.id)).toHaveProperty('error');
    expect(preview.save({ name: 'Ana', email: 'ana@exemplo.com', permissions: ['finance:view'] }, created.saved.id)).toHaveProperty('saved');
    expect(preview.users()).toHaveLength(1);
    expect(preview.users()[0].permissions).toEqual(['finance:view']);
  });
});
