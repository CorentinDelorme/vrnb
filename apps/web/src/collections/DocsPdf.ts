import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const DocPdf: CollectionConfig = {
  slug: 'docs-pdf',
  access: adminOnlyWrite,
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
