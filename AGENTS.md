# Contexto do projeto desbravando3d-crm-front

## Objetivo

Construir o frontend de um CRM para uma empresa de impressão 3D. O sistema deve ajudar a controlar encomendas, vendas consignadas, valores recebidos e valores ainda pendentes de pagamento. O fluxo e as regras de negócio ainda serão detalhados.

## Etapas combinadas

1. Definir a estrutura e os fluxos do frontend.
2. Implementar o frontend com dados mockados, para validar telas e interações sem depender de uma API.
3. Definir e implementar o backend depois, usando os fluxos e contratos validados no frontend como referência.

Não presumir que o escopo funcional, o modelo de dados ou o contrato da API já estejam fechados. Antes de criar telas ou entidades, alinhar com o usuário os detalhes necessários de cada fluxo.

## Tecnologia e decisões atuais

- A aplicação `desbravando3d-crm-front` foi criada com Angular 22.2, compatível com o Node instalado na máquina (`v22.23.3`).
- O projeto usa componentes standalone, sem `app.module.ts`, e tem Angular Router configurado. `src/app/app.routes.ts` ainda não contém rotas.
- O scaffold usa CSS e não inclui SSR nem geração estática. Tailwind CSS v4 e `spartan/ui` continuam planejados, mas ainda não foram instalados. O Spartan usa `@spartan-ng/brain` para comportamento e componentes Helm copiados para o código do projeto.
- O Angular CLI 22 está instalado globalmente na instalação ativa do Node. Nesta máquina, comandos `npm` e `ng` podem não ser encontrados no PowerShell; usar `npm.cmd` e `ng.cmd` ou o caminho completo dos executáveis quando necessário. A política de execução já bloqueou `npm.ps1`.
- O projeto Angular está na subpasta `CRM.Front/desbravando3d-crm-front`, que tem seu próprio repositório Git. Este `AGENTS.md` fica na raiz dessa subpasta.

## Referência existente

O usuário gosta da organização do projeto React em `C:\Users\T8105\Documents\projetos\Portfolio\Portfolio.Front\portifolio`. Ele separa páginas, layout, componentes reutilizáveis, serviços de API, hooks, modelos/interfaces e dados estáticos. Aproveitar essa separação conceitual, adaptando-a às convenções do Angular; não copiar diretamente código React, hooks nem os componentes shadcn.

Correspondências úteis:

| React do portfólio | Angular deste projeto |
| --- | --- |
| `pages/` | `features/`, agrupadas por área de negócio |
| `layout/` e `Outlet` | componente de layout com `router-outlet` |
| `services/` | serviços Angular próximos da funcionalidade; infraestrutura comum em `core/` |
| `hooks/` | estado local ou serviço da funcionalidade, usando signals quando fizer sentido |
| `components/ui/` do shadcn | componentes Helm gerados pelo Spartan |
| `interface/` | modelos próximos da funcionalidade; compartilhar apenas quando houver uso real em várias áreas |

## Estrutura inicial proposta

Esta é uma direção para começar, ajustável conforme os fluxos forem definidos. Evitar criar pastas e arquivos vazios antecipadamente.

```text
src/
  app/
    app.config.ts
    app.routes.ts
    core/
      api/                  # configuração HTTP futura
      auth/                 # somente quando houver autenticação definida
    layout/
      main-layout/
    features/
      encomendas/
      consignacoes/
      pagamentos/           # ou financeiro, conforme o domínio for definido
      clientes/             # quando necessário aos fluxos
    shared/
      components/           # componentes próprios realmente reutilizados
      models/               # somente modelos compartilhados
    app.ts
  styles.css
libs/
  ui/                       # exemplo de destino configurável para Helm do Spartan
```

Dentro de cada feature, manter juntos seus componentes, modelos, serviços, estado e mocks. Separar dados mockados atrás de contratos claros para facilitar a futura troca pela API. Preferir rotas carregadas sob demanda quando as páginas forem criadas. Manter o código copiado do Spartan em seu destino configurado, separado dos componentes de negócio.

## Pontos ainda em aberto

- Instalação e configuração de Tailwind CSS v4 e Spartan, incluindo o destino dos componentes Helm.
- Telas, etapas e estados das encomendas e das vendas consignadas.
- Regras de cobrança, pagamentos parciais, saldos e relatórios.
- Entidades, campos e relacionamentos do domínio.
- Navegação, autenticação, identidade visual e necessidade de internacionalização.
- Formato dos mocks e contratos da futura API.

O portfólio de referência usa Tailwind v3; o setup atual do Spartan requer Tailwind v4. Reaproveitar ideias visuais e de organização, não copiar a configuração de estilos diretamente.
