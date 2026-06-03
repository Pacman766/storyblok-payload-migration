# Демо: Storyblok «до» → Payload «после»

Короткий ответ на «как это воспроизвести и можно ли увидеть сначала Storyblok, а потом
Payload». Полное руководство — `docs/GUIDE.md`.

## Миграция — это копия, а не перенос

Storyblok и Payload **сосуществуют**. Скрипт миграции **читает** контент из Storyblok и
**копирует** его в Payload (включая медиа). Storyblok при этом не изменяется и не
удаляется. В монорепо живут обе стороны, поэтому видно и «до», и «после»:

| Что смотрим | Маршрут | Источник данных | Что нужно |
|---|---|---|---|
| **Storyblok «до»** | `web` → `/` (`[[...slug]]`) | живой Storyblok API | `STORYBLOK_DELIVERY_API_TOKEN` + наполненный space |
| **Payload «после» (админка)** | `cms` → `/admin` | Payload + Postgres | `DATABASE_URL`, `PAYLOAD_SECRET` |
| **Payload «после» (фронтенд)** | `web` → `/migrated` | Payload REST API | данные уже мигрированы + публичный `read` |

«Всё только в Payload» — нет. После миграции от Storyblok можно **отказаться**, но это
выбор, а не следствие миграции.

## Два сценария

### A. Оффлайн — без аккаунта Storyblok (состояние репо по умолчанию)

«Storyblok-контент» берётся из фикстуры `migration/fixtures/storyblok-stories.json`
(точная копия ответа Storyblok CDN). Это позволяет прогнать весь путь миграции без
живого space.

- ✅ Работает: Payload-админка (`/admin`) и фронтенд `/migrated`.
- ⚠️ Storyblok-маршрут `web/[[...slug]]` **не отрендерит** контент без токена. «До»
  смотрится как сама фикстура (JSON) — это и есть исходные stories/bloks.

### B. Полное «до → после» — нужен бесплатный аккаунт Storyblok

1. Создать space и компоненты (схема bloks — `GUIDE.md` шаг 3), наполнить, опубликовать.
2. Положить токен в `web/.env.local` → открыть `web` `/` и увидеть **живой Storyblok-сайт**.
3. Прогнать миграцию в live-режиме → тот же контент появится в **Payload** (`/admin`,
   `/migrated`).

## Воспроизведение с нуля

```bash
git clone https://github.com/Pacman766/storyblok-payload-migration.git
cd storyblok-payload-migration
npm install

# --- env ---
# cms/.env.local:   DATABASE_URL=<Neon Postgres>   PAYLOAD_SECRET=<32+ символов>
# web/.env.local:   NEXT_PUBLIC_PAYLOAD_URL=http://localhost:3001
#                   STORYBLOK_DELIVERY_API_TOKEN=<token>   # только для сценария B

# 1) Payload + админка (первый вход создаёт админа)
npm run dev -w @repo/cms          # http://localhost:3001/admin

# 2) Миграция
#    A — оффлайн, из фикстуры:
STORYBLOK_FIXTURE=fixtures/storyblok-stories.json npm run migrate:fresh -w @repo/migration
#    B — live из Storyblok:
npm run migrate:fresh -w @repo/migration

# 3) Фронтенд
npm run dev -w @repo/web          # /          → Storyblok (нужен токен, сценарий B)
                                  # /migrated  → Payload

# или весь монорепо разом (Turborepo): web :3000 + cms :3001
npm run dev
```

`migrate:fresh` = очистка контент-коллекций + миграция начисто (скрипт не идемпотентен).
Для live-режима нужен `STORYBLOK_DELIVERY_API_TOKEN`; для оффлайна — `STORYBLOK_FIXTURE`.

См. также: `docs/GUIDE.md` (полное руководство), `migration/README.md` (шпаргалка),
`docs/adr/` (архитектурные решения).
