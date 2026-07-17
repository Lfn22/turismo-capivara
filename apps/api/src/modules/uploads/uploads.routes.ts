import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import multipart from '@fastify/multipart'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { validatePhotoFile, uploadPhotoToR2 } from './uploads.service'
import { AppError } from '../../shared/errors/AppError'

const folderSchema = z.enum(['destinations', 'packages', 'guides'], {
  error: 'Folder inválido. Use "destinations", "packages" ou "guides".',
})

export async function uploadsRoutes(app: FastifyInstance) {
  // Register multipart support scoped to this plugin
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024 + 1, // slight buffer — service validates exact limit
      files: 1,
    },
  })

  // POST /uploads/photos — Upload de foto para R2
  // Auth: qualquer usuário autenticado (ADMIN, CONDUTOR, CLIENTE)
  app.post(
    '/uploads/photos',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'CONDUTOR', 'CLIENTE'])] },
    async (request, reply) => {
      // Validate query param: folder
      let folder: 'destinations' | 'packages' | 'guides'
      try {
        folder = folderSchema.parse((request.query as Record<string, string>).folder)
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            message: err.issues[0]?.message ?? 'Parâmetro folder inválido',
          })
        }
        throw err
      }

      // Read uploaded file — request.file() throws if content-type is not multipart
      let file: Awaited<ReturnType<typeof request.file>> | undefined
      try {
        file = await request.file()
      } catch {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
      }

      if (!file) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
      }

      const buffer = await file.toBuffer()

      // Validate file (size + mime)
      const validation = validatePhotoFile(buffer.length, file.mimetype)
      if (!validation.valid) {
        return reply.status(400).send({ message: validation.error })
      }

      // Upload to R2
      let result: { url: string; key: string }
      try {
        result = await uploadPhotoToR2(buffer, file.filename, file.mimetype, folder)
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ message: err.message })
        }
        if (err instanceof Error && /R2|CLOUDFLARE/i.test(err.message)) {
          return reply.status(503).send({
            message: 'Serviço de armazenamento indisponível. Configuração ausente.',
          })
        }
        return reply.status(500).send({ message: 'Falha ao fazer upload. Tente novamente.' })
      }

      return reply.status(200).send(result)
    },
  )
}
