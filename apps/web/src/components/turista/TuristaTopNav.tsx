'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AccountMenu } from '@/src/components/layout/AccountMenu'

export default function TuristaTopNav() {
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
          color: var(--text);
        }
        .turista-topnav__logo {
          display: flex;
          align-items: center;
          text-decoration: none;
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
        <AccountMenu />
      </header>
    </>
  )
}
