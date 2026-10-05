import CheckoutClient from '@/src/components/ui/CheckoutClient'
import BackButton from '@/src/components/ui/BackButton'
import { Stepper } from '@/src/components/ui/capi'

const STEPS = ['Data e horário', 'Seus dados', 'Pagamento']

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
    <div>
      {/* Cabeçalho simples do checkout: voltar + título + etapa */}
      <div className="capi-container capi-container--content pt-4 md:pt-6">
        <BackButton fallbackHref={`/${slug}/roteiros`} />
        <div className="mb-4 mt-2 flex items-baseline justify-between gap-3">
          <h1 className="m-0 text-2xl">Pagamento</h1>
          <p className="m-0 text-sm text-fg-secondary">Etapa 3 de 3</p>
        </div>
        <Stepper steps={STEPS} current={2} />
      </div>
      <CheckoutClient slug={slug} bookingId={bookingId} email={email} />
    </div>
  )
}
