import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getR2Bucket, getR2Client } from '../../shared/config/r2'
import { AppError } from '../../shared/errors/AppError'

export const CREDENTIAL_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const CREDENTIAL_MAX_BYTES = 10 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

let warnedFallback = false

/** Bucket privado dos comprovantes. Em produção é obrigatório; fora dela cai no bucket padrão. */
function credentialsBucket(): string {
  const bucket = process.env.R2_CREDENTIALS_BUCKET
  if (bucket) return bucket
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Armazenamento de comprovantes não configurado', 500)
  }
  if (!warnedFallback) {
    warnedFallback = true
    console.warn('[credentials] R2_CREDENTIALS_BUCKET não definido; usando o bucket padrão (apenas fora de produção)')
  }
  return getR2Bucket()
}

/** Grava o comprovante no R2 (sem URL pública) e devolve a chave. */
export async function putCredential(buffer: Buffer, mime: string): Promise<string> {
  const key = `credentials/${randomUUID()}.${EXT_BY_MIME[mime]}`
  await getR2Client().send(
    new PutObjectCommand({ Bucket: credentialsBucket(), Key: key, Body: buffer, ContentType: mime }),
  )
  return key
}

/** Lê o comprovante do R2. Só deve ser chamado por rotas restritas à equipe. */
export async function getCredential(key: string): Promise<{ body: Buffer; contentType: string }> {
  const res = await getR2Client().send(new GetObjectCommand({ Bucket: credentialsBucket(), Key: key }))
  const bytes = await res.Body!.transformToByteArray()
  return { body: Buffer.from(bytes), contentType: res.ContentType ?? 'application/octet-stream' }
}
