# Desbravando 3D CRM — Frontend

Frontend de um CRM para uma empresa de impressão 3D. O objetivo é acompanhar encomendas, vendas consignadas, valores recebidos e valores pendentes. Os fluxos e as regras de negócio ainda estão em definição.

## Estado atual

Os controles comuns das telas existentes usam Spartan Helm: Button e Input em Produtos, Insumos, Precificação, Log e telas de acesso; Dialog nas modais de Produtos, Insumos e histórico de energia; Table nas tabelas; Toggle Group nas escolhas de visualização/operação; Radio Group nas opções da peça; Textarea na descrição e Checkbox nas medidas personalizadas. O conteúdo visual dos cartões e a galeria/lupa continuam específicos de Produtos.

O projeto contém a base Angular, as telas de acesso e prévias funcionais com dados de exemplo para validar os fluxos. Ainda não há autenticação real nem backend.

- Angular 22 com componentes standalone e Angular Router.
- CSS com Tailwind CSS v4 e tema `neutral` do Spartan. O menu lateral usa o Sidebar Helm gerado em `libs/ui/sidebar`, com os componentes de apoio do Spartan em `libs/ui/`.
- Vitest configurado com testes de navegação e validação dos formulários, organizados por tela. O workflow em `.github/workflows/unit-tests.yml` executa todos os testes em pushes e pull requests.
- Entrada, recuperação de senha e nova senha com um layout compartilhado, usando a logo em `public/brand/logo.jpg`.
- A entrada da prévia é livre: um botão abre `/inicio` sem pedir e-mail ou senha. A área interna tem barra superior, menu lateral responsivo e páginas provisórias, incluindo a rota de Precificação.
- O menu contém Dashboard, Produtos, Insumos, Precificação, Encomendas, Consignado, Clientes e lojas, Financeiro e Log. Operação e Gestão são grupos expansíveis com transição; “Encomendas do site” aparece desativado, marcado como futuro. O rodapé mostra “Modo prévia”, permite escolher tema claro ou escuro (preferência local) e oferece Sair, que apenas retorna à entrada. Sidebar e Collapsible Helm do Spartan controlam a navegação e os grupos expansíveis.
- As páginas internas entram com uma transição curta. A interface respeita a preferência do sistema por movimento reduzido; transições discretas serão consideradas também nas próximas telas.
- A recuperação mostra uma confirmação de prévia sem enviar e-mail; a nova senha não valida o token nem altera a senha.
- A rota Precificação contém o cadastro de margens de lucro, o cadastro conjunto de tarifa de energia e potência média da impressora e uma calculadora avulsa de preço de uma peça. Ela mostra o último cadastro de energia e permite consultar o histórico em uma modal com transição discreta de entrada. Os cadastros são salvos somente neste navegador para validar a interface; a simulação usa apenas os números digitados nela.
- Sem backend, contas cadastradas ou autenticação real nesta etapa.

## Direção do produto

A interface usa uma barra superior com marca e indicador de prévia; no celular, ela também abre o menu lateral. Os títulos ficam no conteúdo de cada página. O menu e seu rodapé foram definidos para a prévia, enquanto a identidade visual final ainda pode evoluir.

A primeira versão prevê dois acessos individuais, para o usuário e sua esposa. Enquanto as telas são desenhadas, o acesso à prévia está livre e não identifica um usuário. O perfil inicialmente previsto é administrador, com uma estrutura preparada para outros perfis e permissões. O backend será responsável por determinar e validar o acesso por meio de token. O frontend usará as permissões recebidas para restringir rotas e ações. O formato do token e o contrato de autenticação ainda não foram definidos.

Depois da conclusão do backend, está planejada a entrada com conta Google e a criação de perfis de acesso. O fluxo de associação de contas, os perfis e as permissões ainda serão definidos. Nenhuma dessas funcionalidades está disponível na prévia atual.

O fluxo planejado de recuperação solicita o e-mail e mostra uma resposta genérica. O link recebido por e-mail deverá levar à tela de nova senha com um token, que será validado pelo backend antes de qualquer alteração. Nesta fase, as telas servem para validar a interface; não há envio de e-mail nem redefinição real de senha.

