# ADR-0001: Blocks field для layout страниц

## Status
Accepted

## Context
Storyblok хранит страницу как массив heterogeneous bloks (`body: [Hero, Testimonial, ...]`). В Payload это можно смоделировать двумя способами: Blocks field или отдельные коллекции с relationship.

## Decision
Использовать **Payload Blocks field** для секций страницы (Hero, Testimonial). CaseStudies и TeamMembers — отдельные коллекции с relationship из Pages.

## Consequences
- Прямой маппинг Storyblok body → Payload layout (упрощает migration скрипт)
- Секции не переиспользуются между страницами (приемлемо для демо и большинства лендингов)
- CaseStudies/TeamMembers нормализованы — могут появляться в разных контекстах
