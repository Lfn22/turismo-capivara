"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#destinos", label: "Destinos" },
  { href: "/#guias", label: "Guias" },
];

const HEADER_HEIGHT = 56; // manter em sincronia com scroll-padding-top no CSS global

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha com Esc e trava o scroll do body enquanto o menu está aberto
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--header-bg)] backdrop-blur-md">
      {/* Barra: altura fixa vive aqui, não no <header>, para o drawer não transbordar */}
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
        {/* Logo */}
        <Link href="/" aria-label="CAPI — página inicial" className="flex shrink-0 items-center">
          {/* Sirva a versão branca do logo direto (SVG de preferência), sem filter */}
          <Image src="/images/logo-white.svg" alt="CAPI" width={52} height={47} priority />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--stone-200)] no-underline transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--stone-300)] no-underline transition-colors hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-[var(--color-primary)] px-[18px] py-[7px] text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            Cadastrar
          </Link>
        </div>

        {/* Hamburger mobile */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-[var(--stone-200)] md:hidden"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Drawer mobile — irmão da barra, dentro do header, com scroll próprio */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Navegação móvel"
          className="flex max-h-[calc(100dvh-56px)] flex-col overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--header-bg-solid)] px-5 pb-6 pt-4 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-[var(--border-subtle)] py-3 text-base font-medium text-[var(--stone-200)] no-underline transition-colors hover:text-white"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-5 flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[var(--border-strong)] py-3 text-center text-base font-medium text-[var(--stone-200)] no-underline transition-colors hover:text-white"
              onClick={closeMenu}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-xl bg-[var(--color-primary)] py-3 text-center text-base font-semibold text-white no-underline transition-opacity hover:opacity-90"
              onClick={closeMenu}
            >
              Cadastrar
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
