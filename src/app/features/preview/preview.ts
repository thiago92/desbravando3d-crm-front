import { Component } from '@angular/core';
import { TopBar } from '../../layout/main-layout/top-bar/top-bar';

@Component({
  selector: 'app-preview',
  imports: [TopBar],
  template: `
    <div class="min-h-dvh bg-slate-50">
      <app-top-bar title="Início" />
      <main class="mx-auto w-full max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
        <div class="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p class="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Prévia do CRM</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Área interna em construção</h1>
          <p class="mt-4 text-sm leading-7 text-slate-600">
            A barra superior já está disponível. O próximo passo é definir o menu de navegação e as telas de negócio.
          </p>
        </div>
      </main>
    </div>
  `,
})
export class Preview {}
