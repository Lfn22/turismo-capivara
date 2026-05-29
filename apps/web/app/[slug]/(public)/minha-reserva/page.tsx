import MinhaReservaClient from '@/src/components/ui/MinhaReservaClient'
import BackButton from '@/src/components/ui/BackButton'

export default async function MinhaReservaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <main>
      <BackButton />
      <MinhaReservaClient slug={slug} />
    </main>
  )
}
