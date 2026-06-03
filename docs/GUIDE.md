# Storyblok → Payload: полное руководство от А до Я

Пошаговая инструкция: создать проект в Storyblok, перенести контент в Payload CMS,
задеплоить и запустить итоговый проект. Написано для того, кто уверенно работает
с Payload, но не делал миграций.

Архитектурные решения вынесены в `docs/adr/`, команда запуска — в `migration/README.md`.
Этот документ связывает всё воедино. Если нужен только быстрый ответ «как
воспроизвести и увидеть Storyblok до / Payload после» — см. `docs/DEMO.md`.

---

## Оглавление

0. [Что мы строим и почему](#0-что-мы-строим-и-почему)
1. [Предварительные требования](#1-предварительные-требования)
2. [Монорепо: каркас](#2-монорепо-каркас)
3. [Storyblok: создание проекта и контента](#3-storyblok-создание-проекта-и-контента)
4. [web/: фронтенд на Storyblok (исходная точка)](#4-web-фронтенд-на-storyblok-исходная-точка)
5. [cms/: установка Payload CMS](#5-cms-установка-payload-cms)
6. [cms/: моделирование контента (коллекции)](#6-cms-моделирование-контента-коллекции)
7. [migration/: скрипт миграции](#7-migration-скрипт-миграции)
8. [Запуск миграции](#8-запуск-миграции)
9. [Просмотр мигрированного контента](#9-просмотр-мигрированного-контента)
10. [Деплой](#10-деплой)
11. [Запуск готового проекта](#11-запуск-готового-проекта)
12. [Troubleshooting (грабли проекта)](#12-troubleshooting-грабли-проекта)

---

## 0. Что мы строим и почему

**Задача миграции:** контент живёт в Storyblok (headless CMS, контент = дерево
«bloks»). Нужно перенести его в Payload CMS (self-hosted, контент = документы
коллекций в Postgres) так, чтобы после миграции от Storyblok можно было отказаться
полностью — включая картинки.

**Монорепо (Turborepo + npm workspaces):**

```
storyblok-payload-migration/
├── web/         # Next.js + @storyblok/react — исходный фронтенд на Storyblok
├── cms/         # Payload CMS (Next.js-based, Postgres/Neon)
├── migration/   # Node/TS-скрипт: Storyblok API → transform → Payload Local API
└── docs/adr/    # архитектурные решения
```

**Ключевые понятия миграции** (см. `CONTEXT.md`):

- **Story** — единица контента в Storyblok (slug + `content_type` + дерево bloks).
- **Blok** — атомарный компонент Storyblok: объект с полем `component` и данными.
- **Collection** — сущность Payload (таблица в Postgres).
- **Blocks field** — поле Payload, хранящее массив разнотипных блоков; прямой аналог
  массива bloks в Storyblok story.
- **Local API** — программный доступ к Payload без HTTP; используется в скрипте миграции.

**Маппинг контента** (ADR-0001):

| Storyblok                       | Payload                          |
|---------------------------------|----------------------------------|
| `page` story + bloks `hero`/`testimonial` | коллекция `pages`, поле `body` типа `blocks` |
| `case_study`                    | коллекция `case-studies`         |
| `team_member`                   | коллекция `team-members`         |
| `service_item`                  | коллекция `services`             |
| изображения (Storyblok CDN)     | коллекция `media` (re-upload, ADR-0002) |

---

## 1. Предварительные требования

- **Node.js ≥ 20** (проект тестировался на Node 24). Проверка: `node --version`.
- **npm 10+** (используется как пакетный менеджер; `packageManager` зафиксирован в root `package.json`).
- Аккаунты:
  - **Storyblok** (app.storyblok.com) — источник контента.
  - **Postgres-провайдер** — в проекте **Neon** (neon.tech, serverless Postgres, бесплатный tier).
  - **Vercel** — для деплоя `web` и `cms`.
- Windows: команды ниже — для bash (Git for Windows). В PowerShell задавать env через `$env:VAR=...`.

---

## 2. Монорепо: каркас

> Если вы клонируете готовый репозиторий — пропустите и переходите к шагу 3.
> Здесь описано, как этот каркас создавался с нуля.

1. Инициализация:
   ```bash
   mkdir storyblok-payload-migration && cd $_
   npm init -y
   git init
   ```
2. Превратить root в workspace-контейнер. В корневой `package.json`:
   ```jsonc
   {
     "private": true,
     "workspaces": ["web", "cms", "migration"],
     "scripts": {
       "dev": "turbo dev",
       "build": "turbo build",
       "lint": "turbo lint"
     },
     "devDependencies": { "turbo": "^2.5.4" },
     "engines": { "node": ">=20" },
     "packageManager": "npm@10.9.2"
   }
   ```
3. `turbo.json` — пайплайн задач:
   ```jsonc
   {
     "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": { "dependsOn": ["^build"], "inputs": ["$TURBO_DEFAULT$", ".env*"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
       "dev":   { "cache": false, "persistent": true },
       "lint":  { "dependsOn": ["^lint"] }
     }
   }
   ```
4. `.gitignore`: `node_modules`, `.next`, `.env*` (кроме `.env.example`), `cms/media`.

Подпакеты (`web`, `cms`, `migration`) создаём на следующих шагах.

---

## 3. Storyblok: создание проекта и контента

Цель этапа — получить **наполненный space** и **Delivery API токен**, из которого
скрипт будет тянуть контент.

### 3.1. Space

1. app.storyblok.com → **Create new space** → выбрать регион (запомните: от региона
   зависит хост API — EU `api.storyblok.com`, US `api-us.storyblok.com`).
2. Storyblok создаст демо-контент. Его можно использовать или удалить.

### 3.2. Описать компоненты (block schema)

Settings → **Block Library** → создать компоненты. **Имена полей должны совпадать с
тем, что ждёт скрипт миграции** (`migration/migrate.ts`), иначе данные потеряются:

- **page** (тип: *content type / nestable*) — поле `body` (Blocks).
- **hero** (nestable): `headline` (text), `subheadline` (text), `cta_label` (text),
  `cta_url` (text), `image` (asset).
- **testimonial** (nestable): `quote` (text), `author_name` (text),
  `author_role` (text), `author_photo` (asset).
- **case_study** (content type): `description` (richtext/text), `cover_image` (asset),
  `tags` (multi-option или list of text).
- **team_member** (content type): `name` (text), `role` (text), `bio` (text),
  `photo` (asset).
- **service_item** (content type): `title` (text), `description` (text), `icon` (text).

### 3.3. Создать контент (stories)

Content → создать stories. Имена и slug соответствуют коллекциям Payload:

- `home`, `about` — story типа **page**, внутри bloks `hero` / `testimonial`.
- `acme-rebrand`, `fintech-app` — **case_study**.
- `jane-doe`, `john-smith` — **team_member**.
- `web-design`, `branding`, `development` — **service_item**.

В каждый asset-поле загрузите картинку (она потом будет скачана в Payload).
**Опубликуйте** stories (скрипт по умолчанию тянет `version=published`).

### 3.4. Токен Delivery API

Settings → **Access Tokens** → скопировать **Public** токен (для published-контента).
Понадобится как `STORYBLOK_DELIVERY_API_TOKEN`.

> **Совет для разработки без живого space:** скрипт поддерживает offline-режим из
> JSON-фикстуры (см. шаг 7.4 и `migration/fixtures/storyblok-stories.json`). Формат
> фикстуры — точная копия ответа Storyblok CDN (`{ "stories": [...] }`). Это позволяет
> прогнать весь путь миграции, ещё не имея наполненного Storyblok.

---

## 4. web/: фронтенд на Storyblok (исходная точка)

Это «как было до миграции» — Next.js, рендерящий контент из Storyblok. На итог
миграции он не влияет, но полезен как точка отсчёта и для демо.

1. Внутри `web/` — Next.js (App Router) + `@storyblok/react`:
   ```bash
   cd web && npm init -y
   npm i next react react-dom @storyblok/react
   ```
2. `web/src/lib/storyblok.js` — инициализация SDK с токеном и регистрацией компонентов
   (`Page`, `Teaser`, `Grid`, `Feature`).
3. `web/src/app/[[...slug]]/page.js` — catch-all роут, тянет story по slug и рендерит
   через `StoryblokComponent`.
4. `.env` фронта: `STORYBLOK_DELIVERY_API_TOKEN`, `NEXT_PUBLIC_PAYLOAD_URL`
   (см. `web/.env.example`).

> Этот шаг — про Storyblok-стек и не является обязательным для самой миграции.

---

## 5. cms/: установка Payload CMS

Цель — рабочая Payload-инсталляция с Postgres-адаптером и админкой.

### 5.1. Создать пакет

```bash
cd cms && npm init -y
npm i payload @payloadcms/next @payloadcms/db-postgres @payloadcms/richtext-lexical \
      next react react-dom sharp cross-env
npm i -D typescript @types/node @types/react @types/react-dom
```

### 5.2. ⚠️ `"type": "module"` — обязательно

В `cms/package.json` **сразу** добавьте `"type": "module"`:

```jsonc
{ "name": "@repo/cms", "private": true, "type": "module", ... }
```

Конфиг Payload и коллекции пишутся как ESM (`import.meta.url`, импорты без расширений).
Next.js-бандлер это терпит и без декларации, но **standalone-загрузчик `payload run`
(нужен для миграции) без `type: module` падает** на `./collections/...` →
`ERR_MODULE_NOT_FOUND`. Подробнее — ADR-0003 и шаг 12.

Скрипты в `cms/package.json`:

```jsonc
"scripts": {
  "dev": "next dev --port 3001",
  "build": "next build",
  "start": "next start --port 3001",
  "payload": "cross-env PAYLOAD_CONFIG_PATH=src/payload.config.ts payload",
  "migrate": "cross-env PAYLOAD_CONFIG_PATH=src/payload.config.ts payload run ../migration/migrate.ts"
}
```

### 5.3. База данных (Neon)

1. neon.tech → создать проект → скопировать connection string
   (`postgresql://...@...neon.tech/neondb?sslmode=require`).
2. `cms/.env.local` (см. `cms/.env.example`):
   ```
   DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
   PAYLOAD_SECRET=<минимум 32 символа>
   ```

### 5.4. `payload.config.ts`

`cms/src/payload.config.ts`:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CaseStudies } from './collections/CaseStudies'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Services } from './collections/Services'
import { TeamMembers } from './collections/TeamMembers'
import { Users } from './collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const secret = process.env.PAYLOAD_SECRET
if (!secret) throw new Error('PAYLOAD_SECRET env var is required')

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users, Media, Pages, CaseStudies, TeamMembers, Services],
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } }),
  editor: lexicalEditor(),
  secret,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
```

`cms/tsconfig.json` — обязательно алиас `@payload-config` (его резолвит и Next, и
`payload run`):

```jsonc
"compilerOptions": {
  "module": "esnext",
  "moduleResolution": "bundler",
  "paths": { "@payload-config": ["./src/payload.config.ts"] }
}
```

### 5.5. ⚠️ Админка Payload 3 + Next 16 — два известных грабля

Payload-админка монтируется через App Router в группе роутов `(payload)`.
В этом проекте всплыли две проблемы (см. `memory` / шаг 12):

1. **Пустая админка / `TypeError: Cannot destructure 'config'`** — отсутствовал
   layout, монтирующий `RootLayout` (React-контекст конфига). Нужен
   `cms/src/app/(payload)/admin/layout.tsx`, вызывающий `RootLayout` из
   `@payloadcms/next/layouts`.
2. **Админка без стилей** (Times New Roman, голый HTML) — потерян глобальный CSS-entry.
   В layout админки нужен `import '@payloadcms/next/css'` — он определяет тема-переменные
   `--theme-*`, без которых компонентные стили не работают.

Стандартный шаблон `create-payload-app` обычно держит и `RootLayout`, и css-import
вместе в `(payload)/layout.tsx`. Проще всего **сгенерировать проект через
`npx create-payload-app`** и взять оттуда готовый каркас `(payload)`, чем собирать
руками.

### 5.6. Проверка

```bash
npm run dev -w @repo/cms          # http://localhost:3001/admin
```

Первый вход создаёт admin-пользователя. В dev Postgres-адаптер сам создаёт таблицы
(push-режим).

---

## 6. cms/: моделирование контента (коллекции)

Каждый блок/тип Storyblok → коллекция или блок Payload. Файлы — в
`cms/src/collections/`. Имена полей **совпадают со Storyblok** (чтобы маппинг был
тривиальным).

- **Media** (`media`): `upload: { staticDir: 'media' }`, без полей (alt задаётся при
  загрузке). ⚠️ `staticDir` — локальная папка, для прода нужно blob-хранилище (шаг 10).
- **Users** (`users`): `auth: true` — для входа в админку.
- **Pages** (`pages`): `title`, `slug` (unique), `body` типа `blocks` с двумя блоками:
  - `hero`: `headline`, `subheadline`, `cta_label`, `cta_url`, `image` (upload→media).
  - `testimonial`: `quote`, `author_name`, `author_role`, `author_photo` (upload→media).
- **CaseStudies** (`case-studies`): `title`, `slug` (unique), `description` (richText
  lexical), `cover_image` (upload→media), `tags` (array из `{ tag: text }`).
- **TeamMembers** (`team-members`): `name`, `role`, `bio`, `photo` (upload→media).
- **Services** (`services`): `title`, `description`, `icon`.

> **⚠️ Публичный доступ на чтение.** Дефолтный access control в Payload —
> `({ req: { user } }) => Boolean(user)`, т.е. **read закрыт для анонимов**. Если
> контент должен читаться публично (фронтенд через REST/`/migrated`, отдача картинок
> media), добавьте в контент-коллекции и в Media:
> ```ts
> access: { read: () => true },
> ```
> Без этого `GET /api/<collection>` вернёт `403`, а фронтенд молча покажет пусто.
> `Users` (auth) оставляем закрытым.

После описания коллекций:

```bash
npm run payload -w @repo/cms -- generate:types   # обновит payload-types.ts
```

> **Почему именно так** (ADR-0001): `hero`/`testimonial` — это секции страницы, поэтому
> они становятся блоками внутри `pages.body` (прямой аналог массива bloks). А
> `case_study`/`team_member`/`service_item` — переиспользуемые сущности, поэтому
> отдельные коллекции.

---

## 7. migration/: скрипт миграции

Это сердце задачи. Полный рабочий скрипт — `migration/migrate.ts`. Ниже — из чего он
состоит.

### 7.1. Пакет

`migration/package.json`:

```jsonc
{
  "name": "@repo/migration",
  "private": true,
  "type": "module",
  "scripts": { "migrate": "npm run migrate -w @repo/cms" },
  "dependencies": { "dotenv": "^16", "payload": "^3" }
}
```

`migration/tsconfig.json` — алиас `@payload-config` на конфиг cms (для типов в редакторе),
`exclude: ["../cms"]` чтобы tsc не лез в чужие compiler options:

```jsonc
"compilerOptions": {
  "module": "esnext", "moduleResolution": "NodeNext", "strict": true,
  "baseUrl": ".", "paths": { "@payload-config": ["../cms/src/payload.config.ts"] }
},
"include": ["migrate.ts"], "exclude": ["node_modules", "../cms"]
```

### 7.2. Получение Payload (Local API)

```ts
import { getPayload } from 'payload'
import config from '@payload-config'          // статический импорт через алиас
const payload = await getPayload({ config })   // прямой доступ к БД, без HTTP
```

> **Важно:** именно статический `import config from '@payload-config'`, а **не**
> динамический `import()` — динамический под загрузчиком триггерил `require(esm)` цикл.
> Алиас резолвится самим `payload run` (ADR-0003).

### 7.3. Три ключевых преобразования

1. **Bloks → Blocks field.** Для story типа `page` каждый blok мапится в объект с
   `blockType` (`hero`/`testimonial`) и полями. Результат — массив `body`, который
   уходит в `payload.create({ collection: 'pages', data: { title, slug, body } })`.
2. **Media re-upload** (ADR-0002). Для каждого asset:
   ```
   fetch(storyblokUrl) → Buffer → payload.create({ collection: 'media', file, data: { alt } })
   ```
   `payload.create` с полем `file` грузит бинарь в Media; возвращённый `id`
   подставляется в upload-поле (`image`, `cover_image`, `photo`, `author_photo`).
   После этого зависимости от Storyblok CDN нет.
3. **Plain text → Lexical richtext.** Поле `description` у case study — это richText
   (lexical). Простой текст оборачивается в минимальный Lexical-JSON
   (`root → paragraph → text`), иначе Payload не примет значение.

### 7.4. Offline-режим (фикстура)

Чтобы прогонять без живого Storyblok: если задан `STORYBLOK_FIXTURE`, скрипт читает
stories из локального JSON (тот же формат, что отдаёт CDN) вместо HTTP. Путь
резолвится относительно `migration/`. Готовая фикстура:
`migration/fixtures/storyblok-stories.json` (9 stories).

### 7.5. Запуск через `payload run`, а не tsx

В конце файла — top-level `await main()` в `try/catch`. Запускать **только** через
`payload run` (см. шаг 8 и ADR-0003): прямой `npx tsx migrate.ts` падает, потому что
tsx CJS-трансформирует payload-овский ESM-импорт `@next/env`, и его `.default`
приходит `undefined`.

---

## 8. Запуск миграции

### 8.1. Env

`cms/.env.local` (его читает `payload run` из cwd) и/или `migration/.env.local`:

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
PAYLOAD_SECRET=<32+ символа>
STORYBLOK_DELIVERY_API_TOKEN=<public token>   # только для live-режима
```

### 8.2. Команда

```bash
# Offline (из фикстуры) — рекомендуется для первого прогона:
STORYBLOK_FIXTURE=fixtures/storyblok-stories.json npm run migrate -w @repo/migration

# Live (из Storyblok):
npm run migrate -w @repo/migration
```

Цепочка: `@repo/migration` → делегирует `@repo/cms` → `payload run ../migration/migrate.ts`
из контекста `cms/` (где резолвится `@payload-config`).

### 8.3. Ожидаемый вывод

```
Loaded 9 stories from fixture
Migrating pages...        [page] OK: home / about
Migrating case studies... [case_study] OK: acme-rebrand / fintech-app
Migrating team members... [team_member] OK: jane-doe / john-smith
Migrating services...     [service_item] OK: web-design / branding / development
Migrated: 2 pages, 2 case studies, 2 team members, 3 services
```

### 8.4. ⚠️ Не идемпотентно → reset

Повторный прогон **создаёт дубли** (нет upsert по slug; у `pages`/`case-studies` slug
помечен `unique`, так что второй прогон по ним упадёт на constraint). Для повторного
прогона начисто есть reset-скрипт (`migration/reset.ts`, чистит контент-коллекции
через Local API, `users` не трогает):

```bash
# очистить контент:
npm run reset -w @repo/migration
# очистить и сразу пере-мигрировать (одной командой):
STORYBLOK_FIXTURE=fixtures/storyblok-stories.json npm run migrate:fresh -w @repo/migration
```

---

## 9. Просмотр мигрированного контента

Два способа убедиться, что контент на месте:

1. **Админка Payload:** `http://localhost:3001/admin` → коллекции Pages / Case Studies /
   Team Members / Services / Media. Картинки должны открываться (они уже в Payload, не в
   Storyblok).
2. **Фронтенд-страница `/migrated`:** `web/src/app/migrated/page.jsx` дёргает REST API
   Payload (`GET {NEXT_PUBLIC_PAYLOAD_URL}/api/<collection>?limit=100`) и выводит списки.
   Запуск: `npm run dev -w @repo/web`, открыть `/migrated`. Переменная
   `NEXT_PUBLIC_PAYLOAD_URL` (по умолчанию `http://localhost:3001`).

---

## 10. Деплой

Деплоятся два независимых Next-приложения на Vercel + общий Neon Postgres.

### 10.1. Neon (prod БД)

- Можно отдельная ветка/проект Neon под прод. Скопировать prod `DATABASE_URL`.

### 10.2. ⚠️ Схема в проде: миграции, а не push

В dev Postgres-адаптер создаёт таблицы автоматически (push). В **проде так нельзя** —
нужно сгенерировать и применять миграции Payload:

```bash
npm run payload -w @repo/cms -- migrate:create   # сгенерировать SQL-миграцию
# в CI/деплое:
npm run payload -w @repo/cms -- migrate           # применить
```

Миграции коммитятся в репозиторий (`cms/src/migrations/`).

### 10.3. ⚠️ Медиа в проде: blob-хранилище, не `staticDir`

`Media.upload.staticDir: 'media'` пишет файлы на **локальную ФС** — на serverless Vercel
она эфемерна, загрузки пропадут. Для прода подключить blob-адаптер:

```bash
npm i @payloadcms/storage-vercel-blob -w @repo/cms
```

```ts
// payload.config.ts → plugins
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
plugins: [ vercelBlobStorage({ collections: { media: true }, token: process.env.BLOB_READ_WRITE_TOKEN }) ]
```

(Аналогично — S3-адаптер.) Миграцию media тогда лучше запускать **после** настройки
blob-хранилища, чтобы файлы сразу легли в него.

### 10.4. cms на Vercel

- New Project → импорт репо → **Root Directory = `cms`**.
- Framework: Next.js (определится сам).
- Env: `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`.
- Build Command (если стандартный не подхватит из-за монорепо):
  `cd ../.. && npm install && npm run build -w @repo/cms`.
- Версии Next в `cms` и `web` выровнены (обе на `^16.1.6`), `next build` проходит.
  Если снова появится конфликт типов двух копий Next — держите одинаковую мажорную
  версию во всех workspace и сделайте `npm install` для дедупликации.

### 10.5. web на Vercel

- New Project → **Root Directory = `web`**, framework Next.js (`web/vercel.json` уже
  задаёт `{ "framework": "nextjs" }`).
- Env: `STORYBLOK_DELIVERY_API_TOKEN`, `NEXT_PUBLIC_PAYLOAD_URL` = публичный URL
  задеплоенного cms (например `https://<cms>.vercel.app`).

### 10.6. Запуск миграции против прод-БД

Миграцию можно прогнать локально, указав в `.env.local` **prod** `DATABASE_URL`
(и prod blob-токен), либо как одноразовый шаг в CI. Команда — та же (шаг 8).

---

## 11. Запуск готового проекта

После деплоя:

1. **Админка Payload:** `https://<cms>.vercel.app/admin`. Первый вход создаёт
   prod-админа (или создайте его сидом). Контент уже мигрирован (шаг 10.6).
2. **Фронтенд:** `https://<web>.vercel.app` — Storyblok-страницы; `/migrated` — данные
   из Payload через его REST API.
3. **Локально** весь стек: `npm run dev` в корне (Turborepo поднимет `web` и `cms`
   параллельно; `cms` на :3001, `web` на :3000).

Итог: контент полностью в Payload (включая медиа), Storyblok больше не нужен ни
фронтенду (через `/api`/Local API), ни как хранилище картинок.

---

## 12. Troubleshooting (грабли проекта)

| Симптом | Причина | Решение |
|---|---|---|
| `npx tsx migrate.ts` → `TypeError: Cannot destructure 'loadEnvConfig'` | tsx CJS-трансформирует payload-овский ESM-импорт `@next/env`, `.default` = undefined | Запускать через `payload run`, а не tsx (шаг 8) |
| `payload run` → `ERR_MODULE_NOT_FOUND: ./collections/CaseStudies` (и даже `generate:types` падает) | `cms` — CJS-пакет, но конфиг написан как ESM (extensionless импорты) | Добавить `"type": "module"` в `cms/package.json` (шаг 5.2) |
| Админка пустая / `Cannot destructure property 'config'` | нет layout, монтирующего `RootLayout` (React-контекст конфига) | Создать `(payload)/admin/layout.tsx` с `RootLayout` (шаг 5.5) |
| Админка без стилей (Times New Roman, голый HTML) | потерян глобальный CSS-entry с тема-переменными | `import '@payloadcms/next/css'` в layout админки (шаг 5.5) |
| `next build` падает: type конфликт двух копий Next (`cms/node_modules/next` vs root) | разные мажорные версии Next в workspace → npm ставит вложенную копию | Выровнять `next` во всех workspace (одна мажорная), `npm install` (шаг 10.4) |
| `next build` падает: `NotFoundPage`/`RootPage` — missing `params`, `searchParams` | Next 16 ужесточил сигнатуру admin-страниц | Передавать `params`/`searchParams` в `(payload)/admin/.../not-found.tsx` и `page.tsx` |
| `GET /api/<collection>` → `403`, фронтенд показывает пусто | дефолт Payload закрывает read для анонимов | `access: { read: () => true }` в контент-коллекциях + Media (шаг 6) |
| Повторная миграция падает на unique slug / создаёт дубли | скрипт не идемпотентен | `npm run reset` / `migrate:fresh` (шаг 8.4) |
| Storyblok возвращает пусто | тянется `version=published`, а stories в draft; или неверный регион/хост API | Опубликовать stories; проверить хост (`api.storyblok.com` vs `api-us`) |
| Картинки не скачались | приватные/просроченные URL Storyblok | Проверить лог `Failed to download ...`; брать published-assets |

---

## Связанные документы

- `CONTEXT.md` — глоссарий предметной области.
- `docs/adr/0001-blocks-field-for-page-layout.md` — почему bloks → Blocks field.
- `docs/adr/0002-media-reupload-strategy.md` — почему скачиваем медиа.
- `docs/adr/0003-migration-runner.md` — почему `payload run` + `type: module`.
- `migration/README.md` — краткая шпаргалка по запуску.
