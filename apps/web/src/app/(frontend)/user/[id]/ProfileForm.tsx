'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

interface ProfileFormData {
  username: string
  nom: string
  prenom: string
  telephone: string
  date_naissance: string
}

interface ProfileFormProps {
  userId: string
  isOwnProfile: boolean
  initialData: ProfileFormData
}

export function ProfileForm({ userId, isOwnProfile, initialData }: ProfileFormProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileFormData>({ defaultValues: initialData })
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function onSubmit(data: ProfileFormData) {
    setStatus(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone,
          date_naissance: data.date_naissance || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Erreur lors de la sauvegarde')
      }
      setStatus({ type: 'success', message: 'Profil mis à jour avec succès.' })
      setEditing(false)
      router.refresh()
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Pseudo</span>
          </label>
          <input
            type="text"
            {...register('username')}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nom</span>
          </label>
          <input
            type="text"
            {...register('nom')}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Prénom</span>
          </label>
          <input
            type="text"
            {...register('prenom')}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Téléphone</span>
          </label>
          <input
            type="text"
            {...register('telephone')}
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Date de naissance</span>
          </label>
          <input
            type="date"
            {...register('date_naissance')}
            className="input input-bordered"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setEditing(false)
            reset(initialData)
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
    </form>
  )
}
