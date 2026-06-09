import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2Bucket, getR2PublicUrl } from '../../shared/config/r2'
import { AppError } from '../../shared/errors/AppError'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export interface PhotoValidationResult {
  valid: boolean
  error?: string
}

export function validatePhotoFile(
  sizeBytes: number,
  mimeType: string,
): PhotoValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: 'Formato inválido. Use JPEG, PNG ou WebP.',
    }
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Arquivo muito grande. O tamanho máximo é 5MB.',
    }
  }

  return { valid: true }
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.-]/g, '_')
}

export interface UploadResult {
  url: string
  key: string
}

export async function uploadPhotoToR2(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: 'destinations' | 'packages',
): Promise<UploadResult> {
  const client = getR2Client()
  const bucket = getR2Bucket()
  const publicUrl = getR2PublicUrl()

  const sanitized = sanitizeFileName(fileName)
  const key = `${folder}/${Date.now()}_${sanitized}`

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    )
  } catch {
    throw new AppError('Falha ao enviar arquivo. Tente novamente.', 500)
  }

  return {
    url: `${publicUrl}/${key}`,
    key,
  }
}

export async function deletePhotoFromR2(key: string): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )
  } catch {
    throw new AppError('Falha ao remover arquivo.', 500)
  }
}
