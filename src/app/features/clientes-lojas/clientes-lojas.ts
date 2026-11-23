import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialog, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { ConsignmentsPreview, consignmentStatus } from '../consignado/consignado';
import { OrdersPreview } from '../encomendas/orders-preview';
import { formatMoney, normalizeSearch } from '../../shared/utils/presentation';
import { ContactPreview, ContactsPreview } from './contacts-preview';

const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const orderStages = { request: 'Em orçamento', confirmed: 'Confirmada', printing: 'Em impressão', ready: 'Pronta para entrega', delivered: 'Entregue' } as const;

@Component({
  selector: 'app-clientes-lojas',
  imports: [FormsModule, HlmButton, HlmInput, ...HlmDialogImports, ...HlmNativeSelectImports, ...HlmTableImports],
  templateUrl: './clientes-lojas.html',
})
export class ClientesLojas {
  @ViewChild('contactDialog') private dialog?: HlmDialog;
  @ViewChild('typeDialog') private typeDialog?: HlmDialog;
  private readonly orders = inject(OrdersPreview);
  private readonly consignments = inject(ConsignmentsPreview);
  private readonly preview = inject(ContactsPreview);
  private readonly router = inject(Router);
  protected readonly query = signal('');
  protected readonly creating = signal(false);
  protected createName = '';
  protected createTypeId = '';
  protected createPhone = '';
  protected createWhatsapp = '';
  protected readonly createError = signal('');
  protected readonly types = this.preview.types;
  protected typeName = '';
  protected readonly typeError = signal('');
  private readonly selectedId = signal<string | null>(null);
  protected readonly contacts = computed<ContactPreview[]>(() => {
    const people = [...new Set(this.orders.orders().map((order) => order.customer.trim()).filter(Boolean))]
      .map((name) => ({ id: `person:${name}`, name, typeId: 'person', phone: null, whatsapp: null }));
    const stores = [...new Set(this.consignments.entries().map((card) => card.store.trim()).filter(Boolean))]
      .map((name) => ({ id: `store:${name}`, name, typeId: 'store', phone: null, whatsapp: null }));
    const added = this.preview.contacts();
    const addedKeys = new Set(added.map((contact) => normalizeSearch(contact.name)));
    return [...[...people, ...stores].filter((contact) => !addedKeys.has(normalizeSearch(contact.name))), ...added]
      .sort((a, b) => byName.compare(a.name, b.name));
  });
  protected readonly filtered = computed(() => {
    const term = normalizeSearch(this.query().trim());
    return this.contacts().filter((contact) => normalizeSearch(`${contact.name} ${this.typeNameFor(contact.typeId)}`).includes(term));
  });
  protected readonly selected = computed(() => this.contacts().find((contact) => contact.id === this.selectedId()) ?? null);
  protected readonly contactOrders = computed(() => {
    const contact = this.selected();
    return contact ? this.orders.orders().filter((order) => order.customerId ? order.customerId === contact.id : order.customer.trim() === contact.name) : [];
  });
  protected readonly contactConsignments = computed(() => {
    const contact = this.selected();
    return contact ? this.consignments.entries().filter((card) => card.contactId ? card.contactId === contact.id : card.store.trim() === contact.name) : [];
  });
  protected typeNameFor(id: string): string { return this.types().find((type) => type.id === id)?.name ?? 'Tipo indisponível'; }
  protected readonly money = formatMoney;
  protected readonly orderStatus = (stage: keyof typeof orderStages) => orderStages[stage];
  protected readonly consignmentStatus = consignmentStatus;
  protected orderTotal(id: string): number | null {
    const order = this.orders.orders().find((entry) => entry.id === id);
    return order ? this.orders.priceFor(order)?.total ?? null : null;
  }
  protected pending(card: { sold: number; unitPrice: number; received: number }): number {
    return Math.max(0, Math.round((card.sold * card.unitPrice - card.received) * 100) / 100);
  }
  protected open(contact: ContactPreview): void { this.creating.set(false); this.selectedId.set(contact.id); this.dialog?.open(); }
  protected openCreate(): void {
    this.selectedId.set(null);
    this.createName = '';
    this.createTypeId = '';
    this.createPhone = '';
    this.createWhatsapp = '';
    this.createError.set('');
    this.creating.set(true);
    this.dialog?.open();
  }
  protected saveCreate(): void {
    const result = this.preview.create({ name: this.createName, typeId: this.createTypeId, phone: this.createPhone, whatsapp: this.createWhatsapp }, this.contacts());
    if ('error' in result) { this.createError.set(result.error); return; }
    this.query.set('');
    this.selectedId.set(result.saved.id);
    this.createError.set('');
    this.creating.set(false);
  }
  protected openCreateType(): void {
    this.typeName = '';
    this.typeError.set('');
    this.typeDialog?.open();
  }
  protected saveCreateType(): void {
    const result = this.preview.createType(this.typeName);
    if ('error' in result) { this.typeError.set(result.error); return; }
    this.createTypeId = result.saved.id;
    this.createError.set('');
    this.typeDialog?.close();
  }
  protected close(): void { this.dialog?.close(); }
  protected dialogClosed(): void { this.selectedId.set(null); this.creating.set(false); }
  protected openOrder(id: string): void { void this.router.navigate(['/encomendas'], { queryParams: { abrir: id } }); }
  protected openConsignment(number: string): void { void this.router.navigate(['/consignado'], { queryParams: { abrir: number } }); }
}
