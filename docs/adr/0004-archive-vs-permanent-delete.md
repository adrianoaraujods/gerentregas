# 0004 — Arquivamento vs exclusão permanente

Excluir um veículo, motorista ou gerente não é um comportamento único, mas dois, decididos pela existência de histórico de roteiros:

- **Sem histórico** (`route`, `route_version` e — para usuários — `stop_version.actor_id` sem nenhuma referência): o registro é **excluído permanentemente**. A placa/o e-mail fica livre para recriação e não há nada a preservar.
- **Com histórico**: o registro é **arquivado** — `deleted_at` é preenchido, o registro torna-se somente leitura nas listagens e apenas *Restaurar* é oferecido. Usuários arquivados adicionalmente recebem `banned = true` e têm todas as linhas de `session` revogadas, portanto não conseguem fazer login, e qualquer sessão ativa morre dentro da janela de 5 minutos do cache de sessão em cookie.

Registros arquivados aparecem nas tabelas de frota e motoristas com status "Arquivado", ocultos por um filtro de status padrão (`Status ≠ Arquivado`), e podem ser restaurados: gerentes restauram motoristas e veículos; administradores restauram qualquer perfil. Criar um registro com a placa/o e-mail de um arquivado retorna um conflito amigável apontando para o registro arquivado — antes, a verificação duplicada em aplicação (que filtrava `deleted_at`) passava e o insert falhava na constraint UNIQUE crua do banco.

## Por quê

O soft delete uniforme anterior tinha três problemas observados em uso: (1) gerentes não conseguiam readicionar um veículo porque a linha invisível do soft-deleted ainda era dona da placa (erro cruo 23505); (2) motoristas excluídos faziam login normalmente, pois o Better Auth não conhece `deleted_at`; (3) excluir um registro nunca usado deixava linhas mortas para sempre, embora nada as referenciasse.

O estado "arquivado" é exatamente "excluir + preservar histórico": roteiros mantêm motoristas, gerentes e veículos válidos por FK (e o histórico de versões mantém aqueles referenciados apenas por versões antigas), enquanto o controle de acesso precisa de uma alavanca que o Better Auth impõe nativamente — o plugin admin verifica `banned` na criação de sessão, com `bannedUserMessage` em pt-BR.

## Opções consideradas

- **Soft delete de tudo (comportamento anterior)**: mantinha o login aberto para usuários excluídos e bloqueava o reuso de placa/e-mail com erro de banco sem mensagem amigável.
- **Hard delete de tudo**: impossível para linhas referenciadas (FKs de `route`/`route_version`) e destruiria o histórico auditado dos roteiros.
- **Reativar automaticamente a linha arquivada ao recriar**: rejeitado — para usuários, um "criar" silenciosamente redefiniria a senha e des-baniria uma conta; restaurar é uma ação explícita e permissionada.
- **Arquivar se referenciado, excluir permanentemente se não (escolhida)**: o próprio grafo de FKs define "foi usado", sem nova coluna de controle; `banned` (já presente no esquema, sem uso) impõe o bloqueio de login.

## Consequências

- A unicidade permanece estrita: `vehicle.plate` e `lower(user.email)` continuam índices UNIQUE completos (sem parcial `WHERE deleted_at IS NULL`). Reusar placa/e-mail arquivado é feito restaurando, nunca criando uma segunda linha — isso elimina qualquer ambiguidade no momento da restauração.
- As listagens de frota e usuários ganharam `includeDeleted`; o padrão (não definido) continua excluindo as linhas arquivadas, de modo que os seletores de motorista/veículo e as consultas do dia do motorista não são afetados.
- O arquivamento de `user` é transacional (definir `deleted_at`/`banned`/`ban_reason` + excluir sessões juntos); o cascade de `session`/`account` mantém a exclusão permanente de um usuário sem histórico limpa.
- As permissões de restauração ficaram mais amplas que as de pontos/roteiros (ainda exclusivas do administrador): gerentes podem restaurar motoristas e veículos, pois são os operadores cotidianos das duas tabelas; gerente não pode restaurar nem excluir gerente/administrador — apenas administrador.
- O cache de sessão em cookie de 5 minutos significa que um usuário arquivado com cookie vivo pode agir por no máximo essa janela; os middlewares tRPC também rejeitam sessões `banned` como defesa em profundidade.
