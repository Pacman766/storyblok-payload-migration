import type { Block, CollectionConfig } from 'payload'

const HeroBlock: Block = {
  slug: 'hero',
  fields: [
    {
      name: 'headline',
      type: 'text',
    },
    {
      name: 'subheadline',
      type: 'text',
    },
    {
      name: 'cta_label',
      type: 'text',
    },
    {
      name: 'cta_url',
      type: 'text',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}

const TestimonialBlock: Block = {
  slug: 'testimonial',
  fields: [
    {
      name: 'quote',
      type: 'text',
    },
    {
      name: 'author_name',
      type: 'text',
    },
    {
      name: 'author_role',
      type: 'text',
    },
    {
      name: 'author_photo',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'body',
      type: 'blocks',
      blocks: [HeroBlock, TestimonialBlock],
    },
  ],
}
