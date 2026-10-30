# Integração com fontes públicas da UFAM

## Fonte acadêmica ativa

O UFAM Planner usa os mesmos endpoints públicos consumidos pela página oficial
de Grades Curriculares do eCampus:

- `POST /gradesCurriculares/loadCursos`
- `POST /gradesCurriculares/loadVersoes`
- `GET|POST /gradesCurriculares/report` (PDF da matriz)

A integração é feita exclusivamente pelo backend. Os dados são normalizados e
persistidos no PostgreSQL, portanto o frontend não depende da disponibilidade
do eCampus a cada acesso.

## Sincronização

`POST /api/v1/integrations/ufam/sync/courses?levelId=3` importa ou atualiza os
cursos do nível solicitado. O nível 3 representa a graduação regular de Manaus.

`POST /api/v1/integrations/ufam/sync/courses/{courseId}/curricula` descobre as
versões de matriz de um curso previamente importado. Os comandos exigem JWT com
papel `ADMIN`.

Cada execução é registrada em `external_sync_run`. Cursos recebem origem
`UFAM_ECAMPUS`, identificador externo e data da última sincronização. Versões
de matriz ficam em `ufam_curriculum_version` até a etapa de leitura do PDF.

## Matriz publicada no piloto

A matriz `FT05-2009-1` de Engenharia da Computação foi publicada no modelo
acadêmico a partir da página oficial da Faculdade de Engenharia Elétrica e
Computação. O snapshot de procedência registra a versão, URL, data de publicação,
data de captura e confiança `OFFICIAL`.

A fonte publica 50 componentes obrigatórios (3.105 horas), 20 opções de
optativas (das quais 90 horas devem ser integralizadas), 480 horas de extensão,
períodos e cargas horárias. Ela não informa as relações de pré-requisito; nenhuma
relação foi inferida. O mapa deve exibi-las somente depois da validação em uma
fonte oficial.

## CKAN

O portal `dadosabertos.ufam.edu.br` é uma fonte complementar para conjuntos de
dados institucionais. Em 24 de setembro de 2026, o domínio e a API CKAN estavam
respondendo HTTP 404. Por isso, o fluxo acadêmico não depende desse serviço.
