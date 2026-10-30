# Contrato inicial da API

Base URL: `/api/v1`

## Autenticação

| Método | Endpoint | Uso | Autenticação |
| --- | --- | --- | --- |
| POST | `/auth/register` | cria conta e inicia sessão | não |
| POST | `/auth/login` | login por e-mail ou username | não |
| POST | `/auth/refresh` | rotaciona refresh token e access token | cookie HttpOnly |
| POST | `/auth/logout` | revoga refresh token e encerra sessão | cookie HttpOnly |
| GET | `/users/me` | dados da conta autenticada | Bearer JWT |
| GET | `/catalog/courses` | lista cursos ativos | Bearer JWT |
| GET | `/catalog/courses/{courseId}/curricula` | lista matrizes ativas do curso | Bearer JWT |
| GET | `/academic-profile/me` | consulta o perfil acadêmico | Bearer JWT |
| PUT | `/academic-profile/me` | cria ou atualiza o perfil acadêmico | Bearer JWT |
| GET | `/curricula/{curriculumId}/map` | matriz publicada, componentes, origem e relações | Bearer JWT |
| GET | `/dashboard/summary` | resumo real do perfil autenticado | Bearer JWT |
| GET | `/system/health` | disponibilidade da API | não |

O access token dura 15 minutos e é enviado em `Authorization: Bearer TOKEN`. O
refresh token dura sete dias, é rotacionado a cada uso e fica em cookie HttpOnly.
No banco é persistido somente o SHA-256 do refresh token.

### Cadastro

```json
{
  "name": "Beatriz Christine",
  "username": "bia.dev",
  "email": "bia@example.com",
  "password": "uma-senha-segura"
}
```

### Login

```json
{
  "identifier": "bia.dev",
  "password": "uma-senha-segura"
}
```

Erros seguem `application/problem+json` e incluem `code`, `detail` e, para
validação, um mapa `fields`.

## Perfil acadêmico

```json
{
  "courseId": "10000000-0000-0000-0000-000000000001",
  "curriculumId": "20000000-0000-0000-0000-000000000001",
  "admissionYear": 2024,
  "admissionTerm": 1,
  "registrationNumber": "22350000",
  "currentPeriod": 5
}
```

`currentPeriod` e `registrationNumber` são opcionais. O período declarado é
somente informativo e não participa do cálculo de progresso acadêmico.

Enquanto não existem disciplinas concluídas registradas, o dashboard responde
com `progressAvailable: false`; nenhuma porcentagem demonstrativa é inventada.

## Mapa curricular

O mapa retorna a matriz ativa, os componentes obrigatórios e optativos, período
sugerido, carga horária, pré-requisitos e componentes desbloqueados. A resposta
também inclui `source`, com URL, versão, data de captura, confiança e a indicação
`prerequisiteDataAvailable`. Quando a fonte não publica pré-requisitos, as listas
permanecem vazias e essa ausência é mostrada explicitamente na interface.
