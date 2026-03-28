'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

interface ContactFormData {
  name: string
  email: string
  message: string
}

interface ContactFormProps {
  titre: string
  introContent: unknown
}

export function ContactForm({ titre }: ContactFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, isSubmitting },
  } = useForm<ContactFormData>({ mode: 'onChange' })
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  async function onSubmit(data: ContactFormData) {
    setStatus(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      setStatus({ type: 'success', message: 'Message envoyé avec succès !' })
      reset()
    } catch {
      setStatus({ type: 'error', message: 'Erreur lors de l\'envoi du message.' })
    }
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">{titre}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Nom et prénom <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              {...register('name', { required: true })}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Email <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="email"
              {...register('email', { required: true })}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Message <span className="text-error">*</span>
              </span>
            </label>
            <textarea
              {...register('message', { required: true })}
              className="textarea textarea-bordered w-full h-32"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push('/home')}
            >
              Retour
            </button>
          </div>

          {status && (
            <div
              className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}
            >
              <span>{status.message}</span>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}
