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
      token: string
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
