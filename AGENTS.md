# Contexto do projeto desbravando3d-crm-front

## Objetivo

Construir o frontend de um CRM para uma empresa de impressão 3D. O sistema deve ajudar a controlar encomendas, vendas consignadas, valores recebidos e valores ainda pendentes de pagamento. O fluxo e as regras de negócio ainda serão detalhados.

## Etapas combinadas

1. Definir a estrutura e os fluxos do frontend.
2. Implementar o frontend com dados mockados, para validar telas e interações sem depender de uma API.
3. Definir e implementar o backend depois, usando os fluxos e contratos validados no frontend como referência.

Não presumir que o escopo funcional, o modelo de dados ou o contrato da API já estejam fechados. Antes de criar telas ou entidades, alinhar com o usuário os detalhes necessários de cada fluxo.

## Direção de interface e acesso

- A identidade visual ainda não está fechada. O usuário aprovou uma barra superior simples com marca e indicador de prévia; pediu para remover o título central e o menu de três pontos. O título agora pertence ao conteúdo da página. No celular, a barra oferece o botão que abre o menu lateral. A necessidade de rodapé ainda está aberta.
- O menu lateral contém Dashboard, Produtos, Insumos, Calculadora, Encomendas, Encomendas do site (apenas item futuro, desativado), Consignado, Clientes e lojas e Financeiro. Operação e Gestão são grupos expansíveis no estilo de acordeão; Dashboard permanece direto. No rodapé ficam o perfil, a escolha de tema claro/escuro e Sair. Enquanto não houver autenticação, o perfil mostra “Modo prévia” e Sair apenas retorna à entrada; não representa encerramento de sessão.
- Preferência visual do usuário: usar transições discretas e consistentes nas interações das telas futuras. Os grupos expansíveis do menu animam altura/opacidade e as páginas internas entram com uma transição curta; respeitar `prefers-reduced-motion` e não atrasar a navegação por causa de animações.
- A primeira versão prevê dois acessos individuais, para o usuário e sua esposa. O perfil inicialmente previsto é administrador; a estrutura deve permitir outros perfis e permissões no futuro sem espalhar verificações rígidas pelo código. Não fixar nomes, e-mails nem senhas no frontend.
- O backend será a autoridade para autenticação e autorização. Ele determinará as permissões do usuário por meio de token; o formato do token, suas permissões e o contrato de autenticação ainda precisam ser definidos. O frontend deverá usar essas informações para bloquear rotas e ações indisponíveis, e o backend deverá validar cada operação protegida.
- Durante a definição das telas, o usuário optou por acesso livre à prévia do CRM: o botão de entrada não exige e-mail ou senha e leva à rota `/inicio`. Isso não representa autenticação nem sessão de usuário. Reintroduzir o fluxo real quando o contrato com o backend for definido, sem presumir credenciais, perfis adicionais ou matriz de permissões.
- A recuperação de senha terá solicitação por e-mail e uma tela para definir nova senha acessada por link com token. O backend deverá conferir o e-mail, enviar o link e validar o token antes de alterar a senha. A resposta de solicitação prevista pelo usuário é HTTP 200; o contrato completo e as regras de expiração e uso do token ainda não foram definidos. A interface deve evitar revelar se um e-mail está cadastrado.
- Manter este `AGENTS.md` e o `README.md` atualizados conforme decisões e funcionalidades forem validadas. O README deve descrever o estado real do projeto, não funcionalidades apenas planejadas como se já estivessem implementadas.

## Fluxos de negócio em definição

