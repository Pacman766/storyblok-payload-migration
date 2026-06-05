# Storyblok → Payload Migration (monorepo)

Monorepo demonstrating a full CMS migration from Storyblok to Payload CMS v3 with Next.js 16.

**Quick start:** [`docs/DEMO.md`](docs/DEMO.md) | **Full guide:** [`docs/GUIDE.md`](docs/GUIDE.md) | **ADRs:** [`docs/adr/`](docs/adr/)

## Structure

| Package | Description |
|---------|-------------|
| `web/` | Next.js 16 frontend — Storyblok Visual Editor integration, webhook-based ISR |
| `cms/` | Payload CMS v3 — collections, access control, Lexical rich text |
| `migration/` | Node.js script — transfers content from Storyblok API to Payload |

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Source CMS:** Storyblok (Visual Editor, webhooks)
- **Target CMS:** Payload CMS v3 — typed collections, access control, Lexical editor
- **Database:** PostgreSQL (`@payloadcms/db-postgres`)
- **Monorepo:** Turborepo + npm workspaces

## Local setup

```bash
npm install

# web — Storyblok frontend (port 3000)
cd web && cp .env.example .env
# set STORYBLOK_DELIVERY_API_TOKEN
npm run dev

# cms — Payload CMS (port 3001)
cd cms && cp .env.example .env
# set DATABASE_URI, PAYLOAD_SECRET
npm run dev

# run migration script
cd migration && npm run migrate
```

See [`docs/GUIDE.md`](docs/GUIDE.md) for the full step-by-step walkthrough.
