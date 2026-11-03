import { ZodError, ZodType } from 'zod'
import { FastifyReply } from 'fastify'

export function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}

type ParseResult<T> =
  | { data: T; error: null }
  | { data: null; error: true }

function parse<T>(schema: ZodType<T>, input: unknown, reply: FastifyReply): ParseResult<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    reply.status(400).send(zodError(result.error))
    return { data: null, error: true }
  }
  return { data: result.data, error: null }
}

export const parseBody = parse
export const parseParams = parse
export const parseQuery = parse
