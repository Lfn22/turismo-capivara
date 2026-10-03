import { DestinationCard as CapiDestinationCard } from '@/src/components/ui/capi';

interface Props {
  slug: string;
  title: string;
  /** Mantido por compatibilidade; o card v2 é guiado pela foto e não exibe o resumo. */
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
  /** Override link destination. Defaults to /destinos/{slug} */
  href?: string;
  /** Heading level for the card name. Defaults to h2. */
  headingLevel?: 'h2' | 'h3';
  /** Opcionais (v2): contagens exibidas sob o nome. */
  packageCount?: number;
  guideCount?: number;
  priority?: boolean;
}

/** Wrapper legado → `DestinationCard` do CAPI v2 (foto 4:5, nome em Playfair sobre degradê). */
export default function DestinationCard({
  slug,
  title,
  state,
  heroImageUrl,
  heroImageBlurDataUrl,
  href,
  headingLevel = 'h2',
  packageCount,
  guideCount,
  priority,
}: Props) {
  return (
    <CapiDestinationCard
      title={title}
      href={href ?? `/destinos/${slug}`}
      state={state}
      imageUrl={heroImageUrl}
      imageBlurDataUrl={heroImageBlurDataUrl}
      headingLevel={headingLevel}
      packageCount={packageCount}
      guideCount={guideCount}
      priority={priority}
    />
  );
}
