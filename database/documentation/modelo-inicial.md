# Modelo de dados inicial

A migração `V1__initial_schema.sql` cria o núcleo relacional:

- usuário e perfil acadêmico;
- curso e versão da matriz curricular;
- disciplinas e pré-requisitos;
- componentes da matriz por período;
- progresso individual nas disciplinas.

Ofertas, horários e frequência entram na próxima migração para manter esta base
pequena e revisável.

A migração `V3__academic_profile_and_catalog_seed.sql` completa o vínculo do
perfil com `course_id` e `curriculum_id`, separa ingresso em ano e semestre e
mantém `current_period` anulável e apenas informativo. Ela também oferece um
catálogo manual mínimo de demonstração, identificado com `source = 'MANUAL'`,
para que o produto não dependa do CKAN durante o desenvolvimento.
