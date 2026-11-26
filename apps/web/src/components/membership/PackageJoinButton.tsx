'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/src/components/ui/capi'
import { callProxy } from './membership-shared'

type LinkState = 'PENDING' | 'REJECTED' | 'IN'

type MyMemberships = {
  approved: boolean
  conductorPackageIds: string[]
  packages: { id: string; state: LinkState }[]
}

// Uma chamada por página, compartilhada por todos os cards da lista.
let cache: Promise<MyMemberships | null> | null = null
function loadMemberships() {
  cache ??= callProxy('/guides/me/memberships', 'GET').then(({ res, data }) =>
    res.ok ? (data as unknown as MyMemberships) : null,
  )
  return cache
}

/**
 * Botão compacto para o guia pedir para atuar num roteiro, exibido abaixo dos cards.
 * Só aparece para guia logado; a página do roteiro tem a versão completa (cancelar, sair).
 */
export default function PackageJoinButton({ packageId }: { packageId: string }) {
  const { data: session, status } = useSession()
  const isGuide = status === 'authenticated' && session?.user?.role === 'CONDUTOR'
  const [info, setInfo] = useState<{
    approved: boolean
    own: boolean
    state: LinkState | null
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isGuide) return
    let cancelled = false
    void loadMemberships().then((m) => {
      if (cancelled || !m) return
      setInfo({
        approved: m.approved,
        own: (m.conductorPackageIds ?? []).includes(packageId),
        state: m.packages.find((p) => p.id === packageId)?.state ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [isGuide, packageId])

  if (!isGuide || !info || info.own) return null

  async function request() {
    setBusy(true)
    setError(null)
    try {
      const { res, data } = await callProxy(`/packages/${packageId}/guides/me`, 'POST')
      if (!res.ok) {
        setError(data?.message ?? 'Não foi possível enviar o pedido.')
        return
      }
      cache = null // próximo carregamento reflete o pedido
      setInfo((prev) => (prev ? { ...prev, state: 'PENDING' } : prev))
    } catch {
      setError('Não foi possível enviar o pedido.')
    } finally {
      setBusy(false)
    }
  }

  const note = (text: string) => (
    <p className="text-sm text-fg-secondary" style={{ margin: 0 }}>
      {text}
    </p>
  )

  return (
    <div
      style={{
        marginTop: 'var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}
    >
      {!info.approved ? (
        note('Disponível após verificação')
      ) : info.state === 'IN' ? (
        note('Você atua aqui ✓')
      ) : info.state === 'PENDING' ? (
        note('Pedido enviado · aguardando aprovação')
      ) : (
        <Button size="sm" variant="secondary" loading={busy} disabled={busy} onClick={request}>
          {info.state === 'REJECTED' ? 'Pedir de novo' : 'Quero atuar neste roteiro'}
        </Button>
      )}
      {error ? (
        <p className="text-sm" style={{ margin: 0, color: 'var(--danger-600, #b91c1c)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
