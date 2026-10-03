'use client';

import { BookingBar } from '@/src/components/ui/capi';

interface Props {
  /** Preço já formatado (ex.: "R$ 180"). */
  price: string;
  /** Unidade exibida após o preço (ex.: "/pessoa"). */
  label: string;
  href: string;
  /** Opcionais (v2) */
  prefix?: string;
  ctaLabel?: string;
}

/**
 * Wrapper legado → `BookingBar` do CAPI v2: barra fixa no rodapé do celular,
 * some a partir de 1024px (onde entra o resumo lateral). A página deve usar
 * `.capi-has-bottombar .capi-has-bottombar--book` no `<main>`.
 */
export default function FloatingCTA({ price, label, href, prefix = 'a partir de', ctaLabel = 'Reservar' }: Props) {
  return <BookingBar price={price} unit={label} prefix={prefix} href={href} ctaLabel={ctaLabel} />;
}
