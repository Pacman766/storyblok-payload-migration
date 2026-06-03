// Reset migrated content: deletes all docs from the content collections so the
// (non-idempotent) migration can be re-run from a clean state. Does NOT touch
// the `users` collection. Run via `payload run` like the migration itself:
//   npm run reset -w @repo/migration
import { getPayload } from 'payload'
import config from '@payload-config'

interface PayloadInstance {
  delete: (options: {
    collection: string
    where: Record<string, unknown>
    overrideAccess?: boolean
  }) => Promise<{ docs: unknown[] }>
}

const COLLECTIONS = ['pages', 'case-studies', 'team-members', 'services', 'media'] as const

async function main(): Promise<void> {
  const payload = (await getPayload({ config })) as unknown as PayloadInstance
  for (const slug of COLLECTIONS) {
    try {
      const res = await payload.delete({
        collection: slug,
        where: { id: { exists: true } },
        overrideAccess: true,
      })
      console.log(`  cleared ${slug}: ${res.docs.length}`)
    } catch (err) {
      console.error(`  ERROR clearing ${slug}:`, err instanceof Error ? err.message : err)
    }
  }
}

try {
  await main()
  process.exit(0)
} catch (err) {
  console.error('Reset failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
