import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '@payload-config'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
// dotenv's default only reads `.env`; our local values (DATABASE_URL,
// PAYLOAD_SECRET, optional STORYBLOK_*) live in `.env.local`.
dotenv.config({ path: path.resolve(moduleDir, '.env.local') })

// ---------------------------------------------------------------------------
// Storyblok API types
// ---------------------------------------------------------------------------

interface SbAsset {
  filename: string
}

interface SbHeroBlok {
  component: 'hero'
  headline?: string
  subheadline?: string
  cta_label?: string
  cta_url?: string
  image?: SbAsset
}

interface SbTestimonialBlok {
  component: 'testimonial'
  quote?: string
  author_name?: string
  author_role?: string
  author_photo?: SbAsset
}

type SbBlok = SbHeroBlok | SbTestimonialBlok

interface SbPageContent {
  component: 'page'
  body?: SbBlok[]
}

interface SbCaseStudyContent {
  component: 'case_study'
  description?: string
  cover_image?: SbAsset
  tags?: string[]
}

interface SbTeamMemberContent {
  component: 'team_member'
  name?: string
  role?: string
  bio?: string
  photo?: SbAsset
}

interface SbServiceContent {
  component: 'service_item'
  title?: string
  description?: string
  icon?: string
}

type SbContent =
  | SbPageContent
  | SbCaseStudyContent
  | SbTeamMemberContent
  | SbServiceContent

interface SbStory {
  name: string
  slug: string
  content: SbContent
}

interface SbStoriesResponse {
  stories: SbStory[]
  cv: number
  rels: unknown[]
  links: unknown[]
  perPage?: number
  total?: number
}

// ---------------------------------------------------------------------------
// Payload minimal types for local API (avoids traversing cms/ at compile time)
// ---------------------------------------------------------------------------

interface PayloadFile {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

interface PayloadInstance {
  create: (options: {
    collection: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>
    file?: PayloadFile
    overrideAccess?: boolean
  }) => Promise<{ id: string | number }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLexicalJson(text: string): object {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              format: 0,
              style: '',
              mode: 'normal',
              detail: 0,
              text,
              version: 1,
            },
          ],
          direction: 'ltr',
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
    },
  }
}

async function downloadFile(url: string): Promise<PayloadFile | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`  Failed to download ${url}: HTTP ${response.status}`)
      return null
    }
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()
    const data = Buffer.from(arrayBuffer)
    const name = url.split('/').pop()?.split('?')[0] ?? 'file'
    return {
      data,
      mimetype: contentType.split(';')[0].trim(),
      name,
      size: data.byteLength,
    }
  } catch (err) {
    console.error(`  Error downloading ${url}:`, err instanceof Error ? err.message : err)
    return null
  }
}

async function uploadMedia(
  payload: PayloadInstance,
  asset: SbAsset | undefined,
  alt: string,
): Promise<string | number | null> {
  if (!asset?.filename) return null
  const file = await downloadFile(asset.filename)
  if (!file) return null
  try {
    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      file,
      overrideAccess: true,
    })
    return doc.id
  } catch (err) {
    console.error(`  Error uploading media ${asset.filename}:`, err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Storyblok fetch (paginated)
// ---------------------------------------------------------------------------

async function fetchAllStories(): Promise<SbStory[]> {
  // Offline mode: read stories from a local JSON fixture (same shape as the
  // Storyblok CDN response) instead of hitting the API. Lets the full
  // transform + Local API import path run without a populated Storyblok space.
  const fixture = process.env.STORYBLOK_FIXTURE
  if (fixture) {
    const fixturePath = path.isAbsolute(fixture) ? fixture : path.resolve(moduleDir, fixture)
    console.log(`  Using fixture (offline): ${fixturePath}`)
    const raw = await readFile(fixturePath, 'utf8')
    const body = JSON.parse(raw) as SbStoriesResponse
    console.log(`  Loaded ${body.stories.length} stories from fixture`)
    return body.stories
  }

  const token = process.env.STORYBLOK_DELIVERY_API_TOKEN
  if (!token) {
    throw new Error('STORYBLOK_DELIVERY_API_TOKEN is not set')
  }

  const baseUrl = 'https://api.storyblok.com/v2/cdn/stories'
  const perPage = 100
  const allStories: SbStory[] = []
  let page = 1
  let totalPages = 1

  do {
    const url = `${baseUrl}?token=${token}&version=published&per_page=${perPage}&page=${page}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Storyblok API error: HTTP ${response.status}`)
    }
    const body = (await response.json()) as SbStoriesResponse
    allStories.push(...body.stories)

    const total = Number(response.headers.get('total') ?? body.stories.length)
    totalPages = Math.ceil(total / perPage)
    console.log(`  Fetched page ${page}/${totalPages} (${body.stories.length} stories)`)
    page++
  } while (page <= totalPages)

  return allStories
}

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

