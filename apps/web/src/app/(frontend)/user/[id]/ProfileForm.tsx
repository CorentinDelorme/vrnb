'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  userId: string
  isOwnProfile: boolean
  initialData: {
    username: string
    nom: string
    prenom: string
    telephone: string
    date_naissance: string
  }
}

export function ProfileForm({ userId, isOwnProfile, initialData }: ProfileFormProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(initialData)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          nom: form.nom,
          prenom: form.prenom,
          telephone: form.telephone,
          date_naissance: form.date_naissance || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur lors de la sauvegarde')
      }
      setStatus({ type: 'success', message: 'Profil mis à jour avec succès.' })
      setEditing(false)
      router.refresh()
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOwnProfile || !editing) {
    return (
      <>
        {isOwnProfile && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setEditing(true)}
          >
            Modifier
          </button>
        )}
        {status && (
          <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'} mt-4`}>
            <span>{status.message}</span>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Pseudo</span>
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nom</span>
          </label>
          <input
            type="text"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Prénom</span>
          </label>
          <input
            type="text"
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Téléphone</span>
          </label>
          <input
            type="text"
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Date de naissance</span>
          </label>
          <input
            type="date"
            value={form.date_naissance}
            onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
            className="input input-bordered"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setEditing(false)
            setForm(initialData)
          }}
        >
          Annuler
        </button>
      </div>

      {status && (
        <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{status.message}</span>
        </div>
      )}
    </div>
  )
}
