import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      tenantId: string
      role: string
      name: string
    }
    user: {
      sub: string
      tenantId: string
      role: string
      name: string
    }
  }
}