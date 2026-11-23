# Próxima etapa: backend e banco

Este documento registra o que a prévia do frontend já valida. Não é um contrato fechado de API nem um esquema definitivo de banco.

## Fluxos que precisam de transações

- Confirmar uma encomenda ou consignação: validar todos os saldos, registrar as baixas de filamentos e insumos por unidade, congelar o preço calculado e mudar a etapa como uma única operação. Se faltar qualquer insumo, nenhuma baixa pode ocorrer.
- Voltar uma encomenda confirmada a orçamento: permitido atualmente apenas sem recebimento e antes de iniciar a impressão. Repor exatamente as baixas registradas, sem recalcular pelo cadastro atual.
- Registrar uma falha de impressão em Encomendas ou Consignado, nas etapas Em impressão ou Prontas para entrega: guardar item, quantidade, data, motivo, modo de registro do material, gramas por filamento, horas e custo estimado calculado com preços e energia conhecidos naquele momento. Os modos são exclusivos. Em “Peça inteira”, a quantidade é positiva e as gramas são derivadas do consumo cadastrado no tamanho multiplicado por ela. No modo manual, a falha representa parte da peça, não soma unidade inteira perdida e o usuário informa filamento, gramas e horas. Preservar o material calculado ou informado no evento, mesmo que o cadastro do produto mude depois. Se uma encomenda pronta for cancelada com falha parcial pendente, não creditar o item afetado como produto pronto. A falha não muda a etapa, não é uma despesa paga e não muda o preço combinado.
- Iniciar nova tentativa: validar e baixar somente os filamentos adicionais informados, preservando a etapa atual. A falha e a tentativa precisam ser eventos distintos; enquanto a tentativa estiver pendente, o próximo avanço fica bloqueado.
- Registrar recebimento de encomenda ou repasse de consignação: criar um lançamento datado e atualizar o saldo recebido na mesma transação. Pagamento não avança etapa operacional.
- Registrar compra paga de filamento em uma ação própria: escolher o filamento já cadastrado, quantidade em kg e preço por kg; aumentar o saldo em gramas, atualizar o preço atual e criar uma despesa datada com valor total na mesma transação. Ajustes manuais de saldo não criam despesa.
- Cancelar encomenda em qualquer etapa anterior a Entregues: em Em orçamento não movimentar estoque; em Confirmadas devolver as baixas da confirmação; em Em impressão manter o consumo; em Prontas para entrega manter o consumo e lançar as peças prontas no saldo do produto e tamanho. Não permitir novos recebimentos nem cobrança do saldo restante. O recebimento anterior permanece no histórico financeiro.
- Registrar eventual devolução de entrada ao cliente como movimentação separada. Ainda definir vínculo, autorização, valores parciais, método, data e efeito no saldo antes de implementar.

## Identificação e auditoria

- O administrador cadastra funcionário com nome, e-mail único e permissões Visualizar/Gerenciar por área. Gerenciar implica Visualizar; Dashboard e Log são apenas consulta. Gestão de usuários é reservada ao administrador. O backend deve criar o usuário e enviar convite por e-mail com link para definir senha, sem expor senha provisória ao administrador ou ao frontend. Definir validade, uso único e reenvio do convite.
- No login, o backend devolve token e permissões efetivas. As rotas da prévia já identificam a permissão de visualização necessária; o frontend deverá restringir menu, rotas e ações de gestão quando houver sessão real. O backend deve autorizar cada requisição, inclusive se alguém chamar a API diretamente. O formato do token, associação à organização, expiração, renovação, revogação e efeito de uma mudança de permissão sobre sessões abertas ainda precisam ser definidos. Se o token contiver permissões legíveis, a leitura no frontend serve à interface, não substitui a validação do backend.

- Contatos cadastrados têm IDs locais na prévia. Novas encomendas e consignações guardam esse ID quando o contato existe; exemplos e nomes digitados livremente ainda dependem do nome. Na migração, definir como identificar e vincular esses registros sem associação incorreta.
- O backend será a autoridade de autenticação e permissões. Registrar autor, instante e dados relevantes de cada evento de negócio. Os campos de último autor e último resumo não substituem o histórico completo.
- A futura organização dos dados para SaaS ainda precisa definir isolamento por organização, acesso de usuários, migração e consultas. Não inferir que dois usuários compartilham todos os dados de todas as organizações.

## Decisões abertas antes do contrato definitivo

1. Correção após confirmação, impressão, entrega, venda e recebimento: quais operações compensatórias são permitidas, quem pode autorizá-las e como vincular a devolução financeira ao evento original.
2. Diferença entre consumo previsto e real, desperdícios fora de uma falha, insumos por unidade em novas tentativas e devolução de material ao estoque.
3. Compra ainda não paga, pagamento parcial da compra, contas a pagar e conciliação entre compra, entrada de estoque e despesa.
4. Identificação obrigatória ou opcional do contato em cada canal, deduplicação e alteração de nome sem perder vínculos.
5. Formato de eventos de auditoria, permissões por ação, token, sessão e associação de conta Google.

Os mocks ainda reiniciam ao recarregar. A prévia não deve ser usada como fonte durável de estoque, caixa ou auditoria.
