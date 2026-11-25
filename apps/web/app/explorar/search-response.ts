import type { SearchPackage } from './components/PackageListPanel'

export interface SearchPage {
  packages: SearchPackage[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * GET /packages/search responde { data, nextCursor, hasMore } com priceFrom em REAIS.
 * O PackageCard e o mapa trabalham em CENTAVOS (como o resto do site).
 */
export function parseSearchResponse(body: unknown): SearchPage {
  const b = (body ?? {}) as { data?: unknown; nextCursor?: unknown; hasMore?: unknown }
  const list = Array.isArray(b.data) ? (b.data as SearchPackage[]) : []
  return {
    packages: list.map((p) => ({ ...p, priceFrom: Math.round(Number(p.priceFrom) * 100) })),
    nextCursor: typeof b.nextCursor === 'string' ? b.nextCursor : null,
    hasMore: b.hasMore === true,
  }
}

/** Filtro de preço digitado pelo usuário → valor em reais para a API (que compara em reais). */
export function priceFilterParam(input: string): string | undefined {
  const n = Number(input.replace(',', '.'))
  return Number.isFinite(n) && input.trim() !== '' ? String(n) : undefined
}
