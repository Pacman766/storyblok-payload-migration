import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: {
    useAsTitle: 'filename',
  },
  upload: {
    staticDir: 'media',
  },
  fields: [],
}
