import { notFound, redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface Props {
  params: Promise<{ 'destination-slug': string; id: string }>;
}

/** A página oficial do roteiro (com reserva e modo edição) é `/{tenantSlug}/roteiros/{id}`. */
export default async function RoteiroRedirectPage({ params }: Props) {
  const { 'destination-slug': slug, id } = await params;

  let tenantSlug: string | undefined;
  try {
    const res = await fetch(`${API_URL}/destinations/${encodeURIComponent(slug)}/packages`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const packages = await res.json();
      if (Array.isArray(packages)) {
        tenantSlug = packages.find((p: { id: string }) => p.id === id)?.tenantSlug;
      }
    }
  } catch {
    // trata como não encontrado
  }

  if (!tenantSlug) notFound();
  redirect(`/${tenantSlug}/roteiros/${id}`);
}
