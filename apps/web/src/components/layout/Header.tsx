"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#destinos", label: "Destinos" },
  { href: "/#guias", label: "Guias" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-[100] w-full"
      style={{
        height: "56px",
        backgroundColor: "rgba(31, 14, 8, 0.93)",
        backdropFilter: "blur(12px) saturate(1.4)",
        WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      }}
    >
      <div
        className="mx-auto flex items-center justify-between h-full"
        style={{ maxWidth: "1200px", padding: "0 1.25rem" }}
      >
        {/* Logo */}
        <Link href="/" aria-label="CAPI — página inicial" className="flex items-center shrink-0">
          <Image
            src="/images/logo.png"
            alt="CAPI"
            width={52}
            height={47}
            style={{ filter: "brightness(0) invert(1)" }}
            priority
          />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium no-underline transition-opacity hover:opacity-80"
              style={{ color: "var(--stone-200)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium no-underline transition-opacity hover:opacity-80"
            style={{ color: "var(--stone-300)" }}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="text-sm font-semibold no-underline rounded-full transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-primary)",
              color: "#fff",
              padding: "7px 18px",
            }}
          >
            Cadastrar
          </Link>
        </div>

        {/* Hamburger mobile */}
        <button
          className="flex md:hidden items-center justify-center"
          style={{ width: "40px", height: "40px", color: "var(--stone-200)" }}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
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

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div
          className="md:hidden flex flex-col"
          style={{
            backgroundColor: "rgba(18, 8, 4, 0.97)",
            padding: "1rem 1.25rem 1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-3 text-base font-medium no-underline border-b transition-opacity hover:opacity-80"
              style={{
                color: "var(--stone-200)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-5">
            <Link
              href="/login"
              className="text-center py-3 text-base font-medium no-underline rounded-xl transition-opacity hover:opacity-80"
              style={{ color: "var(--stone-200)", border: "1px solid rgba(255,255,255,0.15)" }}
              onClick={() => setMenuOpen(false)}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="text-center py-3 text-base font-semibold no-underline rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "var(--color-primary)", color: "#fff" }}
              onClick={() => setMenuOpen(false)}
            >
              Cadastrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
