import Link from "next/link";
import Image from "next/image";

const FOOTER_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#destinos", label: "Destinos" },
  { href: "/#guias", label: "Guias" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="bg-[var(--color-primary-dark)] text-white relative"
      style={{
        background: 'linear-gradient(180deg, var(--color-primary-dark) 0%, var(--stone-700) 50%, var(--color-text) 100%)',
        borderTop: '1px solid rgba(196, 133, 42, 0.2)',
      }}
    >
      <div
        className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-5 md:px-12 py-12 md:py-20"
      >
        {/* Logo + tagline */}
        <div className="flex flex-col items-center md:items-start gap-3">
          <Link href="/" aria-label="CAPI — página inicial">
            <Image
              src="/images/logo-white.svg"
              alt="CAPI"
              width={64}
              height={58}
            />
          </Link>
        </div>

        {/* Links */}
        <nav aria-label="Links do rodapé">
          <ul className="flex flex-col md:flex-row flex-wrap gap-x-6 gap-y-3 list-none p-0 m-0 text-center">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm no-underline transition-all duration-200 hover:text-[var(--ochre-light)]"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Copyright */}
      <div
        className="mx-auto max-w-[1200px] border-t border-white/12 px-5 py-4 pb-6 text-center text-xs text-white/60"
      >
        &copy; {year} CAPI. Todos os direitos reservados.
      </div>
    </footer>
  );
}
