# ADR-0003: Запуск migration-скрипта через `payload run` + ESM в cms

## Status
Accepted

## Context
Migration скрипт (`migration/migrate.ts`) использует Payload Local API, поэтому ему нужен загруженный `payload.config.ts` из `cms/`. Прямой запуск через `npx tsx migrate.ts` не работает: tsx CJS-трансформирует ESM-импорт `@next/env` внутри `payload/dist/bin/loadEnv.js`, его `.default` приходит `undefined` → `TypeError`.

При переходе на `payload run` всплыла вторая проблема: `cms/` был CJS-пакетом (без `"type"` в `package.json`), но `payload.config.ts` и коллекции написаны как ESM (`import.meta.url`, импорты без расширений `./collections/...`). Next.js-бандлер это скрывает, а standalone-загрузчик `payload run` (tsx-as-ESM) на extensionless-импортах падает с `ERR_MODULE_NOT_FOUND`. Воспроизводилось даже на штатном `payload generate:types`.

## Decision
1. Скрипт запускается через `payload run`, а не `tsx`. Каноничная команда живёт в `cms/package.json` (`migrate`), т.к. там runtime-контекст Payload. `migration/package.json` делегирует на неё.
2. В `cms/package.json` добавлен `"type": "module"` — это приводит декларацию пакета в соответствие с ESM-кодом конфига и чинит резолв импортов в standalone-загрузчике.
3. `migrate.ts` импортирует конфиг статически через алиас `@payload-config` (не dynamic `import()`, который триггерил `require(esm)` цикл).

## Consequences
- Миграция запускается одной командой (см. `migration/README.md`), работает на fixture и на живом Storyblok.
- Скрипт не идемпотентен: повторный прогон создаёт дубли (нет upsert по slug). Решение — reset-скрипт (`npm run reset` / `migrate:fresh`).

## Update (2026-06-03): version skew устранён
- `cms` выровнен на `next ^16.1.6` (= root/web). Раньше `cms` тянул `next` 15.x → npm
  ставил вложенную копию → `next build` падал на конфликте типов двух копий Next.
  После выравнивания + `npm install` копия одна, `next build` проходит (EXIT=0),
  админка рендерится под Next 16 + Turbopack.
- Удалён override `"@next/env": "15.5.18"` из корневого `package.json` — он был наследием
  старого tsx-пути (от которого отказались) и конфликтовал с Next 16. `payload run`
  использует собственный загрузчик и от override не зависит.
- Next 16 ужесточил сигнатуру admin-страниц: в `(payload)/admin/[[...segments]]/not-found.tsx`
  пришлось передавать `params`/`searchParams` (как уже было в `page.tsx`).
