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
        const res = await fetch(`${process.env.API_URL}/auth/login`, {
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
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString()
        )
        return {
          id: payload.sub,
          name: payload.name ?? credentials.email,
          email: credentials.email,
          role: payload.role,
          tenantId: payload.tenantId,
          token,
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
        token: token.apiToken as string,
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
