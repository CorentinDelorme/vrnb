import { getPayloadInstance } from '@/lib/payload'
import { RichTextContent } from '@/lib/utils'

import type { Adhesion as AdhesionType } from '@/payload-types'

export const metadata = {
  title: 'Adhésion — VRNB',
  description: 'Rejoignez l\'association VRNB',
}

export default async function AdhesionPage() {
  const payload = await getPayloadInstance()
  const data = (await payload.findGlobal({ slug: 'adhesion' })) as AdhesionType

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold">{data.titre || 'Adhésion'}</h1>
      </section>

      {data.description && (
        <section className="container mx-auto px-4 max-w-4xl">
          <RichTextContent content={data.description} />
        </section>
      )}
    </div>
  )
}