O CRM deverá incluir um cadastro de produtos que também será aproveitado pelo e-commerce futuro. A arquitetura pretendida tem dois frontends, duas APIs e um banco de dados compartilhado. Nesta etapa, o trabalho está concentrado no frontend do CRM; os contratos e a divisão de responsabilidades entre as APIs ainda não foram definidos.

Na consignação, clientes com lojas encomendam produtos que ficam nas lojas para venda. O controle desejado é saber quais produtos e quantidades estão em cada loja, quais foram vendidos e quais valores já foram recebidos. Entrega à loja, venda e recebimento devem ser registrados separadamente.

### Auditoria planejada

O usuário definiu que os registros alteráveis deverão guardar `userCreateId`, `userUpdateId` e uma string `log` com a descrição da alteração mais recente. Na criação, essa descrição indicará a criação; cada atualização a substituirá. Uma tabela de histórico separada deverá preservar todos os eventos, com autor e data, da criação em diante. A tela `/log` usa eventos de exemplo para validar a busca textual em todos os dados do evento, inclusive valores anteriores e novos, e exige um período válido. Ela abre com os últimos 30 dias selecionados. O período inicial, a abrangência exata da busca e os detalhes dos eventos ainda podem ser ajustados. A prévia não registra alterações reais nem identifica usuários.

Nas encomendas, a solicitação pode ser cadastrada antes de ter preço. Depois vem a precificação e o orçamento, seguido da resposta do cliente. Para encomendas aceitas, o acompanhamento deve mostrar confirmação, andamento da impressão, conclusão, entrega e pagamento. O cliente pode pagar antes de receber. Como haverá inicialmente dois usuários, também é desejado um histórico que mostre quem realizou as ações relevantes. A representação desses acontecimentos e o conteúdo do histórico ainda serão definidos.

Uma encomenda poderá reunir várias peças. A direção inicial é registrar peças diferentes como itens da mesma encomenda e permitir quantidade maior que um para peças iguais. O usuário também quer cadastrar filamentos e acompanhar o estoque por cor, em gramas. Após fatiar cada peça, poderá informar a estimativa de filamento de uma ou mais cores; a estimativa pode ser preenchida ou ajustada durante o cadastro e a confirmação da encomenda. Ainda serão definidas as regras para registrar o consumo real na impressão, repor estoque e corrigir desperdícios ou cancelamentos. A tela de Insumos já permite cadastro e atualização manual do saldo como prévia; consumo e confirmação de encomendas ainda não estão implementados.

Uma solicitação de encomenda ainda não confirmada não deve reduzir o saldo de filamento. Na confirmação, o consumo previsto de cada peça e unidade será abatido do estoque do filamento selecionado em Insumos. Se o saldo for insuficiente, será necessário comprar e registrar mais filamento antes de confirmar. A compra também deverá aparecer como gasto no dashboard. O usuário optou por agrupar o estoque por material e cor, sem controle por rolo/lote, com preço por kg editável. A tela de Insumos permite cadastrar, adicionar quantidades e corrigir o saldo total em memória. A entrada de estoque ainda não registra uma compra financeira. Integração com encomendas, desperdícios, falhas de impressão e cancelamentos continuam pendentes.

### Precificação planejada

O orçamento de cada peça deverá aceitar vários filamentos, com gramas e preço por quilo próprios, além do tempo estimado de impressão. O custo do material será a soma de `gramas × preço_por_kg / 1000` de cada filamento. A energia estimada será `(potência média em W / 1000) × horas × tarifa em R$/kWh`. O preço sugerido será `(material + energia) × (1 + acréscimo percentual / 100)`.

Os percentuais iniciais informados são 100% para lojas, 300% para amigos e pessoas próximas e 500% para encomendas em geral. Esse percentual é um **acréscimo sobre o custo direto (markup)**, não uma margem de lucro sobre o preço de venda: equivale a multiplicar material + energia por 2, 4 ou 6. O cálculo ainda não inclui mão de obra, manutenção, perdas, embalagem, taxas, tributos, frete e despesas fixas; o valor acima do custo direto não representa lucro líquido.

