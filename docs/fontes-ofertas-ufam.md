# Fontes de turmas e horários da UFAM

Pesquisa verificada em 28/09/2026. Não usar nome de disciplina, prefixo de código ou rótulo de turma para inferir curso ofertante.

## Fontes encontradas

| Fonte | Conteúdo observado | Limite para integração |
| --- | --- | --- |
| [Diretório de graduação](https://www.ufam.edu.br/graduacao.html) | Curso, código, unidade e links institucionais | Não contém turmas, horários ou matrícula individual |
| [Grades públicas do eCampus](https://ecampus.ufam.edu.br/ecampus/gradesCurriculares) | Matriz por curso/versão e disciplinas | Grade curricular não comprova oferta semestral |
| [Faculdade de Tecnologia](https://ft.ufam.edu.br/) | Menu de ensalamento aponta para [Genially](https://view.genially.com/663bc7a91fee170014c03626) | Conteúdo dependente de JavaScript; não foi validada uma tabela atual de ofertas que cubra FT05 |
| [Departamento de Ciências Sociais, 2026/2](https://dcis.ufam.edu.br/ultimas-noticias/122-oferta-de-disciplinas-para-o-semestre-letivo-de-2026-2.html) | Publicação datada com link para oferta em documento externo | Oferta de um departamento; não comprova matrícula de um aluno nem cobre toda a UFAM |
| [Departamento de Física](https://www.icedf.ufam.edu.br/acesso-rapido/140-oferta-de-disciplinas-2015-2) | Códigos, turmas, cursos e horários | A publicação encontrada é de **2016/2**; não importar como oferta atual |
| [Portal do eCampus](https://ecampus.ufam.edu.br/ecampus/) | Redireciona para autenticação institucional | Nenhuma consulta pública abrangente de turmas atualizadas foi validada nesta pesquisa; não armazenar credenciais dos alunos |

## Decisão implementada

- Importação de documentos como caminho principal, com destaque no painel inicial.
- Histórico para aprovações/progresso; comprovante para matrícula, turma e horário.
- Dados importados protegidos contra edição e remoção manual. As atualizações passam novamente pela importação, preservando faltas da mesma matrícula.
- Consulta a cursos oficiais não atribui automaticamente um curso à turma.
- Rascunho opcional separado da matrícula, com disciplinas escolhidas no catálogo. Sem digitação livre de código, nome, carga horária ou curso ofertante.
- Referências institucionais reunidas em `/sobre`, sem links repetidos por disciplina.

## Próxima integração segura

Conector por unidade, apenas após validar a publicação do semestre, formato, códigos de disciplina/turma, dias, horários e curso explicitamente indicado. Armazenar URL de origem, semestre e data de consulta. Não reutilizar ofertas antigas para preencher lacunas; divergências com comprovante precisam de revisão. Uma fonte pública de oferta nunca substitui o comprovante da matrícula individual.
