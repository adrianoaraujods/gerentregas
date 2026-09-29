# Especificação de Requisitos

## 1. Contexto e Problema

Empresas de logística e entrega urbana precisam saber onde e por quanto tempo seus profissionais de campo ficam parados durante o roteiro diário. Hoje esse tempo é invisível: não há registro confiável de quanto tempo o entregador, motorista ou transportador permanece em cada ponto do trajeto, o que impede identificar gargalos, renegociar prazos com clientes e calcular corretamente o custo real de cada rota. O cliente solicitou um painel (_dashboard_) com gráficos que apresentem o tempo parado por dia, por mês e por período, sempre associado aos pontos do roteiro.

## 2. Objetivo do MVP

Construir um Mínimo Produto Viável capaz de:

- Identificar quanto tempo o entregador/motorista/transportador fica parado em cada ponto do seu roteiro diário.
- Registrar e persistir os pontos, roteiros e tempos coletados.
- Apresentar ao cliente um painel com gráficos de tempo parado por dia, por mês e por período.
- Calcular indicadores de custo associados ao trajeto (custo por km percorrido, consumo km/litro do veículo).

## 3. Escopo

### 3.1 Dentro do escopo

- Cadastro de motoristas/motoboys, gerentes/coordenadores, pontos e roteiros.
- Coleta de dados dos pontos do roteiro (endereço, data/hora de chegada e saída).
- Cálculo do tempo parado por ponto e do tempo total parado por roteiro.
- Histórico de pontos e tempos parados por período, com endereços.
- _Dashboard_ com gráficos por dia, por mês e por período.
- Parametrização de custos e da jornada padrão de trabalho.

### 3.2 Fora do escopo (não fazer)

- Roteirização automática ou otimização de rotas.
- Integração com sistemas de folha de pagamento ou ERP.
- Rastreamento em tempo real com telemetria embarcada no veículo.
- Aplicativo nativo publicado em lojas de aplicativos.

## 4. Regras de Negócio

| **ID**   | **Regra**                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **RN01** | O ponto de partida não conta tempo parado: o cronômetro de parada só é considerado a partir do segundo ponto do roteiro.      |
| **RN02** | O tempo parado em um ponto é a diferença entre o horário de saída e o horário de chegada naquele ponto.                       |
| **RN03** | O tempo total parado do roteiro é a soma dos tempos parados de todos os pontos, exceto o ponto de partida.                    |
| **RN04** | A jornada padrão de trabalho é de 8 horas por dia e serve de base percentual para os indicadores de tempo parado.             |
| **RN05** | Cada roteiro pertence a um único motorista/motoboy e a uma única data.                                                        |
| **RN06** | Os pontos de um roteiro possuem ordem sequencial $(1, 2, 3, 4, \dots)$ que define o trajeto do dia.                           |
| **RN07** | O custo do trajeto é calculado a partir do valor do combustível, do rendimento km/litro do veículo e da distância percorrida. |

## 5. Exemplo de Roteiro (base do desenho original)

Os roteiros a seguir ilustram o modelo de coleta: cada ponto possui identificação sequencial, endereço e tempo parado. O ponto 1 (partida) não acumula tempo parado.

| **Roteiro** | **Ponto / Endereço**       | **Tempo parado** | **Observação**                   |
| ----------- | -------------------------- | ---------------- | -------------------------------- |
| **A**       | 1 — Seg. Família (partida) | —                | Ponto de partida não conta tempo |
| **A**       | 2 — Rua Peru, 55           | 15 min           | Parada intermediária             |
| **A**       | 3 — Rua X, 5               | 10 min           | Parada intermediária             |
| **A**       | 4 — Av. João César         | 50 min           | Ponto final elaborado            |
| **B**       | 1 — Partida                | —                | Não conta tempo                  |
| **B**       | 2                          | 10 min           | —                                |
| **B**       | 3                          | 5 min            | —                                |
| **B**       | 4                          | 26 min           | —                                |
| **C**       | 1 — Partida                | —                | Não conta tempo                  |
| **C**       | 2                          | 5 min            | —                                |
| **C**       | 3                          | 10 min           | —                                |
| **C**       | 4                          | 30 min           | —                                |

## 6. Requisitos Funcionais

