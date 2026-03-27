import type { Block } from 'payload'

export const ContactFormBlock: Block = {
  slug: 'contact-form-block',
  labels: {
    singular: 'Bloc Formulaire Contact',
    plural: 'Blocs Formulaire Contact',
  },
  fields: [
    {
      name: 'titre',
      type: 'text',
      required: true,
      defaultValue: 'Nous contacter',
    },
    {
      name: 'texte_intro',
      type: 'richText',
      admin: {
        description: "Texte d'introduction au-dessus du formulaire",
      },
    },
  ],
}
