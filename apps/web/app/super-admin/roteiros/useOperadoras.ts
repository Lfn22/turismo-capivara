'use client'
import { useEffect, useState } from 'react'

export interface Operadora {
  id: string
  name: string
  slug: string
}

// Tenants de sistema: equipe CAPI, contas de turista e guias autônomos — não são operadoras
const SYSTEM_TENANT_SLUGS = new Set(['capi-platform', 'capi', 'independente'])

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
        const list = (data.tenants ?? [])
          .filter((t) => !SYSTEM_TENANT_SLUGS.has(t.slug))
          .map(({ id, name, slug }) => ({ id, name, slug }))
        setOperadoras(list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return { operadoras, loading, error }
}
