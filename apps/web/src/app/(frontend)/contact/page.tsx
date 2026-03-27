import { getPayloadInstance } from '@/lib/payload'

import type { Contact as ContactType } from '@/payload-types'

import { ContactForm } from './ContactForm'

export const metadata = {
  title: 'Contact — VRNB',
  description: 'Contactez l\'association VRNB',
}

export default async function ContactPage() {
  const payload = await getPayloadInstance()
  const data = (await payload.findGlobal({ slug: 'contact' })) as ContactType

  return (
    <ContactForm
      titre={data.titre || 'Nous contacter'}
      introContent={data.texte_intro}
    />
  )
}
