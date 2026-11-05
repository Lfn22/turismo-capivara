import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { apiTokenExpiresAt, ensureFreshApiToken } from "@/src/lib/api-token"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

// Nome e foto exibidos no UserBar/painel. Melhor esforço: falha não impede o login.
async function fetchAccount(apiToken: string): Promise<{ name?: string; photoUrl?: string | null } | null> {
  try {
    const res = await fetch(`${API_URL}/account/me`, {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return { name: data?.name, photoUrl: data?.photoUrl ?? null }
  } catch {
    return null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const apiUrl = API_URL
        try {
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })
          if (!res.ok) return null
          const { token, refreshToken } = await res.json()
          // Verify claims server-side via /auth/me (avoids client-side JWT decode without sig check)
          const meRes = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!meRes.ok) return null
          const { id, role, tenantId, tenantSlug } = await meRes.json()
          const account = await fetchAccount(token)
          return {
            id,
            name: account?.name || credentials.email,
            email: credentials.email,
            role,
            tenantId,
            tenantSlug,
            token,
            refreshToken,
            photoUrl: account?.photoUrl ?? null,
          }
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.apiToken = (user as any).token
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantSlug = (user as { tenantSlug?: string | null }).tenantSlug ?? null
        token.photoUrl = (user as { photoUrl?: string | null }).photoUrl ?? null
        token.refreshToken = (user as { refreshToken?: string }).refreshToken
        token.apiTokenExpires = apiTokenExpiresAt(token.apiToken)
      } else {
        // Renova o token da API perto de expirar (o middleware cobre getToken/RSC; aqui cobre /api/auth/session)
        const fresh = await ensureFreshApiToken(token)
        // Lançar faz o next-auth limpar o cookie de sessão → useSession/getServerSession sem sessão → login
        if (fresh.status === "invalid") throw new Error("API_REFRESH_FAILED")
        token = fresh.token
      }
      // useSession().update(): relê nome/foto da API (não confia no payload do cliente)
      if (trigger === "update" && token.apiToken) {
        const account = await fetchAccount(token.apiToken)
        if (account) {
          if (account.name) token.name = account.name
          token.photoUrl = account.photoUrl ?? null
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        name: (token.name as string | undefined) ?? session.user?.name,
        id: token.sub as string,
        role: token.role as string,
        tenantId: token.tenantId as string,
        tenantSlug: token.tenantSlug as string | null,
        photoUrl: token.photoUrl ?? null,
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