A tela `/precificacao` permite cadastrar e editar margens de lucro com nome e porcentagem. Também permite registrar, em cada lançamento, a tarifa de energia em R$/kWh e a potência média da impressora em W, com data e hora; mostra apenas o lançamento mais recente e oferece uma modal para consultar o histórico. A calculadora avulsa usa seis números digitados na hora, sem ler esses cadastros: preço do filamento por kg, gramas, horas, potência média, tarifa e margem de lucro informada. A fórmula aplica essa margem como acréscimo sobre custos diretos (markup). Exibe os custos de material e energia, o custo direto total e o preço sugerido para uma peça. Ainda não há vínculo com orçamentos. A rota antiga `/calculadora` redireciona para `/precificacao`. No orçamento real, os filamentos e seus preços deverão vir de Insumos; gramas e tempo serão informados depois de fatiar a peça.

Insumos usa um preço atual editável por material e cor, sem preços separados por rolo/lote. Ainda serão definidos a quantidade de impressoras, outros custos, arredondamento e como preservar preços de orçamentos já apresentados. O preço do filamento deverá vir futuramente do cadastro de Insumos.

O dashboard pretendido reunirá gráficos de encomendas, vendas e arrecadação, incluindo consignação, vendas em feiras e encomendas do dia a dia. Colegas de trabalho, Instagram e feiras são exemplos de origem de encomendas mencionados até agora. Também deverá mostrar ganhos, gastos (incluindo compra de filamento) e resultado financeiro. A regra para apresentar **lucro líquido** ainda precisa distinguir compras que permanecem em estoque, material consumido e pagamentos recebidos em outro período. Indicadores, períodos, filtros e cálculos ainda serão alinhados.

## Telas disponíveis

No formulário de Produtos, o envio de imagens usa botões com ícone e destaque visual para escolher/trocar a principal e adicionar imagens à galeria, com formatos e limites indicados abaixo.

A modal de Produtos possui imagem principal e grade de miniaturas selecionáveis. A lupa amplia 2,5 vezes a região sob o mouse e restaura a imagem ao sair; pode ser desativada pelo botão. Em telas de toque, use o botão para ampliar o centro. Imagem principal, galeria e posições individuais podem ser nulas, exibindo “Sem imagem”; arquivos indisponíveis recebem indicação própria. Cadastro e edição permitem adicionar a principal e várias imagens adicionais opcionais, além de remover imagens individualmente (JPG, PNG ou WebP, até 5 MB cada). A capa dos cartões e da tabela permanece sendo a principal. As imagens e alterações ficam apenas na memória desta visita.

