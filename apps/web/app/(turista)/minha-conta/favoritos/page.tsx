'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import FavoriteButton from '@/src/components/turista/FavoriteButton'
import EmptyState from '@/src/components/turista/EmptyState'
import { apiClient } from '@/src/lib/api-client'

type Favorite = {
  id: string
  type: 'package' | 'destination'
  packageId?: string
  destinationId?: string
  packageName?: string
  packageCoverUrl?: string
  packagePrice?: number
  packageTenantSlug?: string
  destinationTitle?: string
  destinationSlug?: string
  destinationImageUrl?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient<{ data: Favorite[] }>('/me/favorites')
      .then(({ ok, data }) => setFavorites(ok ? (data?.data ?? []) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleRemove(id: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== id))
    apiClient(`/me/favorites/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const name = (f: Favorite) =>
    f.type === 'package' ? (f.packageName ?? '') : (f.destinationTitle ?? '')
  const thumb = (f: Favorite) =>
    f.type === 'package' ? (f.packageCoverUrl ?? '') : (f.destinationImageUrl ?? '')
  const href = (f: Favorite) =>
    f.type === 'package'
      ? `/explorar?q=${encodeURIComponent(f.packageName ?? '')}`
      : `/destinos/${f.destinationSlug ?? ''}`

  return (
    <>
      <style>{`
        .favoritos-page__title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 var(--space-6, 24px);
        }
        .favoritos-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3, 12px);
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .favoritos-card {
          display: flex;
          align-items: center;
          gap: var(--space-3, 12px);
          padding: var(--space-3, 12px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          text-decoration: none;
          color: inherit;
          position: relative;
          transition: box-shadow 0.15s;
        }
        .favoritos-card:hover {
          box-shadow: var(--shadow-sm);
        }
        .favoritos-card__thumb {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-md);
          object-fit: cover;
          flex-shrink: 0;
          background: var(--bg-subtle);
        }
        .favoritos-card__thumb--placeholder {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-md);
          background: var(--bg-subtle);
          flex-shrink: 0;
        }
        .favoritos-card__body {
          flex: 1;
          min-width: 0;
        }
        .favoritos-card__name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text);
          margin: 0 0 var(--space-1, 4px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .favoritos-card__price {
          font-size: var(--text-xs, 12px);
          color: var(--text-secondary);
          margin: 0;
        }
        .favoritos-card__fav {
          flex-shrink: 0;
        }
        .favoritos-loading {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          padding: var(--space-6, 24px) 0;
        }
      `}</style>

      <h1 className="favoritos-page__title">Meus favoritos</h1>

      {loading && <p className="favoritos-loading">Carregando...</p>}

      {!loading && favorites.length === 0 && (
        <EmptyState
          title="Nenhum favorito salvo"
          description="Explore destinos e roteiros e salve os que mais gostar."
          ctaLabel="Explorar"
          ctaHref="/explorar"
        />
      )}

      {!loading && favorites.length > 0 && (
        <ul className="favoritos-list">
          {favorites.map((f) => (
            <li key={f.id}>
              <Link href={href(f)} className="favoritos-card">
                {thumb(f) ? (
                  <Image
                    src={thumb(f)}
                    alt={name(f)}
                    width={72}
                    height={72}
                    className="favoritos-card__thumb"
                  />
                ) : (
                  <div className="favoritos-card__thumb--placeholder" aria-hidden="true" />
                )}
                <div className="favoritos-card__body">
                  <p className="favoritos-card__name">{name(f)}</p>
                  {f.type === 'package' && f.packagePrice != null && (
                    <p className="favoritos-card__price">
                      {f.packagePrice.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                  )}
                </div>
                <div className="favoritos-card__fav">
                  <FavoriteButton
                    isFavorite
                    onToggle={() => handleRemove(f.id)}
                    packageId={f.packageId}
                    destinationId={f.destinationId}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
