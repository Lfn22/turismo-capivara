import { S3Client } from '@aws-sdk/client-s3'

/**
 * Lazy R2 client factory.
 *
 * Credentials are read at call time (not at module load time) so that tests
 * that mock @aws-sdk/client-s3 can import this module without requiring real
 * env vars to be present. In production all three vars are required — the
 * service layer will throw if getR2Client() is called without them.
 */
export function getR2Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Variáveis R2 ausentes: CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN são obrigatórias',
    )
  }

  // R2 API token format: <accessKeyId>:<secretAccessKey>
  const [accessKeyId, secretAccessKey] = apiToken.split(':')

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) {
    throw new Error('Variável R2 ausente: R2_BUCKET_NAME é obrigatória')
  }
  return bucket
}

export function getR2PublicUrl(): string {
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicUrl) {
    throw new Error(
      'Variável R2 ausente: R2_PUBLIC_URL é obrigatória (copie a URL pública do dashboard Cloudflare R2 → seu bucket → Public URL)',
    )
  }
  return publicUrl.replace(/\/$/, '')
}
