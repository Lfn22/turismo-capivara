type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: unknown
  loaded: boolean
  version: string
  disablePushState?: boolean
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

const RESERVED_FIRST_SEGMENTS = new Set([
  'super-admin', 'admin', 'login', 'cadastro', 'conta', 'onboarding', 'pendencias', 'reset-password', 'guia', 'api', 'actions',
])

// Lista de permissão: o Pixel só carrega/rastreia páginas públicas de marketing (negar por padrão).
export function isPixelAllowedPath(pathname: string): boolean {
  const p = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  if (p === '/') return true
  const seg = p.split('/').filter(Boolean)
  if (seg[0] === 'destinos' || seg[0] === 'explorar' || seg[0] === 'guias') return true
  // Rotas fixas da app que não são slug de agência (ex.: /super-admin/guias não é página pública).
  if (seg[0] && RESERVED_FIRST_SEGMENTS.has(seg[0])) return false
  if (seg.length >= 2 && (seg[1] === 'roteiros' || seg[1] === 'guias')) return true
  return false
}

export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined') return

  if (!window.fbq) {
    // Stub de fila do snippet oficial: eventos disparados antes do script carregar ficam na fila.
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue.push(args)
    } as Fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    // Evita que o fbevents rastreie navegações via History API (poderia vazar páginas sensíveis).
    fbq.disablePushState = true
    window.fbq = fbq
    if (!window._fbq) window._fbq = fbq
  }

  if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = SCRIPT_SRC
    document.head.appendChild(script)
    window.fbq('init', pixelId)
  }
}

export function trackPixel(event: 'PageView' | 'Lead', params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', event, params)
}
