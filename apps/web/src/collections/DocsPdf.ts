import type { CollectionConfig } from 'payload'

export const DocPdf: CollectionConfig = {
  slug: 'docs-pdf',
  admin: {
    useAsTitle: 'nompdf',
    defaultColumns: ['nompdf', 'pdfactivite'],
  },
  fields: [
    {
      name: 'pdfactivite',
      type: 'relationship',
      relationTo: 'activites',
    },
    {
      name: 'nompdf',
      type: 'text',
      required: true,
    },
  ],
}
