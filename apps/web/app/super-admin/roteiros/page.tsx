import RoteirosClient from './RoteirosClient'

export default async function SuperAdminRoteirosPage({
  searchParams,
}: {
  searchParams: Promise<{ operadora?: string }>
}) {
  const { operadora } = await searchParams
  return <RoteirosClient initialSlug={operadora ?? ''} />
}
