'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isValid = username.trim() && password.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.errors?.[0]?.message || 'Identifiants incorrects.',
        )
      }

      router.push('/home')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-4">
      <div className="card bg-base-200 shadow-md w-full max-w-md">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center">Connectez-vous</h1>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Pseudo</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Votre pseudo ou email"
                required
                autoComplete="username"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Votre mot de passe"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!isValid || loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="divider">ou</div>

          <Link
            href="/oubli-pass"
            className="link link-primary text-center text-sm"
          >
            Mot de passe oublié ?
          </Link>

          <div className="mt-4 text-center">
            <p className="text-sm text-base-content/60">Nouveau sur le site ?</p>
            <Link href="/adhesion" className="btn btn-outline btn-sm mt-2">
              {"Adhérer à l'association"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
