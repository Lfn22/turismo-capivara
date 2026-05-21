import MinhaReservaClient from '@/src/components/ui/MinhaReservaClient'

export default async function MinhaReservaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <main>
      <MinhaReservaClient slug={slug} />
    </main>
  )
}
