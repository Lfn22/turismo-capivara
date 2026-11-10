export type Utm = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

const STORAGE_KEY = 'capi-utm'
const MAX_LEN = 100

const PARAMS: Record<string, keyof Utm> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
}

export function parseUtm(search: string): Utm {
  const params = new URLSearchParams(search)
  const utm: Utm = {}
  for (const [param, key] of Object.entries(PARAMS)) {
    const value = params.get(param)?.trim()
    if (value) utm[key] = value.slice(0, MAX_LEN)
  }
  return utm
}

// Só grava se houver utmSource: navegar sem UTM não apaga a origem; a última com UTM vence.
export function saveUtm(utm: Utm): void {
  if (!utm.utmSource) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
  } catch {
    // storage indisponível: segue sem persistir
  }
}

export function loadUtm(): Utm {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Utm) : {}
  } catch {
    return {}
  }
}
