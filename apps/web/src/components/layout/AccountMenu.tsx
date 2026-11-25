'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ChevronDown, LogIn, LogOut, Pencil } from 'lucide-react'
import { Avatar, Button } from '@/src/components/ui/capi'
import { useEditMode } from '@/src/components/edit-mode/EditModeProvider'
import { accountLinks } from '@/src/lib/account-links'
import { NotificationBell } from './NotificationBell'

/**
 * Ponto único de conta no cabeçalho (padrão Airbnb/GetYourGuide/Viator):
 * deslogado → "Entrar"; logado → sino + avatar com o menu do perfil e "Sair".
 */
export function AccountMenu({ showBell = true }: { showBell?: boolean }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { available, enabled, setEnabled } = useEditMode()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Reserva o espaço enquanto a sessão carrega: sem "Entrar" piscando para quem está logado
  if (status === 'loading') return <span className="capi-account__placeholder" aria-hidden="true" />

  if (status !== 'authenticated' || !session?.user) {
    return (
      <Button
        href={`/login?callbackUrl=${encodeURIComponent(pathname || '/')}`}
        variant="secondary"
        size="sm"
        iconLeft={LogIn}
      >
        Entrar
      </Button>
    )
  }

  const user = session.user
  const role = user.role as string | undefined
  const name = user.name ?? user.email ?? 'Minha conta'
  const firstName = name.split(' ')[0]
  const links = accountLinks(role, user.tenantSlug)
  const close = () => setOpen(false)

  return (
    <div className="capi-account" ref={rootRef}>
      <style>{`
        .capi-account { position: relative; display: flex; align-items: center; gap: var(--space-1); }
        .capi-account__placeholder { display: inline-block; width: 36px; height: 36px; }
        .capi-account__trigger {
          display: inline-flex; align-items: center; gap: var(--space-2);
          min-height: var(--touch-target); padding: 3px 10px 3px 3px;
          border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
          border-radius: var(--radius-pill);
          background: transparent; color: inherit; cursor: pointer;
          font: inherit; font-size: 14px; font-weight: 600;
          transition: background-color .15s ease, box-shadow .15s ease;
        }
        .capi-account__trigger:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
        .capi-account__trigger:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .capi-account__name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media (max-width: 639px) {
          .capi-account__name, .capi-account__chevron { display: none; }
          .capi-account__trigger { padding: 3px; }
        }
        .capi-account__menu {
          position: absolute; right: 0; top: calc(100% + 8px); z-index: var(--z-overlay);
          min-width: 240px; padding: var(--space-2) 0;
          background: var(--surface-raised); color: var(--text);
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          font-family: var(--font-sans);
        }
        .capi-account__who { padding: var(--space-2) var(--space-4) var(--space-3); border-bottom: 1px solid var(--border); margin-bottom: var(--space-2); }
        .capi-account__who strong { display: block; font-size: 15px; }
        .capi-account__who span { display: block; font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; }
        .capi-account__item {
          display: flex; align-items: center; gap: var(--space-2); width: 100%;
          min-height: var(--touch-target); padding: 0 var(--space-4);
          background: none; border: 0; text-align: left; cursor: pointer;
          font: inherit; font-size: 15px; color: var(--text); text-decoration: none;
        }
        .capi-account__item:hover, .capi-account__item:focus-visible { background: var(--bg-subtle); outline: none; }
        .capi-account__item[aria-checked="true"] { font-weight: 600; }
        .capi-account__sep { height: 1px; margin: var(--space-2) 0; background: var(--border); }
      `}</style>

      {showBell ? <NotificationBell role={role} /> : null}

      <button
        ref={triggerRef}
        type="button"
        className="capi-account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu da conta de ${name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} src={user.photoUrl} size={30} />
        <span className="capi-account__name">{firstName}</span>
        <ChevronDown className="capi-account__chevron" size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div className="capi-account__menu" role="menu" aria-label="Conta">
          <div className="capi-account__who">
            <strong>{name}</strong>
            {user.email && user.email !== name ? <span>{user.email}</span> : null}
          </div>
          {links.map((l) => (
            <Link
              key={l.href}
              role="menuitem"
              href={l.href}
              className="capi-account__item"
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
          {available ? (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={enabled}
              className="capi-account__item"
              onClick={() => {
                setEnabled(!enabled)
                close()
              }}
            >
              <Pencil size={16} aria-hidden="true" />
              {enabled ? 'Sair do modo edição' : 'Modo edição'}
            </button>
          ) : null}
          <div className="capi-account__sep" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="capi-account__item"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  )
}
