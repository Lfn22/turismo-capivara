const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3333"

export async function lookupTenant(
  email: string
): Promise<{ tenantName: string; tenantSlug: string } | null> {
  const res = await fetch(`${API_URL}/auth/lookup-tenant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) {
    if (res.status === 404) return null
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  if (!data.tenant) return null

  return { tenantName: data.tenant.tenantName, tenantSlug: data.tenant.tenantSlug }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
}

export async function resetPassword(
  userId: string,
  token: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token, newPassword }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
}
