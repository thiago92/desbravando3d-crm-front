# Desbravando 3D CRM — Frontend

Frontend de um CRM para uma empresa de impressão 3D. O objetivo é acompanhar encomendas, vendas consignadas, valores recebidos e valores pendentes. Os fluxos e as regras de negócio ainda estão em definição.

## Estado atual

O projeto contém a base Angular e as telas de acesso da prévia. Ainda não há autenticação real nem funcionalidades de negócio ativas.

- Angular 22 com componentes standalone e Angular Router.
- CSS com Tailwind CSS v4 e tema `neutral` do Spartan. O menu lateral usa o Sidebar Helm gerado em `libs/ui/sidebar`, com os componentes de apoio do Spartan em `libs/ui/`.
- Vitest configurado com testes de navegação e validação dos formulários, organizados por tela. O workflow em `.github/workflows/unit-tests.yml` executa todos os testes em pushes e pull requests.
- Entrada, recuperação de senha e nova senha com um layout compartilhado, usando a logo em `public/brand/logo.jpg`.
- A entrada da prévia é livre: um botão abre `/inicio` sem pedir e-mail ou senha. A área interna tem barra superior, menu lateral responsivo e páginas provisórias, incluindo a rota da Calculadora.
- O menu contém Dashboard, Produtos, Insumos, Calculadora, Encomendas, Consignado, Clientes e lojas e Financeiro. Operação e Gestão são grupos expansíveis com transição; “Encomendas do site” aparece desativado, marcado como futuro. O rodapé mostra “Modo prévia”, permite escolher tema claro ou escuro (preferência local) e oferece Sair, que apenas retorna à entrada. Sidebar e Collapsible Helm do Spartan controlam a navegação e os grupos expansíveis.
- As páginas internas entram com uma transição curta. A interface respeita a preferência do sistema por movimento reduzido; transições discretas serão consideradas também nas próximas telas.
- A recuperação mostra uma confirmação de prévia sem enviar e-mail; a nova senha não valida o token nem altera a senha.
- A rota Calculadora permanece no menu, mas sua tela contém apenas o título; será reconstruída passo a passo com o usuário.
- Sem backend, contas cadastradas ou autenticação real nesta etapa.

## Direção do produto

A interface usa uma barra superior com marca e indicador de prévia; no celular, ela também abre o menu lateral. Os títulos ficam no conteúdo de cada página. O menu e seu rodapé foram definidos para a prévia, enquanto a identidade visual final ainda pode evoluir.

A primeira versão prevê dois acessos individuais, para o usuário e sua esposa. Enquanto as telas são desenhadas, o acesso à prévia está livre e não identifica um usuário. O perfil inicialmente previsto é administrador, com uma estrutura preparada para outros perfis e permissões. O backend será responsável por determinar e validar o acesso por meio de token. O frontend usará as permissões recebidas para restringir rotas e ações. O formato do token e o contrato de autenticação ainda não foram definidos.

O fluxo planejado de recuperação solicita o e-mail e mostra uma resposta genérica. O link recebido por e-mail deverá levar à tela de nova senha com um token, que será validado pelo backend antes de qualquer alteração. Nesta fase, as telas servem para validar a interface; não há envio de e-mail nem redefinição real de senha.

O CRM deverá incluir um cadastro de produtos que também será aproveitado pelo e-commerce futuro. A arquitetura pretendida tem dois frontends, duas APIs e um banco de dados compartilhado. Nesta etapa, o trabalho está concentrado no frontend do CRM; os contratos e a divisão de responsabilidades entre as APIs ainda não foram definidos.

Na consignação, clientes com lojas encomendam produtos que ficam nas lojas para venda. O controle desejado é saber quais produtos e quantidades estão em cada loja, quais foram vendidos e quais valores já foram recebidos. Entrega à loja, venda e recebimento devem ser registrados separadamente.

Nas encomendas, a solicitação pode ser cadastrada antes de ter preço. Depois vem a precificação e o orçamento, seguido da resposta do cliente. Para encomendas aceitas, o acompanhamento deve mostrar confirmação, andamento da impressão, conclusão, entrega e pagamento. O cliente pode pagar antes de receber. Como haverá inicialmente dois usuários, também é desejado um histórico que mostre quem realizou as ações relevantes. A representação desses acontecimentos e o conteúdo do histórico ainda serão definidos.

