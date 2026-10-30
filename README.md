<div align="center">

# 🎓 UFAM Planner

### Sua vida acadêmica na UFAM, organizada em um só lugar.

Planeje períodos, acompanhe seu progresso, organize horários e cuide da frequência
com uma visão clara da sua trajetória acadêmica.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=061a23)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

<img src="frontend/public/images/ufam-login.png" alt="Entrada da Universidade Federal do Amazonas" width="100%" />

</div>

## ✨ Sobre o projeto

O **UFAM Planner** é uma plataforma acadêmica pensada para estudantes da
Universidade Federal do Amazonas. Ela combina dados do eCampus com informações
do próprio estudante para tornar o planejamento do curso mais simples e visual.

### Principais recursos

- 🗺️ **Mapa curricular** com progresso por componentes e pré-requisitos;
- 🗓️ **Planejamento semestral** com disciplinas, turmas e horários;
- ✅ **Controle de frequência** com projeção do limite de faltas;
- 📄 **Importação de documentos** do eCampus com pré-visualização e confirmação;
- 📊 **Dashboard acadêmico** com indicadores de carga horária e avanço no curso;
- 🔎 **Catálogo de disciplinas** sincronizado com grades públicas da UFAM;
- 🔐 **Autenticação completa** com verificação de e-mail, recuperação de senha e Google OAuth;
- 🏫 **Serviços do campus** reunidos em uma experiência responsiva.

## 🧱 Arquitetura e tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, React Flow e Recharts |
| Backend | Java 17, Spring Boot 3.5, Spring Security, JWT e JPA/Hibernate |
| Dados | PostgreSQL 17 e migrações com Flyway |
| Infraestrutura | Docker Compose, Mailpit e GitHub Actions |
| Arquitetura | Monólito modular com camadas orientadas ao domínio |

```text
UfamPlanner/
├── frontend/       # Interface web em Next.js
├── backend/        # API REST em Spring Boot
├── database/       # Documentação e modelos de dados
├── docs/           # Arquitetura, requisitos e contratos da API
├── scripts/        # Testes de fumaça dos fluxos de importação
└── docker-compose.yml
```

## 🚀 Executando localmente

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) com Docker Compose;
- ou Node.js 20+, Java 17+ e PostgreSQL 17 para execução manual.

### Ambiente completo com Docker

```bash
git clone https://github.com/BeatrizChristine/ufam-planner.git
cd ufam-planner
copy .env.example .env
docker compose up --build
```

> No Linux ou macOS, use `cp .env.example .env` no lugar de `copy`.

Quando os contêineres estiverem prontos:

| Serviço | Endereço |
| --- | --- |
| Aplicação web | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| Health check | http://localhost:8080/api/v1/system/health |
| Caixa de e-mails (Mailpit) | http://localhost:8025 |
| PostgreSQL | `localhost:5432` |

O frontend encaminha `/api/v1` para o backend, evitando configuração adicional
de CORS durante o desenvolvimento.

### Desenvolvimento separado

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend (Windows):

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Para executar o backend em Linux ou macOS, use `mvn spring-boot:run` dentro de
`backend/`. As configurações padrão funcionam com os serviços do Docker Compose;
variáveis locais podem ser definidas a partir do arquivo `.env.example`.

## 🧪 Qualidade

```bash
# Frontend
cd frontend
npm run lint
npm run test:study
npm run build

# Backend
cd ../backend
mvn test
```

A integração contínua executa lint, testes e build do frontend, além dos testes
do backend, a cada push ou pull request para `main`.

## 🔌 Integração com a UFAM

O backend consulta endpoints públicos e relatórios de grades curriculares do
eCampus, normaliza cursos e mantém o catálogo no PostgreSQL. A sincronização
automática pode ser controlada por `UFAM_CATALOG_AUTO_SYNC_ENABLED`,
`UFAM_CATALOG_SYNC_BATCH_SIZE` e `UFAM_CATALOG_SYNC_DELAY_MS`.

Os principais endpoints são:

- `GET /api/v1/integrations/ufam/status`
- `POST /api/v1/integrations/ufam/sync/courses?levelId=3`
- `POST /api/v1/integrations/ufam/sync/courses/{courseId}/curricula`
- `POST /api/v1/integrations/ufam/sync/disciplines?limit=3`
- `GET /api/v1/study/catalog/coverage`

As operações de sincronização são restritas a usuários `ADMIN`. Consulte o
[contrato inicial da API](docs/api/contrato-inicial.md) e a
[documentação da integração](docs/api/integracao-ufam.md) para mais detalhes.

## 📄 Importação de documentos

Na página `/importar`, o estudante pode pré-visualizar e confirmar dados de:

- **comprovante de matrícula:** disciplinas, turmas, carga horária e horários;
- **histórico escolar analítico:** aprovações, dispensas e optativas externas.

Os PDFs são processados em memória e **não são armazenados**. A confirmação é
transacional e idempotente, e faltas já registradas são preservadas. Os scripts
`scripts/smoke-enrollment-import.ps1` e `scripts/smoke-history-import.ps1`
validam esses fluxos usando contas descartáveis.

## 🔐 Configuração de autenticação

O ambiente local usa Mailpit para verificação de e-mail e recuperação de senha;
nenhuma mensagem é enviada a endereços reais. Para produção, configure as
variáveis SMTP e altere `APP_FRONTEND_BASE_URL` e `APP_MAIL_FROM`.

Para habilitar login com Google, crie um OAuth Client ID do tipo **Aplicativo
Web**, autorize `http://localhost:3000` e defina `GOOGLE_CLIENT_ID` no `.env`.
Nunca exponha um client secret no frontend.

## 📚 Documentação

- [Arquitetura](docs/arquitetura.md)
- [Escopo inicial](docs/requisitos/escopo-inicial.md)
- [Roadmap](docs/requisitos/roadmap.md)
- [Fontes públicas da UFAM](docs/fontes-ofertas-ufam.md)
- [Modelo inicial de dados](database/documentation/modelo-inicial.md)

## ⚠️ Avisos importantes

- Informações de turmas e horários devem ser conferidas no eCampus;
- o percentual do mapa curricular é uma estimativa baseada nos dados importados;
- optativas externas importadas não equivalem a aproveitamento homologado;
- o controle de frequência usa os registros do usuário e o mínimo de 75% de presença;
- este é um projeto independente e não representa oficialmente a UFAM.

---

<div align="center">
  Feito com 💚 para facilitar a jornada acadêmica na UFAM.
</div>
