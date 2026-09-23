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
      style={{ backgroundColor: "var(--color-primary-dark, #5C3D2E)", color: "#fff" }}
    >
      <div
        className="mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8"
        style={{ maxWidth: "1200px", padding: "3rem 1.25rem 2rem" }}
      >
        {/* Logo + tagline */}
        <div className="flex flex-col items-center md:items-start gap-3">
          <Link href="/" aria-label="CAPI — página inicial">
            <Image
              src="/images/logo.png"
              alt="CAPI"
              width={64}
              height={58}
              style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }}
            />
          </Link>
          <p
            className="text-sm text-center md:text-left"
            style={{ color: "rgba(255,255,255,0.7)", maxWidth: "200px", lineHeight: 1.5 }}
          >
            caminho entre quem explora e quem opera
          </p>
        </div>

        {/* Links */}
        <nav aria-label="Links do rodapé">
          <ul className="flex flex-col md:flex-row flex-wrap gap-x-6 gap-y-3 list-none p-0 m-0 text-center md:text-left">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm no-underline transition-opacity hover:opacity-80"
                  style={{ color: "rgba(255,255,255,0.75)" }}
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
        className="mx-auto text-center"
        style={{
          maxWidth: "1200px",
          padding: "1rem 1.25rem 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.45)",
          fontSize: "0.75rem",
        }}
      >
        &copy; {year} CAPI. Todos os direitos reservados.
      </div>
    </footer>
  );
}
