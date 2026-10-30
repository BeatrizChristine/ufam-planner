# Escopo inicial

## Problema

O aluno precisa consultar fontes separadas para entender sua situação acadêmica.
O UFAM Planner deve tornar a matriz curricular uma experiência navegável e apoiar
decisões sem substituir o eCampus nem representar uma fonte oficial de matrícula.

## Entregas do MVP

1. Cadastro, login e perfil acadêmico.
2. Importação ou seleção de curso e matriz curricular.
3. Mapa curricular com pré-requisitos e estados das disciplinas.
4. Registro de disciplinas concluídas e em andamento.
5. Planejador semanal com detecção de conflitos.
6. Controle de frequência e limite de faltas.
7. Busca de disciplinas.
8. Indicadores de progresso no dashboard.

## Fora do primeiro ciclo

- Matrícula oficial e escrita no eCampus.
- Recomendações geradas por IA.
- Leitura automática de histórico sem validação do aluno.
- Aplicativo móvel nativo.

## Fontes externas

- Dados Abertos UFAM/CKAN: catálogo e dados institucionais públicos.
- Google Identity: login social opcional.
- Provedor de e-mail: confirmação e recuperação de senha.

Toda integração externa deve passar pelo módulo `integration`, com adaptadores que
protejam o domínio contra formatos e indisponibilidade de terceiros.