| **ID**   | **Requisito**                                                                              | **Prioridade** |
| -------- | ------------------------------------------------------------------------------------------ | -------------- |
| **RF01** | Cadastrar dados do motorista/motoboy (nome, telefone, documento, veículo).                 | Alta           |
| **RF02** | Cadastrar dados do gerente/coordenador (nome, telefone, e-mail).                           | Alta           |
| **RF03** | Cadastrar pontos com endereço e coordenadas.                                               | Alta           |
| **RF04** | Montar o roteiro diário associando pontos em ordem sequencial a um motorista e a uma data. | Alta           |
| **RF05** | Registrar chegada e saída em cada ponto (data/hora) para coleta do tempo parado.           | Alta           |
| **RF06** | Calcular automaticamente o tempo parado por ponto e o total do roteiro.                    | Alta           |
| **RF07** | Exibir histórico de pontos e tempos parados por período, com endereços.                    | Alta           |
| **RF08** | Exibir _dashboard_ com gráficos de tempo parado por dia, por mês e por período.            | Alta           |
| **RF09** | Parametrizar custos: valor do combustível, km/litro do veículo, custo por km percorrido.   | Média          |
| **RF10** | Parametrizar regras de cálculo do tempo parado e a jornada padrão ($8\text{ h/dia}$).      | Média          |
| **RF11** | Calcular o custo estimado do roteiro a partir dos parâmetros e da distância percorrida.    | Média          |
| **RF12** | Exportar relatórios do período consultado.                                                 | Baixa          |

## 7. Requisitos Não Funcionais

| **ID**    | **Requisito**                                                                             |
| --------- | ----------------------------------------------------------------------------------------- |
| **RNF01** | Persistência dos dados em banco de dados, garantindo o histórico completo dos roteiros.   |
| **RNF02** | Interface web responsiva, utilizável em desktop e em dispositivos móveis pelo entregador. |
| **RNF03** | Tempo de resposta do _dashboard_ inferior a 3 segundos para consultas de até 12 meses.    |
| **RNF04** | Controle de acesso por perfil: motorista/motoboy, gerente/coordenador e administrador.    |
| **RNF05** | Registro de auditoria das alterações em pontos e horários.                                |
| **RNF06** | Aderência à LGPD no tratamento dos dados pessoais dos profissionais de campo.             |

## 8. Modelo de Dados (Persistência)

| **Entidade**                               | **Atributos principais**                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Ponto**                                  | id, endereço, latitude, longitude, data/hora de chegada, data/hora de saída, tempo parado calculado, ordem no roteiro         |
| **Roteiro**                                | id, data, motorista responsável, lista ordenada de pontos, distância total, tempo total parado, custo estimado                |
| **Motorista / Motoboy**                    | id, nome, telefone, documento, veículo, rendimento km/litro                                                                   |
| **Gerente / Coord. / Dono transportadora** | id, nome, telefone, e-mail, equipe sob responsabilidade                                                                       |
| **Parâmetro**                              | valor do combustível, km/litro do veículo, custo por km, jornada padrão ($8\text{ h/dia}$), regras de cálculo do tempo parado |

## 9. Entregáveis

MVP com:

- _Dashboard_ com gráficos de tempo parado por dia, por mês e por período.
- Histórico de pontos e tempos parados por período, com endereços.
- Módulo de coleta de dados dos pontos do roteiro (entrada de pedidos) e identificação dos endereços dos pedidos para o roteiro.
- Parâmetros de custo (valor do combustível, km/litro do veículo, custo por km percorrido).
- Parâmetros para cálculo do tempo parado, com padrão de trabalho de $8\text{ h/dia}$.
- Camada de persistência com pontos, roteiros, dados do motorista/motoboy e dados do gerente/coordenador.
- Documento de especificação (esta 1ª parte — Projeto Preliminar com casos de uso de diagramas de robustez e classes conceitual).
- Pontos extras: nome do produto e campanha de divulgação.

## 10. Critérios de Aceitação

- O sistema não computa tempo parado no ponto de partida do roteiro.
- O _dashboard_ apresenta os três recortes solicitados: dia, mês e período.
- Todo tempo parado exibido está vinculado a um endereço e a uma data/hora registrados.
- Os parâmetros de custo e de jornada podem ser alterados sem alteração de código.
    

## 11. Entrega e Avaliação

| **Item**          | **Detalhe**                                             |
| ----------------- | ------------------------------------------------------- |
| **Valor**         | 10 pontos                                               |
| **Pontos extras** | Até 2 pontos (melhor nome do produto e melhor campanha) |
| **Equipe**        | Dupla ou trio                                           |
| **1ª parte**      | Projeto Preliminar — esta especificação                 |
| **2ª parte**      | Implementação do MVP com os entregáveis                 |
