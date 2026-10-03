import MinhaReservaClient from '@/src/components/ui/MinhaReservaClient'
import BackButton from '@/src/components/ui/BackButton'

export default async function MinhaReservaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div>
      <div className="capi-container capi-container--form pt-4">
        <BackButton fallbackHref={`/${slug}/roteiros`} />
      </div>
      <MinhaReservaClient slug={slug} />
    </div>
  )
}