- Produtos: o CRM precisará permitir o cadastro de produtos. O mesmo cadastro deverá servir futuramente ao e-commerce; ainda não foram definidos os campos, as variações nem quais produtos estarão disponíveis em cada canal. Não implementar um modelo definitivo sem alinhar esse compartilhamento.
- Consignação: clientes que possuem lojas encomendam produtos, que são deixados na loja para venda. O CRM deve mostrar quais produtos e quantidades estão em cada loja, quais foram vendidos e quais vendas já tiveram o valor recebido pela empresa. A entrega à loja, a venda informada e o recebimento são acontecimentos distintos; uma venda não implica pagamento automático.
- Encomendas: um usuário cadastra a solicitação inicialmente, podendo precificá-la depois e apresentar um orçamento. O cliente aceita ou recusa o orçamento. Quando aceita, é necessário acompanhar pelo menos a confirmação, a impressão, a conclusão da impressão, a entrega e o pagamento. O pagamento pode ocorrer antes da entrega. Uma encomenda deve poder reunir várias peças: peças diferentes como itens distintos; várias unidades da mesma peça podem ser representadas por um item com quantidade, desde que orçamento, produção e consumo de material continuem claros. Ainda não foi decidido se cada informação será representada por estado, data ou outro registro; evitar uma sequência rígida que force pagamento apenas no fim.
- Insumos e filamentos: o usuário quer uma tela para cadastrar o filamento disponível, pelo menos distinguindo as cores e as quantidades em gramas. Ao fatiar uma peça, ele conhece uma estimativa de consumo por cor; uma peça pode usar mais de uma cor. A encomenda deve permitir informar ou ajustar essa estimativa ao longo do cadastro e da confirmação, sem exigir que ela já exista no primeiro registro da solicitação. Para itens com várias unidades, o total previsto deve considerar a quantidade de peças. Exemplo: de 1 kg de filamento preto, o consumo de 300 g deixa 700 g físicos, se não houver outras movimentações.
- O usuário confirmou que uma encomenda ainda não confirmada não reduz o saldo de filamento. Ao confirmar, somar o consumo previsto de todas as peças e unidades por filamento cadastrado em Insumos e abater do estoque. Se faltar qualquer quantidade, impedir a confirmação até que uma compra e a correspondente entrada de filamento sejam cadastradas. Registrar a compra como gasto para o dashboard financeiro. Ainda alinhar correções por consumo real, desperdício, falha, cancelamento e eventual devolução ao estoque, além de como identificar rolos/lotes com preços distintos.
- Precificação de peças: o usuário quer salvar configurações de cálculo para reutilizá-las nos orçamentos. Para cada peça, informar o tempo estimado de impressão e uma ou mais linhas de filamento, cada uma com a quantidade prevista em gramas. O custo do material é a soma de `gramas_i × preço_por_kg_i / 1000` para todos os filamentos usados. O custo estimado de energia é `(potência_média_da_impressora_em_W / 1000) × horas_de_impressão × tarifa_em_R$/kWh`. O preço sugerido pela fórmula atual é `(custo_do_material + custo_da_energia) × (1 + percentual_de_acréscimo / 100)`. Os preços por quilo variam entre filamentos; não usar um preço global único. Ainda não foi decidido como identificar rolos/lotes de mesmo material e cor comprados por preços diferentes.
- Chamar o percentual da fórmula atual de **acréscimo sobre custos diretos (markup)** na interface e no código. Ele não é margem de lucro sobre o preço de venda. As referências iniciais informadas pelo usuário são 100% para lojas, 300% para amigos/pessoas próximas e 500% como padrão das encomendas; permitir configurar esses percentuais e escolher o aplicável ao orçamento. Com esses percentuais, os multiplicadores sobre material + energia são, respectivamente, 2, 4 e 6. Não alterar a fórmula para uma margem verdadeira sem novo alinhamento.
- O resultado da fórmula é uma sugestão de preço baseada apenas em filamento e energia. Mão de obra, manutenção/depreciação da impressora, perdas, embalagem, taxas, tributos, frete e despesas fixas não entram no cálculo descrito até agora; portanto, não apresentar a diferença como lucro líquido. Definir com o usuário se e quando esses custos serão incluídos. A potência deve representar consumo médio estimado durante a impressão, pois a potência instantânea varia. Definir arredondamento, tratamento de várias unidades/peças, validade de preços salvos e preservação dos valores usados em orçamentos já apresentados antes de implementar cálculos definitivos.
- A rota **Calculadora** (`/calculadora`) e seu item no menu permanecem, mas a tela foi limpa a pedido do usuário e contém apenas o título. Reconstruir a interface passo a passo conforme ele orientar. As ideias de cadastro de margens, configuração de tarifa e potência e simulação genérica descritas nesta seção são requisitos em discussão, não funcionalidades implementadas. No orçamento real, filamentos e preços virão do cadastro de Insumos, e gramas e tempo serão informados depois do fatiamento da peça.
- Histórico de ações: como haverá inicialmente dois usuários, o usuário quer identificar quem realizou cada ação relevante nas encomendas e demais operações. Definir quais eventos entram no histórico, o nível de detalhe e a forma de exibição antes da implementação. Não confundir histórico de alterações com o estado atual do pedido.
- Auditoria proposta pelo usuário: todo registro alterável terá `userCreateId`, `userUpdateId` e uma string `log` com o resumo do evento mais recente. Na criação, `log` descreve a criação; a cada atualização, recebe o resumo novo. O histórico completo deve ficar em uma tabela de eventos separada, preservando todos os eventos desde a criação, com autor e data. A tela `/log` já existe como prévia com eventos mockados, pesquisa textual nos dados dos eventos (inclusive valores anteriores e novos) e período obrigatório; inicia com os últimos 30 dias. Ainda alinhar a abrangência definitiva da pesquisa, o período inicial, exclusões e o formato dos detalhes antes de criar entidades definitivas. Como a prévia não autentica usuários e ainda não há cadastros funcionais, não atribuir IDs reais nem apresentar eventos mockados como auditoria verdadeira.
- Dashboard: a intenção é acompanhar gráficos de encomendas, vendas e arrecadação, distinguindo consignação, vendas em feiras e encomendas do dia a dia. Entre as origens mencionadas estão colegas de trabalho, Instagram e feiras. O usuário também quer uma tabela financeira de ganhos, gastos e lucro líquido; compras de filamento devem aparecer como gastos. Definir períodos e se o resultado será pelo caixa (recebimentos menos pagamentos) ou por competência/custo do material consumido antes de chamar o número de lucro líquido, pois a compra pode permanecer em estoque e o cliente pode pagar antes ou depois da entrega.
- Alinhar como registrar entregas, quantidades, vendas, devoluções, repasses, pagamentos parciais e correções antes de definir entidades, estados ou cálculos da consignação.

