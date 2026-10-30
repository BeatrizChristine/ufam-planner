# Roadmap do UFAM Planner

## Visão do produto

O UFAM Planner deve evoluir para um **gêmeo digital da trajetória acadêmica**:
uma representação confiável da matriz, do histórico e das possibilidades futuras
do estudante. O sistema não substitui o eCampus; ele transforma dados acadêmicos
em decisões compreensíveis, simulações e planejamento.

O diferencial não será apenas mostrar disciplinas. Será responder, com evidência:

- o que já foi concluído e quanto falta;
- por que uma disciplina está disponível ou bloqueada;
- o que cada disciplina desbloqueia;
- qual é o caminho crítico até a conclusão;
- quais cenários de próximos períodos são viáveis;
- como uma reprovação, trancamento ou aprovação altera a previsão de conclusão.

## 0. Fundação — entregue

- monólito modular, camadas orientadas a domínio e API `/api/v1`;
- Next.js, Spring Boot, PostgreSQL, Flyway e Docker Compose;
- cadastro e login com BCrypt, access token, refresh token e rotas privadas;
- conta, perfil acadêmico e dashboard persistidos;
- interface responsiva e sistema visual inicial.

## 1. Catálogo acadêmico real — em andamento

- cliente eCampus isolado por uma camada anticorrupção;
- sincronização idempotente e rastreável de cursos;
- 198 cursos reais da graduação regular de Manaus importados;
- descoberta de versões de matriz;
- painel administrativo de integração;
- próximo: snapshot bruto, tentativas, métricas e detecção de mudanças.

## 2. Núcleo da matriz — prioridade atual

Marco vertical:

> Selecionar Engenharia da Computação, escolher a matriz correta e visualizar
> todas as disciplinas reais por período, com carga horária e pré-requisitos.

Para chegar nele:

1. baixar e versionar o PDF oficial de cada matriz;
2. extrair cabeçalho, carga horária, períodos e componentes;
3. guardar o resultado em staging, sem publicar automaticamente;
4. validar inconsistências no painel administrativo;
5. publicar disciplinas sem duplicá-las entre matrizes;
6. modelar pré-requisitos compostos, equivalências e co-requisitos;
7. registrar origem e confiança de cada campo importado.

O pipeline deve ser:

```text
eCampus → snapshot bruto → staging → validação → modelo acadêmico → publicação
```

### Piloto FT05 entregue

- versão oficial `FT05-2009-1` publicada com procedência e confiança;
- 50 componentes obrigatórios e 20 optativos organizados por período;
- cargas horárias e duração oficial preservadas;
- API autenticada do mapa curricular;
- mapa interativo com busca, filtros, minimapa e painel de detalhes;
- ausência de pré-requisitos identificada na fonte, sem criação de dados fictícios.

O próximo passo deste marco é obter e validar uma fonte institucional que publique
os pré-requisitos, co-requisitos, equivalências e os grupos de integralização.

## 3. Grafo acadêmico e busca

- mapa curricular interativo com React Flow;
- estados: concluída, cursando, disponível, bloqueada e não ofertada;
- painel lateral com requisitos e disciplinas desbloqueadas;
- pesquisa global por código, nome, curso, departamento e matriz;
- cálculo de impacto e caminho crítico no grafo de dependências;
- comparação entre versões de matriz.

## 4. Histórico e progresso pessoal

- lançamento manual de disciplinas concluídas;
- importação assistida de histórico PDF, sempre com confirmação humana;
- notas opcionais e equivalências aprovadas;
- progresso por carga horária e por grupos curriculares;
- separação entre obrigatórias, optativas, estágio, TCC e atividades complementares;
- trilha de auditoria para qualquer correção feita pelo aluno.

## 5. Simulador de trajetória

- montar múltiplos cenários sem alterar o progresso real;
- validar pré-requisitos e limites de carga;
- detectar períodos vazios e gargalos;
- simular “se eu concluir estas disciplinas, o que fica disponível?”;
- estimar conclusão com faixas e premissas explícitas;
- comparar caminhos por duração, carga e risco.

## 6. Ofertas, horários e frequência

- importar ofertas públicas quando houver fonte confiável;
- permitir entrada manual quando a informação não for pública;
- grade semanal com detector de conflitos;
- preferências de turno, dias livres e carga máxima;
- controle de aulas, faltas e limite restante por disciplina;
- notificações locais e lembretes opcionais.

## 7. Recomendação explicável

Antes de IA, um motor determinístico deve pontuar disciplinas por:

- obrigatoriedade;
- pré-requisitos satisfeitos;
- quantidade de componentes desbloqueados;
- posição no caminho crítico;
- disponibilidade no período;
- compatibilidade de horário e carga;
- risco informado pelo próprio estudante.

Toda recomendação deve apresentar os motivos e permitir inspeção das regras.

## 8. Assistente acadêmico

A IA entra por último, como interface de explicação para fatos calculados pelo
sistema. Ela poderá responder perguntas, comparar cenários e explicar regras,
mas não inventará matriz, oferta, progresso ou previsão.

## Princípios para crescer sem perder confiança

- dado oficial e dado informado pelo aluno nunca são confundidos;
- toda informação externa guarda origem, data e versão;
- matriz histórica é imutável; mudança cria nova versão;
- importações passam por staging e validação antes de publicação;
- dados pessoais seguem minimização, consentimento e retenção explícita;
- o sistema continua útil quando serviços externos estiverem indisponíveis;
- IA explica decisões do domínio, mas não substitui as regras do domínio.
