import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    tenantId: string
    tenantSlug: string | null
    photoUrl: string | null
    token: string
    refreshToken: string
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      role: string
      tenantId: string
      tenantSlug: string | null
      photoUrl: string | null
      // token intentionally omitted — apiToken stays server-side in encrypted JWT
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string
    role: string
    tenantId: string
    tenantSlug: string | null
    photoUrl: string | null
    apiToken: string
    refreshToken: string
    apiTokenExpires: number
  }
}