async function migratePages(
  payload: PayloadInstance,
  stories: SbStory[],
): Promise<number> {
  const pageStories = stories.filter(
    (s): s is SbStory & { content: SbPageContent } =>
      s.content.component === 'page',
  )

  let count = 0
  for (const story of pageStories) {
    try {
      const body: object[] = []

      for (const blok of story.content.body ?? []) {
        if (blok.component === 'hero') {
          const imageId = await uploadMedia(payload, blok.image, blok.image?.filename ?? 'hero-image')
          body.push({
            blockType: 'hero',
            headline: blok.headline ?? '',
            subheadline: blok.subheadline ?? '',
            cta_label: blok.cta_label ?? '',
            cta_url: blok.cta_url ?? '',
            ...(imageId !== null ? { image: imageId } : {}),
          })
        } else if (blok.component === 'testimonial') {
          const photoId = await uploadMedia(payload, blok.author_photo, blok.author_photo?.filename ?? 'author-photo')
          body.push({
            blockType: 'testimonial',
            quote: blok.quote ?? '',
            author_name: blok.author_name ?? '',
            author_role: blok.author_role ?? '',
            ...(photoId !== null ? { author_photo: photoId } : {}),
          })
        }
      }

      await payload.create({
        collection: 'pages',
        data: {
          title: story.name,
          slug: story.slug,
          body,
        },
        overrideAccess: true,
      })
      console.log(`  [page] OK: ${story.slug}`)
      count++
    } catch (err) {
      console.error(`  [page] ERROR: ${story.slug}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

async function migrateCaseStudies(
  payload: PayloadInstance,
  stories: SbStory[],
): Promise<number> {
  const filtered = stories.filter(
    (s): s is SbStory & { content: SbCaseStudyContent } =>
      s.content.component === 'case_study',
  )

  let count = 0
  for (const story of filtered) {
    try {
      const coverId = await uploadMedia(payload, story.content.cover_image, story.content.cover_image?.filename ?? 'cover')
      const tags = (story.content.tags ?? []).map((tag) => ({ tag }))

      await payload.create({
        collection: 'case-studies',
        data: {
          title: story.name,
          slug: story.slug,
          description: story.content.description
            ? buildLexicalJson(story.content.description)
            : undefined,
          ...(coverId !== null ? { cover_image: coverId } : {}),
          tags,
        },
        overrideAccess: true,
      })
      console.log(`  [case_study] OK: ${story.slug}`)
      count++
    } catch (err) {
      console.error(`  [case_study] ERROR: ${story.slug}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

async function migrateTeamMembers(
  payload: PayloadInstance,
  stories: SbStory[],
): Promise<number> {
  const filtered = stories.filter(
    (s): s is SbStory & { content: SbTeamMemberContent } =>
      s.content.component === 'team_member',
  )

  let count = 0
  for (const story of filtered) {
    try {
      const photoId = await uploadMedia(payload, story.content.photo, story.content.photo?.filename ?? 'photo')

      await payload.create({
        collection: 'team-members',
        data: {
          name: story.content.name ?? story.name,
          role: story.content.role ?? '',
          bio: story.content.bio,
          ...(photoId !== null ? { photo: photoId } : {}),
        },
        overrideAccess: true,
      })
      console.log(`  [team_member] OK: ${story.slug}`)
      count++
    } catch (err) {
      console.error(`  [team_member] ERROR: ${story.slug}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

async function migrateServices(
  payload: PayloadInstance,
  stories: SbStory[],
): Promise<number> {
  const filtered = stories.filter(
    (s): s is SbStory & { content: SbServiceContent } =>
      s.content.component === 'service_item',
  )

  let count = 0
  for (const story of filtered) {
    try {
      await payload.create({
        collection: 'services',
        data: {
          title: story.content.title ?? story.name,
          description: story.content.description ?? '',
          icon: story.content.icon,
        },
        overrideAccess: true,
      })
      console.log(`  [service_item] OK: ${story.slug}`)
      count++
    } catch (err) {
      console.error(`  [service_item] ERROR: ${story.slug}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Loading Payload config...')
  // Config is statically imported via the `@payload-config` alias (see top of
  // file). Run with `payload run` (cwd = cms/, i.e. `npm run migrate -w @repo/cms`)
  // so Payload's loader resolves the alias and the config's extensionless TS
  // imports. Running this file directly with tsx fails: tsx CJS-transforms
  // payload's `@next/env` import and the default export comes back undefined.
  const payload = (await getPayload({ config })) as unknown as PayloadInstance

  console.log('Fetching stories from Storyblok...')
  const stories = await fetchAllStories()
  console.log(`Total stories fetched: ${stories.length}`)

  console.log('\nMigrating pages...')
  const pagesCount = await migratePages(payload, stories)

  console.log('\nMigrating case studies...')
  const caseStudiesCount = await migrateCaseStudies(payload, stories)

  console.log('\nMigrating team members...')
  const teamMembersCount = await migrateTeamMembers(payload, stories)

  console.log('\nMigrating services...')
  const servicesCount = await migrateServices(payload, stories)

  console.log(
    `\nMigrated: ${pagesCount} pages, ${caseStudiesCount} case studies, ${teamMembersCount} team members, ${servicesCount} services`,
  )
}

try {
  await main()
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
