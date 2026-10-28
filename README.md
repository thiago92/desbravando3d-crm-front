# Desbravando 3D CRM — Frontend

Frontend de um CRM para uma empresa de impressão 3D. O objetivo é acompanhar encomendas, vendas consignadas, valores recebidos e valores pendentes. Os fluxos e as regras de negócio ainda estão em definição.

## Estado atual

O projeto contém a base Angular e as primeiras telas de autenticação. Ainda não há autenticação real nem funcionalidades de negócio do CRM.

- Angular 22 com componentes standalone e Angular Router.
- CSS com Tailwind CSS v4 e tema `neutral` do Spartan. `@spartan-ng/brain` e o CLI do Spartan estão instalados; nenhum componente Helm foi gerado ainda.
- Vitest configurado com testes de navegação e validação dos formulários, organizados por tela. O workflow em `.github/workflows/unit-tests.yml` executa todos os testes em pushes e pull requests.
- Telas de login, recuperação de senha e nova senha com um layout compartilhado, usando a logo em `public/brand/logo.jpg`.
- Formulários com validação local. A recuperação mostra uma confirmação de prévia sem enviar e-mail; a nova senha não valida o token nem altera a senha.
- Sem backend, contas cadastradas, autenticação real ou rotas de negócio nesta etapa.

## Direção do produto

A interface deve ser limpa. A proposta inicial é usar uma barra superior com informações relevantes, menu lateral para navegação e, se fizer sentido após validação, um rodapé. O conteúdo dessas áreas e a identidade visual ainda serão definidos.

A primeira versão prevê dois acessos individuais, para o usuário e sua esposa. O perfil inicialmente previsto é administrador, com uma estrutura preparada para outros perfis e permissões. O backend será responsável por determinar e validar o acesso por meio de token. O frontend usará as permissões recebidas para restringir rotas e ações. O formato do token e o contrato de autenticação ainda não foram definidos.

O fluxo planejado de recuperação solicita o e-mail e mostra uma resposta genérica. O link recebido por e-mail deverá levar à tela de nova senha com um token, que será validado pelo backend antes de qualquer alteração. Nesta fase, as telas servem para validar a interface; não há envio de e-mail nem redefinição real de senha.

Na consignação, a empresa entrega produtos a lojas parceiras e só recebe por eles caso sejam vendidos. O controle previsto precisa distinguir produtos entregues, vendas informadas e pagamentos recebidos. Encomendas, situação das consignações, itens vendidos, valores pendentes e um dashboard também fazem parte do plano; seus detalhes ainda serão definidos antes de criar as telas.

## Telas disponíveis

- `/login`: formulário de entrada e acesso à recuperação de senha.
- `/recuperar-senha`: formulário de e-mail e confirmação de prévia.
- `/redefinir-senha?token=...`: formulário de nova senha. Sem o parâmetro `token`, a tela orienta a solicitar outro link. A presença do parâmetro não significa que o token seja válido.

## Plano de desenvolvimento

1. Validar as telas de autenticação e definir o contrato de login, recuperação e permissões com o backend.
2. Definir os fluxos de encomendas, consignações e pagamentos, incluindo estados, dados e regras financeiras.
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

`test:unit` executa os testes uma vez, sem modo de observação. `src/app/app.spec.ts` cobre a aplicação e o redirecionamento inicial. Login, recuperação e redefinição de senha têm arquivos `*.spec.ts` nas respectivas pastas. O comando encontra e executa todos eles; os próximos testes ficarão junto das funcionalidades que verificam.
