# ADR-0002: Полная миграция медиа из Storyblok CDN

## Status
Accepted

## Context
Изображения в Storyblok хранятся на `a.storyblok.com`. После миграции контента в Payload можно либо сохранить исходные URL, либо скачать и загрузить файлы в Payload Media.

## Decision
Migration скрипт **скачивает изображения** с Storyblok CDN и загружает в Payload Media collection через Local API.

## Consequences
- Полная независимость от Storyblok после миграции
- Migration скрипт сложнее (fetch → buffer → multipart upload)
- Для демо: хранилище локальное (`/cms/media`), без S3/Vercel Blob