Uma encomenda poderá reunir várias peças. A direção inicial é registrar peças diferentes como itens da mesma encomenda e permitir quantidade maior que um para peças iguais. O usuário também quer cadastrar filamentos e acompanhar o estoque por cor, em gramas. Após fatiar cada peça, poderá informar a estimativa de filamento de uma ou mais cores; a estimativa pode ser preenchida ou ajustada durante o cadastro e a confirmação da encomenda. Ainda serão definidas as regras para registrar o consumo real na impressão, repor estoque e corrigir desperdícios ou cancelamentos. Nenhuma dessas telas ou regras de estoque está implementada.

Uma solicitação de encomenda ainda não confirmada não deve reduzir o saldo de filamento. Na confirmação, o consumo previsto de cada peça e unidade será abatido do estoque do filamento selecionado em Insumos. Se o saldo for insuficiente, será necessário comprar e registrar mais filamento antes de confirmar. A compra também deverá aparecer como gasto no dashboard. Ainda serão definidos o controle por rolo/lote, ajustes, desperdícios, falhas de impressão e cancelamentos. O item Insumos já aparece no menu, mas sua página é provisória; ainda não permite cadastrar filamentos.

### Precificação planejada

O orçamento de cada peça deverá aceitar vários filamentos, com gramas e preço por quilo próprios, além do tempo estimado de impressão. O custo do material será a soma de `gramas × preço_por_kg / 1000` de cada filamento. A energia estimada será `(potência média em W / 1000) × horas × tarifa em R$/kWh`. O preço sugerido será `(material + energia) × (1 + acréscimo percentual / 100)`.

Os percentuais iniciais informados são 100% para lojas, 300% para amigos e pessoas próximas e 500% para encomendas em geral. Esse percentual é um **acréscimo sobre o custo direto (markup)**, não uma margem de lucro sobre o preço de venda: equivale a multiplicar material + energia por 2, 4 ou 6. O cálculo ainda não inclui mão de obra, manutenção, perdas, embalagem, taxas, tributos, frete e despesas fixas; o valor acima do custo direto não representa lucro líquido.

A tela `/calculadora` foi limpa a pedido do usuário e atualmente mostra apenas o título. O cadastro de margens, a configuração de energia e impressora e um possível simulador ainda serão definidos e construídos passo a passo. No orçamento real, os filamentos e seus preços deverão vir de Insumos; gramas e tempo serão informados depois de fatiar a peça.

Ainda serão definidos o controle de rolos/lotes com preços distintos, a quantidade de impressoras, outros custos, arredondamento e como preservar orçamentos já apresentados. O preço do filamento deverá vir futuramente do cadastro de Insumos.

O dashboard pretendido reunirá gráficos de encomendas, vendas e arrecadação, incluindo consignação, vendas em feiras e encomendas do dia a dia. Colegas de trabalho, Instagram e feiras são exemplos de origem de encomendas mencionados até agora. Também deverá mostrar ganhos, gastos (incluindo compra de filamento) e resultado financeiro. A regra para apresentar **lucro líquido** ainda precisa distinguir compras que permanecem em estoque, material consumido e pagamentos recebidos em outro período. Indicadores, períodos, filtros e cálculos ainda serão alinhados.

## Telas disponíveis

- `/login`: botão de acesso livre à prévia do CRM.
- `/inicio`: prévia do Dashboard.
- `/calculadora`: página vazia com título, aguardando definição passo a passo.
- `/produtos`, `/insumos`, `/encomendas`, `/consignado`, `/clientes-lojas` e `/financeiro`: páginas provisórias de navegação, ainda sem funcionalidades de negócio.
- `/recuperar-senha`: formulário de e-mail e confirmação de prévia.
- `/redefinir-senha?token=...`: formulário de nova senha. Sem o parâmetro `token`, a tela orienta a solicitar outro link. A presença do parâmetro não significa que o token seja válido.

## Plano de desenvolvimento

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

```powershell
npm.cmd run build
npm.cmd run test:unit
```

`test:unit` executa os testes uma vez, sem modo de observação. `src/app/app.spec.ts` cobre a aplicação e o redirecionamento inicial. Os testes da entrada e do layout cobrem o acesso à prévia, a navegação e a troca de tema; recuperação e redefinição de senha têm arquivos `*.spec.ts` nas respectivas pastas. O comando encontra e executa todos eles; os próximos testes ficarão junto das funcionalidades que verificam.
