import Link from 'next/link'
import Image from 'next/image'
import { TopNav } from '@/src/components/ui/capi'
import { AccountMenu } from './AccountMenu'

const LINKS = [
  { href: '/destinos', label: 'Destinos' },
  { href: '/explorar', label: 'Explorar' },
]

/** Cabeçalho padrão do site (logo, Destinos/Explorar e conta) para páginas sem cabeçalho próprio. */
export function SiteHeader() {
  return (
    <TopNav
      links={LINKS}
      logo={
        <Link
          href="/"
          aria-label="CAPI — página inicial"
          className="inline-flex items-center"
          style={{ minHeight: 'var(--touch-target)' }}
        >
          <Image
            src="/images/logo.png"
            alt="CAPI"
            width={40}
            height={36}
            priority
            style={{ height: 36, width: 'auto', display: 'block' }}
          />
        </Link>
      }
      actions={<AccountMenu />}
    />
  )
}
