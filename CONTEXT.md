# Context

## Glossary

**Story** — единица контента в Storyblok. Имеет slug, тип (`content_type`) и поле `content`, содержащее bloks.

**Blok** — атомарный компонент в Storyblok. Объект с полем `component` (строка-идентификатор) и произвольными полями данных. Bloks вкладываются друг в друга.

**Collection** — сущность в Payload CMS, аналог таблицы в БД. Каждый документ коллекции имеет уникальный `id`.

**Blocks field** — поле в Payload коллекции, хранящее массив разнотипных блоков. Прямой аналог массива bloks в Storyblok story.

**Local API** — программный интерфейс Payload для прямого доступа к БД без HTTP. Используется в migration скриптах и server-side коде Next.js.

**Migration** — процесс переноса контента из Storyblok в Payload: fetch stories → transform bloks → import через Local API → download and re-upload media.

**Media re-upload** — часть Migration: изображения скачиваются с Storyblok CDN и загружаются в Payload Media collection, обеспечивая полную независимость от Storyblok после миграции.
