'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const isValid = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      // Always show success message (to prevent email enumeration)
      if (res.ok || res.status === 400) {
        setStatus({
          type: 'success',
          message:
            'Si un compte est associé à cette adresse, un email de réinitialisation a été envoyé.',
        })
        setEmail('')
      } else {
        throw new Error('Erreur serveur')
      }
    } catch {
      setStatus({
        type: 'error',
        message: 'Erreur lors de l\'envoi. Veuillez réessayer.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-4">
      <div className="card bg-base-200 shadow-md w-full max-w-md">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center">
            Réinitialisation du mot de passe
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Votre adresse email"
                required
                autoComplete="email"
              />
            </div>

            {status && (
              <div
                className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}
              >
                <span>{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!isValid || loading}
            >
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="link link-primary text-sm">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
