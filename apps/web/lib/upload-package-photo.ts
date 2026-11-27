import { compressImage } from '@/lib/compress-image'

export async function uploadPackagePhoto(file: File): Promise<string> {
  const toSend = await compressImage(file)
  const data = new FormData()
  data.append('file', toSend, toSend.name)
  const res = await fetch('/api/uploads/photos?folder=packages', { method: 'POST', body: data })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro no upload' }))
    throw new Error(err.message ?? 'Erro no upload')
  }
  const { url } = await res.json()
  return url
}
