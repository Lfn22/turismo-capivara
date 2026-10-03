import { GuideCard as CapiGuideCard } from '@/src/components/ui/capi';

export interface GuideCardGuide {
  id: string;
  name: string;
  photoUrl?: string | null;
  /** Mantido por compatibilidade (o Avatar v2 não usa blur). */
  photoBlurDataUrl?: string | null;
  specialties: string[];
  packageCount: number;
  rating?: number | null;
  reviewCount?: number | null;
  /** Opcionais (v2) */
  languages?: string[];
  verified?: boolean;
  yearsActive?: number | null;
}

export interface GuideCardProps {
  guide: GuideCardGuide;
  /** Href completo — o card é agnóstico de estrutura de rota */
  href: string;
}

/** Wrapper legado → `GuideCard` do CAPI v2 (card horizontal com avatar, nota e especialidades). */
export default function GuideCard({ guide, href }: GuideCardProps) {
  return (
    <CapiGuideCard
      href={href}
      guide={{
        name: guide.name,
        photoUrl: guide.photoUrl,
        verified: guide.verified,
        rating: guide.rating,
        reviewCount: guide.reviewCount,
        languages: guide.languages,
        specialties: guide.specialties,
        packageCount: guide.packageCount,
        yearsActive: guide.yearsActive,
      }}
    />
  );
}
