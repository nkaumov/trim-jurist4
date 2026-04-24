# Juri4 — MVP «рабочее место юриста»

Веб-приложение для ведения дел и подготовки анализа разногласий по договорам.

Важно: **сам ИИ здесь не реализуется**. `juri4` даёт только **интерфейс взаимодействия по API**: внешняя система забирает контекст дела и присылает обратно результат анализа.

## Стек

- Frontend: Next.js (App Router) + TypeScript
- UI: Tailwind CSS + компоненты в стиле shadcn/ui
- Backend: Node.js + Fastify + TypeScript
- ORM: Prisma
- DB: PostgreSQL
- Auth: JWT access + refresh (cookies)
- Storage: локальный volume (готово для замены на S3/MinIO)

## Быстрый старт (Docker Compose)

1) Создайте `.env` файлы:
- `apps/backend/.env` на основе `apps/backend/.env.example`
- `apps/frontend/.env` на основе `apps/frontend/.env.example`

2) Запуск:

```bash
docker compose up --build
```

Примечание: базовые образы для Docker берутся из `public.ecr.aws` (зеркало), чтобы избежать проблем с доступом к Docker Hub.

По умолчанию порты нестандартные:
- frontend: `3080`
- backend: `4080`

Можно переопределить:

```bash
set FRONTEND_PORT=3180
set BACKEND_PORT=4180
docker compose up --build
```

3) (Опционально) Создать базовую организацию и аккаунт юриста:

```bash
docker compose exec backend npm run seed
```

По умолчанию `seed` создаёт только организацию + одного юриста (без демо‑дел и документов).

Откройте:
- Frontend: `http://localhost:3080`
- Backend health: `http://localhost:4080/health`

Примечание: frontend проксирует запросы к backend через `GET/POST/... /api/*` (Next route handler), поэтому для пользователей обычно достаточно открыть наружу только порт frontend.

## Доступ через Tailscale

Если у вас есть Tailscale, можно получить удобный HTTPS-URL (внутри tailnet):

```bash
tailscale serve --bg 3080
tailscale serve status
```

Вы увидите URL вида `https://<device>.<tailnet>.ts.net/`.
Для API можно использовать `https://<device>.<tailnet>.ts.net/api/...` (frontend проксирует на backend).

Если нужен доступ из интернета (публично) — используйте Funnel:

```bash
tailscale funnel --bg 3080
tailscale funnel status
```

Seed‑аккаунт по умолчанию (если запускали seed):
- `lawyer@company.local` / `lawyer12345`

## Локальный запуск без Docker

Нужен PostgreSQL локально и `.env` для backend (можно взять `apps/backend/.env.example`).

```bash
npm install
npx prisma generate --schema=prisma/schema.prisma
npx prisma migrate dev --schema=prisma/schema.prisma
npm run -w backend dev
npm run -w frontend dev
```

## Prisma migrations

- Схема: `prisma/schema.prisma`
- Начальная миграция: `prisma/migrations/20260423000000_init/migration.sql`

## Интеграция анализа

Внутри `juri4` ИИ не реализуется. Анализ выполняется во внешней системе и результат приходит обратно по API:

- `POST /api/integration/cases/:id/analysis-result` (см. `docs/platform-custom-api-juri4.md`)

Формат ответа ожидается как в промте (и валидируется схемой):
- `packages/shared-types/src/index.ts` (`AiAnalysisResponseSchema`)

## Интеграция платформы (Custom HTTP API)

- Пошаговая настройка Tool Custom API и методов: `docs/platform-custom-api-juri4.md`

## Как пользоваться (бизнес‑процесс)

- Пошагово по ролям/вкладкам: `docs/business-process.md`
