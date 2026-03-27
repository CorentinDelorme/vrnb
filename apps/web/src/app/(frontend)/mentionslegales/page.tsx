import { getPayloadInstance } from '@/lib/payload'
import { RichTextContent } from '@/lib/utils'

import type { MentionsLegale } from '@/payload-types'

export const metadata = {
  title: 'Mentions légales — VRNB',
  description: 'Mentions légales de l\'association VRNB',
}

export default async function MentionsLegalesPage() {
  const payload = await getPayloadInstance()
  const data = (await payload.findGlobal({ slug: 'mentions-legales' })) as MentionsLegale

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold">{data.titre || 'Mentions légales'}</h1>
      </section>

      {data.paragraphes && data.paragraphes.length > 0 && (
        <section className="container mx-auto px-4 max-w-4xl space-y-8">
          {data.paragraphes.map((para, index) => (
            <div key={para.id ?? index}>
              {para.titre && (
                <h2 className="text-2xl font-bold mb-3">{para.titre}</h2>
              )}
              <RichTextContent content={para.contenu} />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