## Integração futura com e-commerce

- A intenção é ter dois frontends (CRM e e-commerce), duas APIs e um banco de dados compartilhado. O foco atual é o CRM; o e-commerce ainda não será implementado nesta etapa.
- O cadastro de produtos será utilizado pelos dois sistemas. Documentar essa necessidade ao desenhar o fluxo e os contratos, sem presumir agora que as duas APIs terão os mesmos endpoints ou que o frontend acessará o banco diretamente.
- A definição de propriedade dos dados, sincronização, segurança e contratos entre as APIs fica para a etapa de backend. O frontend deve manter mocks substituíveis para os fluxos validados.

## Tecnologia e decisões atuais

- A aplicação `desbravando3d-crm-front` foi criada com Angular 22.2, compatível com o Node instalado na máquina (`v22.23.3`).
- O projeto usa componentes standalone, sem `app.module.ts`, e Angular Router. As rotas `/login`, `/recuperar-senha` e `/redefinir-senha` usam um layout de autenticação compartilhado em `src/app/features/auth/auth-layout/`.
- O scaffold usa CSS e não inclui SSR nem geração estática. Tailwind CSS v4 está instalado e configurado via PostCSS em `.postcssrc.json` e `src/styles.css`.
- Spartan está instalado com `@spartan-ng/cli` e `@spartan-ng/brain`; o tema `neutral` foi inicializado em `src/styles.css`. O Sidebar e o Collapsible Helm foram gerados em `libs/ui/`, junto com componentes de apoio (Button, Input, Separator, Sheet, Skeleton, Tooltip e Utils). O destino e o estilo `vega` do gerador estão definidos em `components.json`. O menu interno usa o Sidebar com grupos expansíveis via Collapsible; o conteúdo Helm do Collapsible foi personalizado para transição de altura/opacidade. Os componentes Helm copiados pertencem ao projeto e podem ser personalizados.
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
      produtos/            # cadastro compartilhável com o e-commerce futuro
      insumos/             # filamentos e controle de estoque, após definição do fluxo
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
  ui/                       # componentes Helm gerados pelo Spartan
