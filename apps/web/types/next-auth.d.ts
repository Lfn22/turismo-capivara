import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      tenantId: string
      tenantSlug: string | null
      photoUrl?: string | null
      // token intentionally omitted — apiToken stays server-side in encrypted JWT
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    tenantId: string
    tenantSlug: string | null
    apiToken: string
    /** Refresh token rotativo da API (nunca exposto na session). */
    refreshToken?: string
    /** Expiração do apiToken, epoch em ms. */
    apiTokenExpires?: number
    photoUrl?: string | null
  }
}