- `/login`: botão de acesso livre à prévia do CRM.
- `/inicio`: prévia do Dashboard.
- `/precificacao`: cadastros de prévia das margens de lucro e dos valores de energia e impressora, histórico local em modal e calculadora avulsa de preço (`/calculadora` redireciona para esta rota).
- `/log`: prévia do histórico de alterações com dados de exemplo, busca textual e filtro obrigatório por período.
- `/produtos`: catálogo de prévia com cartões e tabela, pesquisa por nome e modal de detalhes, cadastro e edição. Campos: nome, descrição, imagens opcionais e tamanhos com nome, altura/largura/profundidade em cm e preço de venda manual por peça em R$. Na modal, cada opção mostra peso em gramas, preço e medidas (altura × largura × profundidade em cm), com destaque para a opção selecionada. A grade aceita mais de três opções; o vaso tem quatro exemplos. Peso ausente aparece como “Peso não informado”. O peso aparece apenas na consulta nesta etapa; o formulário de cadastro/edição ainda será revisto. Cartões e tabela mostram o menor preço com “A partir de” para várias opções. Permite indicar medidas personalizadas sob orçamento. Tamanhos podem ser adicionados, editados e removidos; cada opção cadastrada exige nome e medidas/preço maiores que zero. Produtos sem tamanhos mostram “Sob orçamento” se personalizados estiverem habilitados ou “Preço não informado”. Inclui três exemplos ilustrados. Alterações ficam em memória durante a visita e são reiniciadas ao recarregar; não há integração com backend, estoque, Precificação, orçamentos ou auditoria real.
- `/insumos`: tabela e pesquisa de filamentos por nome, material ou cor. Cadastro com nome, material, cor, saldo inicial em gramas e preço por kg. Um cadastro por material/cor, sem separação por rolo. Na edição, “Adicionar entrada” soma a quantidade comprada ao saldo atual; “Corrigir saldo total” substitui diretamente o saldo, inclusive por zero. Mostra o saldo atual e a prévia do resultado. O preço por kg é editável e substitui o anterior, sem média ponderada. Saldo com até duas casas decimais; preço maior que zero com duas casas. Há três exemplos fictícios; dados apenas em memória durante a visita, sem banco, auditoria real, integração financeira ou baixa por encomenda.
- `/encomendas`: kanban de seis colunas coloridas, com contagem, rolagem horizontal e pesquisa por número/cliente. Solicitações e Em orçamento representam a mesma etapa: sem valor o cartão fica em Solicitações; com valor fica em Em orçamento. A modal permite salvar/remover o orçamento antes da confirmação. As etapas seguintes avançam pelos botões da modal: confirmar, iniciar impressão, marcar como pronta e marcar como entregue. Confirmação exige valor e estimativa de filamento e permanece bloqueada quando a estimativa está ausente; seu preenchimento e a baixa de estoque ainda estão pendentes. Os exemplos já confirmados podem avançar em produção/entrega, sem exigir pagamento. Cartões sem imagens mostram itens, peças, valor e pagamento separado da etapa. Há dez registros fictícios; alterações apenas em memória, sem cadastro geral, movimentação por arrastar cartões, financeiro, auditoria ou backend.
- `/consignado`, `/clientes-lojas` e `/financeiro`: páginas provisórias de navegação, ainda sem funcionalidades de negócio.
- `/recuperar-senha`: formulário de e-mail e confirmação de prévia.
- `/redefinir-senha?token=...`: formulário de nova senha. Sem o parâmetro `token`, a tela orienta a solicitar outro link. A presença do parâmetro não significa que o token seja válido.

## Plano de desenvolvimento

### Padrão de componentes: priorizar Spartan

Para novas telas e alterações, a ordem obrigatória é **reutilizar Spartan → gerar o componente oficial que faltar → compor/personalizar Spartan → criar componente próprio apenas quando necessário**. Conferir a versão instalada, `libs/ui/` e o gerador antes de concluir que um controle não existe. Não duplicar os estilos e estados que o Helm já entrega nem criar wrappers sem responsabilidade adicional.

- `libs/ui/`: componentes Spartan Helm gerados e suas personalizações.
- `src/app/shared/components/<nome>/`: pasta padrão para componentes próprios realmente reutilizáveis. O [guia da pasta](src/app/shared/components/README.md) descreve os critérios.
- `src/app/features/<feature>/components/<nome>/`: componentes próprios específicos de um fluxo, nas próximas extrações. Páginas, layouts e componentes existentes podem manter sua organização até uma refatoração necessária.

Modais novas devem usar Dialog Spartan. Galeria com miniaturas e lupa localizada continuam próprias porque exigem comportamento específico; Carousel só será necessário se adicionarmos navegação por deslizamento ou setas. Manter acessibilidade, tema e movimento reduzido ao compor componentes. O procedimento completo está no [AGENTS.md](AGENTS.md); não é uma skill instalada separadamente.

### Migração para Spartan realizada

| Local | Simplificação indicada | Situação |
| --- | --- | --- |
| Precificação e Log | Input Helm nos 13 campos que repetiam estilos e Button Helm nas ações de Precificação | Concluído |
| Modais de Produtos e histórico de energia | Dialog Helm com conteúdo em overlay; removidos `showModal`, `ElementRef` e animações próprias | Concluído |
| Cartões/Tabela e opções da peça | Toggle Group e Radio Group com seleção por toda a opção e peso, preço e medidas preservados | Concluído |
| Tabelas, descrição e medidas personalizadas | Table, Textarea e Checkbox Helm | Concluído |
| Auth | Button e Input Helm, com ajustes visuais de acesso em CSS compartilhado e validações preservadas | Concluído |
| Pesquisa, datas e moeda | Funções comuns em `src/app/shared/utils/presentation.ts`, com formatadores reutilizados e precisões distintas | Concluído |