```

Dentro de cada feature, manter juntos seus componentes, modelos, serviços, estado e mocks. Separar dados mockados atrás de contratos claros para facilitar a futura troca pela API. Preferir rotas carregadas sob demanda quando as páginas forem criadas. Manter o código copiado do Spartan em seu destino configurado, separado dos componentes de negócio.

## Pontos ainda em aberto

- Telas e navegação de produtos, encomendas, consignações, histórico e dashboard; detalhes de cada etapa e ação.
- Campos do cadastro de produtos e como o e-commerce reutilizará esses dados.
- Campos e unidades do cadastro de filamentos e outros insumos; decidir se o estoque será agrupado por material e cor ou controlado por rolo, além de eventual variação por marca, tonalidade e lote.
- Tratamento após a baixa na confirmação: consumo real versus estimado, desperdícios, falhas, ajustes, cancelamentos e devolução ao estoque; escolha de rolo/lote quando houver preços distintos.
- Forma de registrar o consumo por cor em cada peça e o total de uma encomenda com múltiplos itens ou unidades.
- Representação de orçamento, aceite/recusa, impressão, entrega e pagamento das encomendas, incluindo pagamentos antecipados.
- Escopo do histórico de ações: eventos, autor, data, alterações registradas e visualização.
- Categorias de origem das vendas/encomendas e regras dos gráficos e indicadores.
- Regras de cobrança, pagamentos parciais, saldos e relatórios.
- Configuração da precificação: uma ou várias impressoras, tarifa elétrica, cadastro do preço por kg de cada filamento, escolha do percentual por orçamento, custos adicionais, arredondamento e histórico dos valores usados nos orçamentos. Definir persistência compartilhada entre usuários quando houver backend; dados apenas no navegador não são compartilhados entre dispositivos.
- Entidades, campos e relacionamentos do domínio.
- Conteúdo da barra superior, itens do menu lateral, necessidade de rodapé e identidade visual final.
- Fluxo de login, armazenamento e renovação do token, tratamento de sessão expirada e contrato de permissões do backend.
- Contrato de recuperação de senha: envio do e-mail, duração e uso único do token, tratamento de links inválidos ou expirados e política de nova senha.
- Necessidade de internacionalização.
- Formato dos mocks e contratos da futura API.

O portfólio de referência usa Tailwind v3; o setup atual do Spartan requer Tailwind v4. Reaproveitar ideias visuais e de organização, não copiar a configuração de estilos diretamente.

## Ponto de retomada

- O scaffold Angular está funcional. A compilação (`npm.cmd run build`) passou após a configuração de Tailwind e Spartan.
- O Vitest já veio no scaffold. Os sete testes distribuídos em cinco arquivos passaram com `npm.cmd run test:unit`, incluindo navegação, grupos expansíveis, troca de tema e validação dos formulários de recuperação. O workflow do GitHub Actions para pushes e pull requests está configurado; a execução no GitHub ainda não foi verificada nesta conversa.
- A entrada oferece acesso livre à rota `/inicio`, sem e-mail ou senha. A área interna agora tem barra superior e menu lateral responsivo, tema claro/escuro salvo localmente e páginas provisórias para os itens ativos; não há telas de negócio, autenticação ou sessão. “Encomendas do site” aparece desativado como item futuro. As telas de recuperação e nova senha permanecem como prévia: nenhum e-mail é enviado, nenhum token é validado e nenhuma senha é alterada no frontend.
- A rota `/log` foi adicionada como prévia da auditoria. Ela usa eventos fictícios, pesquisa textual nos campos do evento e filtro obrigatório de período, inicialmente nos últimos 30 dias. Não existe gravação de logs reais nem IDs de usuários nesta etapa.
- O usuário descreveu uma primeira visão para produtos, insumos/filamentos, consignação, encomendas com várias peças, histórico de ações e dashboard. Também detalhou a fórmula inicial de precificação, registrada acima. A tela da Calculadora foi limpa para ser reconstruída passo a passo; nenhuma funcionalidade de negócio está ativa nela.
- Próximo passo: aguardar a orientação do usuário para o primeiro elemento da Calculadora. Depois, detalhar o cadastro, compra e estoque dos filamentos por rolo/lote; ligar a seleção de Insumos e o fatiamento ao orçamento e à confirmação da encomenda; definir o cálculo financeiro do dashboard e como preservar os valores usados em cada orçamento.
