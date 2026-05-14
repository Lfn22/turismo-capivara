import type { Metadata } from 'next';

// ── Data layer ────────────────────────────────────────────────────────────────
// TODO (Task 12): replace stub with real fetch to GET /api/destinations/:slug

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface DestinationMeta {
  title: string;
  description: string;
}

async function fetchDestinationMeta(slug: string): Promise<DestinationMeta> {
  try {
    const res = await fetch(`${API_URL}/destinations/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data?.title ?? slug,
        description: data?.description ?? '',
      };
    }
  } catch {
    // fallback to slug
  }
  return { title: slug, description: '' };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  const { title, description } = await fetchDestinationMeta(slug);

  return {
    title: {
      default: title,
      template: `%s — ${title}`,
    },
    description: description || `Explore ${title} com guias certificados.`,
    openGraph: {
      siteName: title,
      locale: 'pt_BR',
    },
  };
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function DestinationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Destination pages are standalone cinematic experiences — no shared nav.
  // Each page (landing, guias, guide profile) owns its own header/nav.
  return <>{children}</>;
}
