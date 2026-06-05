import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
          return null
        }
        const apiUrl = process.env.API_URL
        try {
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              tenantSlug: credentials.tenantSlug,
            }),
          })
          if (!res.ok) return null
          const { token } = await res.json()
          // Verify claims server-side via /auth/me (avoids client-side JWT decode without sig check)
          const meRes = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!meRes.ok) return null
          const { id, role, tenantId } = await meRes.json()
          return {
            id,
            name: credentials.email,
            email: credentials.email,
            role,
            tenantId,
            token,
          }
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.apiToken = (user as any).token
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.sub as string,
        role: token.role as string,
        tenantId: token.tenantId as string,
        // NOTE: apiToken is kept only in the encrypted JWT cookie (server-side).
        // Client components must proxy API calls through a Next.js route handler.
        // RSC pages use getToken() from next-auth/jwt to read apiToken server-side.
      } as any
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
}
