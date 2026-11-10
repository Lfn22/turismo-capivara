export function guideShareUrl(origin: string, guideProfileId: string): string {
  const base = origin.replace(/\/+$/, "")
  return `${base}/guias/${guideProfileId}?utm_source=guia&utm_medium=social&utm_campaign=${guideProfileId}`
}
