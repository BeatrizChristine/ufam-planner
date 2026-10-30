# Arquitetura

## Estilo

Monólito modular com organização por domínio. Cada módulo pode ter as camadas:

- `domain`: entidades, value objects, regras e portas; não depende de framework;
- `application`: casos de uso e DTOs de entrada/saída;
- `infrastructure`: JPA, clientes HTTP e detalhes técnicos;
- `presentation`: controllers REST e contratos da API.

Dependências entre módulos passam por interfaces públicas da camada de aplicação.
Não se acessa diretamente o repositório ou entidade JPA de outro módulo.

## Módulos

| Módulo | Responsabilidade |
| --- | --- |
| auth | autenticação, tokens e recuperação de acesso |
| user | identidade e preferências do estudante |
| course | cursos, departamentos e ofertas |
| curriculum | matrizes, componentes e pré-requisitos |
| discipline | catálogo e busca de disciplinas |
| progress | vínculo do aluno, estados e percentual concluído |
| schedule | grade semanal e conflitos |
| attendance | aulas, presenças, faltas e alertas |
| recommendation | caminhos e sugestões explicáveis |
| integration | anticorrupção para CKAN, e-mail e serviços futuros |

## Decisões iniciais

- API versionada em `/api/v1`.
- UUID nas entidades de negócio.
- Horários armazenados com dia da semana e hora local; o calendário usará datas.
- Migrações são a única fonte de verdade do schema (`ddl-auto: validate`).
- Tokens de acesso serão curtos; refresh token será revogável e persistido.
- Dados externos guardam origem e data da sincronização.

