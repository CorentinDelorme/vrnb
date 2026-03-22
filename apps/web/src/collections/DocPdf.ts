import type { CollectionConfig } from 'payload'

export const DocPdf: CollectionConfig = {
  slug: 'doc-pdf',
  admin: {
    useAsTitle: 'nompdf',
    defaultColumns: ['nompdf', 'pdfactivite'],
  },
  fields: [
    {
      name: 'pdfactivite',
      type: 'relationship',
      relationTo: 'activite',
    },
    {
      name: 'nompdf',
      type: 'text',
      required: true,
    },
  ],
}
