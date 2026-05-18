import CheckoutClient from '@/src/components/ui/CheckoutClient'

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ bookingId?: string; email?: string }>
}) {
  const { slug } = await params
  const { bookingId = '', email = '' } = await searchParams

  return (
    <main>
      <CheckoutClient slug={slug} bookingId={bookingId} email={email} />
    </main>
  )
}
