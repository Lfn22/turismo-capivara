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
      // token intentionally omitted — apiToken stays server-side in encrypted JWT
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    tenantId: string
    apiToken: string
  }
}