A migração usa componentes gerados pela versão instalada do CLI, no estilo `vega`, sem novas dependências de runtime. O menu continua usando Sidebar e Collapsible. Os overlays usam `provideSpartanHlm()`; estilos globais respeitam movimento reduzido nos controles e overlays. Testes verificam abertura/fechamento, título acessível, foco, Escape e clique no fundo, além dos cadastros, cálculos e seleções existentes. A regra de precificação continua isolada em `print-calculation.ts`; dados, validações e persistência das features foram preservados.

O kanban de Encomendas compõe Card (gerado em `libs/ui/card`), Button, Input e Dialog Spartan. Apenas o layout do quadro e suas cores/rolagem são próprios da feature: o CLI instalado não possui Kanban pronto. Não foi adicionada biblioteca de arrastar cartões; a progressão ocorre nos botões da modal. Cadastro geral, recusas/cancelamentos e confirmação com baixa de estoque ainda precisam ser concluídos.

Para navegar pelo kanban, arraste horizontalmente com o botão esquerdo do mouse, inclusive a partir de um cartão, ou use o toque/rolagem horizontal nativa. Arrastar não abre detalhes nem move encomendas entre etapas; o clique normal continua abrindo a modal. As colunas têm altura limitada e rolagem vertical independente dos cartões, com o cabeçalho sempre visível. O quadro e as regiões de cada coluna podem receber foco para navegação pelo teclado.

A altura do quadro acompanha o espaço livre após o título e os filtros, recalculando ao redimensionar a janela ou mudar o tamanho desse conteúdo. A roda sobre um cartão rola sua coluna; o cabeçalho fica fora da região rolável. Há um mínimo de altura útil para janelas muito baixas. A rolagem independente foi verificada em Chrome headless, com cartões reais da prévia, além dos testes unitários.

Está planejado permitir que uma medida nova solicitada em uma encomenda seja adicionada às opções do produto para reutilização. Esse fluxo ainda não está implementado; momento do cadastro, preenchimento de peso/preço e interação com a edição do produto serão definidos depois. O trabalho atual está concentrado na modal de consulta.

1. Validar as telas de autenticação e definir o contrato de login, recuperação e permissões com o backend.
2. Definir as telas e os fluxos de produtos, insumos, precificação/orçamentos, encomendas, consignações, pagamentos, histórico e dashboard, incluindo dados, consumo de material e regras financeiras.
3. Implementar o frontend com dados mockados para validar telas e interações.
4. Definir e implementar o backend com base nos fluxos e contratos validados.

As pastas de funcionalidades serão criadas conforme os fluxos forem definidos. A direção de organização está documentada em `AGENTS.md`.

## Executar localmente

Requisito: Node.js compatível com Angular 22 (o ambiente usado no projeto tem Node `v22.23.3`). Na raiz deste repositório:

```powershell
npm.cmd ci
npm.cmd start
```

Abra `http://localhost:4200/`. Se `npm.cmd` não for encontrado no PowerShell, use o caminho completo do executável da instalação ativa do Node.

## Verificações

A aplicação foi validada com a compilação de produção e 47 testes em 17 arquivos, incluindo cadastro de filamentos, entradas, correção de saldo, atualização de preço e prevenção de duplicação, além do kanban, pesquisa, detalhes e separação de pagamento/etapa de Encomendas. Além dos fluxos existentes, os testes verificam fechamento de modais por Escape/fundo, restauração do foco, seleção pela área da opção e precisões dos formatadores compartilhados.

```powershell
npm.cmd run build
npm.cmd run test:unit
```

`test:unit` executa os testes uma vez, sem modo de observação. `src/app/app.spec.ts` cobre a aplicação e o redirecionamento inicial. Os testes da entrada e do layout cobrem o acesso à prévia, a navegação e a troca de tema; recuperação e redefinição de senha têm arquivos `*.spec.ts` nas respectivas pastas. O comando encontra e executa todos eles; os próximos testes ficarão junto das funcionalidades que verificam.
