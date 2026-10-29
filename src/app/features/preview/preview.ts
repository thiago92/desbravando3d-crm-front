import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-preview',
  template: `
    <section class="max-w-3xl">
      <p class="text-xs font-bold uppercase tracking-[0.22em] crm-muted">Prévia do CRM</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">{{ title }}</h1>
      <div class="crm-preview-card mt-8 rounded-2xl border p-8 shadow-sm sm:p-10">
        <h2 class="text-lg font-semibold">Área em definição</h2>
        <p class="mt-3 max-w-prose text-sm leading-7 crm-muted">{{ description }}</p>
      </div>
    </section>
  `,
})
export class Preview {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly description = this.route.snapshot.data['description'] as string;
}
