import CancelarReservaClient from '@/src/components/ui/CancelarReservaClient'
import BackButton from '@/src/components/ui/BackButton'

// Destino do link "cancelar" do e-mail de reserva: /{slug}/minha-reserva/cancelar?token=...
export default async function CancelarReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { slug } = await params
  const { token } = await searchParams

  return (
    <div className="capi-container capi-container--form py-6">
      <BackButton fallbackHref={`/${slug}/minha-reserva`} />
      <div className="mt-4">
        <CancelarReservaClient slug={slug} token={typeof token === 'string' ? token : ''} />
      </div>
    </div>
  )
}
