'use client'
import { useEffect, useState } from 'react'

export interface Operadora {
  id: string
  name: string
  slug: string
}

/** Operadoras aprovadas, em ordem alfabética: só nelas a equipe cadastra roteiros. */
export function useOperadoras() {
  const [operadoras, setOperadoras] = useState<Operadora[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // 100 é o máximo da API; a CAPI está longe disso
    fetch('/api/super-admin/tenants/all?status=APPROVED&limit=100&offset=0')
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: { tenants?: Operadora[] }) => {
        const list = (data.tenants ?? []).map(({ id, name, slug }) => ({ id, name, slug }))
        setOperadoras(list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return { operadoras, loading, error }
}
