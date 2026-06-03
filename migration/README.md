# Migration: Storyblok → Payload

Переносит контент из Storyblok в Payload CMS через Payload Local API:
fetch stories → transform bloks → import + re-upload media.

## Запуск

```bash
# Offline (из локальной fixture, без живого Storyblok):
STORYBLOK_FIXTURE=fixtures/storyblok-stories.json npm run migrate -w @repo/migration

# Live (нужен токен Storyblok Delivery API):
npm run migrate -w @repo/migration

# Очистить мигрированный контент (users не трогает):
npm run reset -w @repo/migration

# Очистить + пере-мигрировать начисто (из-за не-идемпотентности):
STORYBLOK_FIXTURE=fixtures/storyblok-stories.json npm run migrate:fresh -w @repo/migration
```

Команда делегирует на `npm run migrate -w @repo/cms`, который запускает
`payload run ../migration/migrate.ts` из контекста `cms/` (где резолвится
`@payload-config`). Подробности и обоснование — в `docs/adr/0003-migration-runner.md`.

> Запуск через `npx tsx migrate.ts` не работает — нужен именно `payload run`.

## Переменные окружения

`cms/.env.local` (и/или `migration/.env.local`):

- `DATABASE_URL` — Postgres (Neon)
- `PAYLOAD_SECRET` — секрет Payload
- `STORYBLOK_DELIVERY_API_TOKEN` — только для live-режима
- `STORYBLOK_FIXTURE` — путь к JSON-fixture (относительно `migration/`) для offline-режима

## Маппинг контента

| Storyblok blok / content_type | Payload                     |
|-------------------------------|-----------------------------|
| `hero`, `testimonial`         | Blocks field в `pages`      |
| `case_study`                  | коллекция `case-studies`    |
| `team_member`                 | коллекция `team-members`    |
| `service_item`                | коллекция `services`        |
| изображения (CDN)             | коллекция `media` (re-upload) |

## Ограничения

- **Не идемпотентно**: повторный прогон создаёт дубли (нет upsert по slug).
  Перед повторным демо-прогоном чистить коллекции (`npm run reset` или `migrate:fresh`).
