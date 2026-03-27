'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ContactFormProps {
  titre: string
  introContent: unknown
}

export function ContactForm({ titre }: ContactFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [sending, setSending] = useState(false)

  const isValid = form.name.trim() && form.email.trim() && form.message.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      setStatus({ type: 'success', message: 'Message envoyé avec succès !' })
      setForm({ name: '', email: '', message: '' })
    } catch {
      setStatus({ type: 'error', message: 'Erreur lors de l\'envoi du message.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">{titre}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Nom et prénom <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input input-bordered w-full"
              required
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
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Message <span className="text-error">*</span>
              </span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="textarea textarea-bordered w-full h-32"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || sending}
            >
              {sending ? 'Envoi...' : 'Envoyer'}
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
