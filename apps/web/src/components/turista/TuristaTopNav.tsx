'use client'

import Link from 'next/link'
import Image from 'next/image'

type Props = {
  userName?: string | null
  userPhotoUrl?: string | null
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function TuristaTopNav({ userName, userPhotoUrl }: Props) {
  return (
    <>
      <style>{`
        .turista-topnav {
          position: sticky;
          top: 0;
          z-index: var(--z-nav);
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 var(--gutter-mobile);
          background: var(--glass);
          -webkit-backdrop-filter: saturate(1.6) blur(16px);
          backdrop-filter: saturate(1.6) blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .turista-topnav__logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .turista-topnav__avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-subtle);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 700;
          border: 1.5px solid var(--border);
          text-decoration: none;
          flex-shrink: 0;
        }
        .turista-topnav__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        @media (min-width: 1024px) {
          .turista-topnav {
            padding: 0 var(--gutter-tablet);
          }
        }
      `}</style>
      <header className="turista-topnav">
        <Link href="/" className="turista-topnav__logo" aria-label="CAPI — página inicial">
          <Image src="/images/logo-animated.svg" alt="CAPI" width={52} height={28} priority />
        </Link>
        <Link href="/minha-conta/perfil" className="turista-topnav__avatar" aria-label="Meu perfil">
          {userPhotoUrl ? (
            <Image src={userPhotoUrl} alt={userName ?? 'Avatar'} width={36} height={36} />
          ) : (
            <span aria-hidden="true">{initials(userName)}</span>
          )}
        </Link>
      </header>
    </>
  )
}
