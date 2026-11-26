import NovoRoteiroClient from './NovoRoteiroClient'

export default async function SuperAdminNovoRoteiroPage({
  searchParams,
}: {
  searchParams: Promise<{ operadora?: string }>
}) {
  const { operadora } = await searchParams
  return <NovoRoteiroClient initialSlug={operadora ?? ''} />
}
