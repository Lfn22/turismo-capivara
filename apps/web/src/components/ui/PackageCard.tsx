import { PackageCard as CapiPackageCard } from '@/src/components/ui/capi';

export interface PackageCardPackage {
  id: string;
  name: string;
  durationMinutes: number;
  priceFrom: number; // minimum price in BRL cents
  difficulty: 'EASY' | 'MODERATE' | 'HARD';
  coverImageUrl?: string | null;
  coverImageBlurDataUrl?: string | null;
  tags: string[];
  /** Opcionais (v2) */
  groupSize?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  guideName?: string | null;
}

export interface PackageCardProps {
  package: PackageCardPackage;
  /** Full href — card is route-agnostic */
  href: string;
}

/** Wrapper legado → `PackageCard` do CAPI v2 (foto 4:3, dificuldade, duração e preço por pessoa). */
export default function PackageCard({ package: pkg, href }: PackageCardProps) {
  return (
    <CapiPackageCard
      href={href}
      package={{
        name: pkg.name,
        durationMinutes: pkg.durationMinutes,
        priceFrom: pkg.priceFrom,
        difficulty: pkg.difficulty,
        coverImageUrl: pkg.coverImageUrl,
        coverImageBlurDataUrl: pkg.coverImageBlurDataUrl,
        tags: pkg.tags,
        groupSize: pkg.groupSize,
        rating: pkg.rating,
        reviewCount: pkg.reviewCount,
        guideName: pkg.guideName,
      }}
    />
  );
}
