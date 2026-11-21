import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import ViagensClient from './ViagensClient'
import { type BookingCardData } from '@/src/components/turista/BookingCard'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export default async function ViagensPage() {
  const cookieStore = await cookies()
  const jwt = await getToken({
    req: { cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
  const token = (jwt?.apiToken as string) ?? ''

  let initialBookings: BookingCardData[] = []

  if (token) {
    try {
      const res = await fetch(`${API_URL}/me/bookings?status=upcoming&limit=20`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        initialBookings = Array.isArray(data) ? data : (data?.data ?? [])
      }
    } catch {
      // Let client handle it
    }
  }

  return (
    <>
      <style>{`
        .viagens-page__title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 var(--space-6, 24px);
        }
      `}</style>
      <h1 className="viagens-page__title">Minhas viagens</h1>
      <ViagensClient initialBookings={initialBookings} />
    </>
  )
}
