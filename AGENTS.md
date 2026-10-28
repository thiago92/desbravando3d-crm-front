# Contexto do projeto desbravando3d-crm-front

## Objetivo

Construir o frontend de um CRM para uma empresa de impressão 3D. O sistema deve ajudar a controlar encomendas, vendas consignadas, valores recebidos e valores ainda pendentes de pagamento. O fluxo e as regras de negócio ainda serão detalhados.

## Etapas combinadas

1. Definir a estrutura e os fluxos do frontend.
2. Implementar o frontend com dados mockados, para validar telas e interações sem depender de uma API.
3. Definir e implementar o backend depois, usando os fluxos e contratos validados no frontend como referência.

Não presumir que o escopo funcional, o modelo de dados ou o contrato da API já estejam fechados. Antes de criar telas ou entidades, alinhar com o usuário os detalhes necessários de cada fluxo.

## Direção de interface e acesso

- A identidade visual ainda não está fechada. A direção inicial é uma interface limpa, com barra superior para informações relevantes, menu lateral para navegação e possível rodapé. Definir o conteúdo dessas regiões e validar o layout com o usuário antes de implementar telas.
- A primeira versão prevê dois acessos individuais, para o usuário e sua esposa. O perfil inicialmente previsto é administrador; a estrutura deve permitir outros perfis e permissões no futuro sem espalhar verificações rígidas pelo código. Não fixar nomes, e-mails nem senhas no frontend.
- O backend será a autoridade para autenticação e autorização. Ele determinará as permissões do usuário por meio de token; o formato do token, suas permissões e o contrato de autenticação ainda precisam ser definidos. O frontend deverá usar essas informações para bloquear rotas e ações indisponíveis, e o backend deverá validar cada operação protegida.
- Enquanto o backend não existir, validar os fluxos de login e acesso com dados mockados atrás de contratos substituíveis. Não presumir credenciais, perfis adicionais ou uma matriz de permissões antes do alinhamento com o usuário.
- A recuperação de senha terá solicitação por e-mail e uma tela para definir nova senha acessada por link com token. O backend deverá conferir o e-mail, enviar o link e validar o token antes de alterar a senha. A resposta de solicitação prevista pelo usuário é HTTP 200; o contrato completo e as regras de expiração e uso do token ainda não foram definidos. A interface deve evitar revelar se um e-mail está cadastrado.
- Manter este `AGENTS.md` e o `README.md` atualizados conforme decisões e funcionalidades forem validadas. O README deve descrever o estado real do projeto, não funcionalidades apenas planejadas como se já estivessem implementadas.

## Fluxos de negócio em definição

- Consignação: lojas parceiras recebem produtos da empresa. O pagamento desses produtos depende de sua venda pela loja. A entrega à loja, a venda informada e o pagamento recebido devem ser tratados como acontecimentos distintos no controle do CRM.
- O usuário quer acompanhar encomendas, produtos ainda em consignação, itens vendidos, valores ainda não pagos e um dashboard. As telas e indicadores ainda precisam ser detalhados antes da implementação.
- Alinhar como registrar entregas, quantidades, vendas, devoluções, repasses e pagamentos antes de definir entidades, estados ou cálculos da consignação.

## Tecnologia e decisões atuais

- A aplicação `desbravando3d-crm-front` foi criada com Angular 22.2, compatível com o Node instalado na máquina (`v22.23.3`).
- O projeto usa componentes standalone, sem `app.module.ts`, e Angular Router. As rotas `/login`, `/recuperar-senha` e `/redefinir-senha` usam um layout de autenticação compartilhado em `src/app/features/auth/auth-layout/`.
- O scaffold usa CSS e não inclui SSR nem geração estática. Tailwind CSS v4 está instalado e configurado via PostCSS em `.postcssrc.json` e `src/styles.css`.
- Spartan está instalado com `@spartan-ng/cli` e `@spartan-ng/brain`; o tema `neutral` foi inicializado em `src/styles.css`. Ainda não há componentes Helm gerados. O Spartan usa Brain para comportamento e copia os componentes Helm para o código do projeto quando forem selecionados.
- O projeto usa Vitest. Executar uma vez com `npm.cmd run test:unit`; o workflow `.github/workflows/unit-tests.yml` executa os testes em pushes e pull requests. `src/app/app.spec.ts` cobre a raiz e o redirecionamento inicial; cada tela de autenticação tem seu `*.spec.ts` ao lado do componente. Esses testes exercitam navegação e validação dos formulários. Manter os próximos testes próximos da respectiva feature e adicionar testes de regras e interações à medida que os fluxos forem definidos, evitando testes que apenas repitam a implementação.
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
      auth/                 # login e autorização quando regras e contrato forem definidos
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

- Destino dos componentes Helm do Spartan quando o primeiro componente for necessário.
- Telas, etapas e estados das encomendas e das vendas consignadas.
- Regras de cobrança, pagamentos parciais, saldos e relatórios.
- Entidades, campos e relacionamentos do domínio.
- Conteúdo da barra superior, itens do menu lateral, necessidade de rodapé e identidade visual final.
- Fluxo de login, armazenamento e renovação do token, tratamento de sessão expirada e contrato de permissões do backend.
- Contrato de recuperação de senha: envio do e-mail, duração e uso único do token, tratamento de links inválidos ou expirados e política de nova senha.
- Necessidade de internacionalização.
- Formato dos mocks e contratos da futura API.

O portfólio de referência usa Tailwind v3; o setup atual do Spartan requer Tailwind v4. Reaproveitar ideias visuais e de organização, não copiar a configuração de estilos diretamente.

## Ponto de retomada

- O scaffold Angular está funcional. A compilação (`npm.cmd run build`) passou após a configuração de Tailwind e Spartan.
- O Vitest já veio no scaffold. Os cinco testes distribuídos em quatro arquivos passaram com `npm.cmd run test:unit`, incluindo navegação e validação dos formulários de autenticação. O workflow do GitHub Actions para pushes e pull requests está configurado; a execução no GitHub ainda não foi verificada nesta conversa.
- As telas de login, solicitação de recuperação e nova senha foram criadas com layout visual compartilhado e validação local. A confirmação de recuperação é apenas uma prévia: nenhum e-mail é enviado. A tela de nova senha verifica apenas a presença do parâmetro `token` e a confirmação da senha; nenhum token é validado e nenhuma senha é alterada no frontend.
- Próximos alinhamentos: detalhar o layout interno e a navegação, escolher o primeiro fluxo de negócio (encomendas ou consignações) com etapas, dados, ações e regras financeiras, e posteriormente definir os contratos de autenticação e recuperação com o backend. Nenhuma funcionalidade de negócio do CRM foi implementada ainda.
