import { Injectable, signal } from '@angular/core';
import { normalizeSearch } from '../../shared/utils/presentation';

export type ContactTypePreview = {
  id: string;
  name: string;
};
export type ContactPreview = {
  id: string;
  name: string;
  typeId: string;
  phone: string | null;
  whatsapp: string | null;
};

type NewContact = Pick<ContactPreview, 'name' | 'typeId' | 'phone' | 'whatsapp'>;
type CreateResult = { saved: ContactPreview } | { error: string };
type CreateTypeResult = { saved: ContactTypePreview } | { error: string };

@Injectable({ providedIn: 'root' })
export class ContactsPreview {
  private readonly entries = signal<ContactPreview[]>([]);
  readonly contacts = this.entries.asReadonly();
  private readonly typeEntries = signal<ContactTypePreview[]>([
    { id: 'person', name: 'Pessoa' },
    { id: 'store', name: 'Loja' },
  ]);
  readonly types = this.typeEntries.asReadonly();

  createType(nameInput: string): CreateTypeResult {
    const name = nameInput.trim();
    if (!name || name.length > 60) return { error: 'Informe um nome de tipo com até 60 caracteres.' };
    if (this.typeEntries().some((type) => normalizeSearch(type.name) === normalizeSearch(name))) {
      return { error: 'Já existe um tipo de cliente com esse nome.' };
    }
    const saved: ContactTypePreview = { id: crypto.randomUUID(), name };
    this.typeEntries.update((types) => [...types, saved]);
    return { saved };
  }

  create(input: NewContact, existing: ContactPreview[]): CreateResult {
    const name = input.name.trim();
    if (!name || name.length > 120) return { error: 'Informe um nome de até 120 caracteres.' };
    if (!this.typeEntries().some((type) => type.id === input.typeId)) return { error: 'Escolha o tipo de cliente.' };
    const key = normalizeSearch(name);
    if (existing.some((contact) => normalizeSearch(contact.name) === key)) {
      return { error: 'Já existe um contato com esse nome nesta prévia.' };
    }
    const phone = input.phone?.trim() || null;
    const whatsapp = input.whatsapp?.trim() || null;
    if ((phone?.length ?? 0) > 30 || (whatsapp?.length ?? 0) > 30) {
      return { error: 'Telefone e WhatsApp devem ter até 30 caracteres.' };
    }
    const saved: ContactPreview = { id: crypto.randomUUID(), name, typeId: input.typeId, phone, whatsapp };
    this.entries.update((contacts) => [...contacts, saved]);
    return { saved };
  }
}
