# Componentes próprios reutilizáveis

Esta é a pasta padrão para componentes próprios usados por mais de uma feature.

Antes de criar um componente, verificar as opções Spartan da versão instalada. Reutilizar, gerar ou compor os componentes oficiais primeiro. Criar um próprio somente quando o comportamento necessário não puder ser atendido dessa forma e registrar o motivo na alteração.

Organização por componente:

```text
shared/components/<nome>/
  <nome>.ts
  <nome>.html       # quando houver template externo
  <nome>.css        # somente estilos necessários
  <nome>.spec.ts    # quando houver comportamento que justifique testes
```

Não criar arquivos vazios nem wrappers que apenas repassem as propriedades do Spartan. Componentes Helm permanecem em `libs/ui/`. Componentes específicos de um fluxo ficam em `features/<feature>/components/<nome>/` nas novas extrações; layouts ficam em `layout/`.

No estado atual, esta pasta contém apenas este guia. A galeria/lupa ainda pertence a Produtos e permanece na feature, pois não tem outro consumidor. Só mover um componente para cá quando o compartilhamento for concreto.

Consultar as regras completas no [AGENTS.md](../../../../AGENTS.md) e o estado das migrações no [README do projeto](../../../../README.md).
