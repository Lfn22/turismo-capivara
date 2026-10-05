import { getServerSession } from "next-auth"
import { getToken } from "next-auth/jwt"
import { cookies } from "next/headers"
import { authOptions } from "@/lib/auth"
import { apiFetch } from "@/lib/api/client"
import { CalendarDays, Images, Plus, Users } from "lucide-react"
import EmptyState from "@/src/components/ui/EmptyState"
import { Alert, Badge, Button, Media, PageHeader, StatusBadge } from "@/src/components/ui/capi"

interface Package {
  id: string
  name: string
  description: string
  price: string | number
  difficulty: "EASY" | "MODERATE" | "HARD" | "EXTREME"
  active: boolean
  capacity: number
  conductorId?: string
  photos?: string[]
}

function DifficultyBadge({ difficulty }: { difficulty: Package["difficulty"] }) {
  if (difficulty === "EXTREME") return <Badge tone="danger">Extremo</Badge>
  return <StatusBadge kind="difficulty" status={difficulty ?? "MODERATE"} />
}

function formatPrice(price: string | number) {
  const n = typeof price === "string" ? parseFloat(price) : price
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function RoteirosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const jwt = await getToken({
    req: { cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
  const token = (jwt?.apiToken as string) ?? ""
  const userId = (session?.user as any)?.id ?? ""
  const role = (session?.user as any)?.role ?? ""

  let packages: Package[] = []
  let loadError = false

  try {
    // Pass conductorId to the API so filtering happens server-side (avoids overfetch)
    const qs = role === "CONDUTOR" && userId ? `?conductorId=${encodeURIComponent(userId)}` : ""
    const data = await apiFetch<Package[]>(`/tenants/${slug}/packages${qs}`, token)
    packages = Array.isArray(data) ? data : []
  } catch {
    loadError = true
  }

  return (
    <>
      <style>{`
        .roteiro-card { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
        .roteiro-card__head { display: flex; gap: var(--space-3); align-items: flex-start; }
        .roteiro-card__thumb { flex: none; width: 56px; }
        .roteiro-card__title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .roteiro-card__desc { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .roteiro-card__foot { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: auto; padding-top: var(--space-3); border-top: 1px solid var(--border); }
        .roteiro-card__price { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
        .roteiro-card__price span { font-size: 13px; font-weight: 400; color: var(--text-secondary); }
        .roteiro-card__actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--space-2); }
        .roteiro-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
      `}</style>

      <PageHeader
        eyebrow="Painel do guia"
        title="Meus roteiros"
        description="Cadastre roteiros, adicione fotos e experiências e abra horários na agenda."
        actions={
          <Button href={`/${slug}/painel/roteiros/novo`} iconLeft={Plus}>
            Novo roteiro
          </Button>
        }
      />

      {loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar dados. Tente novamente."
          action={
            <Button href={`/${slug}/painel/roteiros`} variant="secondary" size="sm">
              Recarregar
            </Button>
          }
        />
      ) : packages.length === 0 ? (
        <EmptyState
          title="Nenhum roteiro cadastrado"
          description="Crie seu primeiro roteiro para começar a receber reservas."
          ctaLabel="Criar roteiro"
          ctaHref={`/${slug}/painel/roteiros/novo`}
        />
      ) : (
        <div className="roteiro-grid">
          {packages.map((pkg) => (
            <article key={pkg.id} className="roteiro-card">
              <div className="roteiro-card__head">
                <div className="roteiro-card__thumb">
                  <Media src={pkg.photos?.[0]} alt="" ratio="1 / 1" sizes="56px" placeholder="mountain" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2 className="roteiro-card__title">{pkg.name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={pkg.difficulty} />
                    <Badge tone={pkg.active ? "success" : "neutral"} dot>
                      {pkg.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>

              {pkg.description ? <p className="roteiro-card__desc">{pkg.description}</p> : null}

              <div className="roteiro-card__foot">
                <p className="roteiro-card__price">
                  {formatPrice(pkg.price)} <span>/pessoa</span>
                </p>
                <span className="inline-flex items-center gap-1 text-fg-secondary" style={{ fontSize: 13 }}>
                  <Users size={14} strokeWidth={1.75} aria-hidden="true" />
                  até {pkg.capacity}
                </span>
              </div>

              <div className="roteiro-card__actions">
                <Button href={`/${slug}/painel/roteiros/${pkg.id}`} size="sm" iconLeft={Images}>
                  Fotos e experiências
                </Button>
                <Button href={`/${slug}/painel/disponibilidade`} variant="secondary" size="sm" iconLeft={CalendarDays}>
                  Gerenciar horários
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
