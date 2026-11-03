"use client"
import { use, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Calendar from "react-calendar"
import { toast } from "sonner"
import { CalendarDays, CalendarPlus, Clock, Lock, Plus } from "lucide-react"
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  ListGroup,
  ListRow,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Tabs,
  type Tone,
} from "@/src/components/ui/capi"

interface Slot {
  id: string
  packageId: string
  startsAt: string
  capacity: number
  booked: number
  status: "OPEN" | "FULL" | "CANCELLED" | "COMPLETED"
}

interface Package {
  id: string
  name: string
}

interface Guide {
  guideId: string
  name: string
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function DisponibilidadePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id ?? ""

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [allSlots, setAllSlots] = useState<Slot[]>([])
  const [daySlots, setDaySlots] = useState<Slot[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [closingSlot, setClosingSlot] = useState<string | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Modal form state
  const [formPackageId, setFormPackageId] = useState("")
  const [formStartTime, setFormStartTime] = useState("")
  const [formEndTime, setFormEndTime] = useState("")
  const [formVagas, setFormVagas] = useState<number>(1)
  const [formMinCapacity, setFormMinCapacity] = useState<number>(1)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formApiError, setFormApiError] = useState<string | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [guidesLoading, setGuidesLoading] = useState(false)
  const [formGuideId, setFormGuideId] = useState<string>("")
  const [formIsConflict, setFormIsConflict] = useState(false)
  // Só apresentação: no celular alterna entre lista por dia e calendário (no desktop os dois aparecem)
  const [view, setView] = useState<"list" | "calendar">("list")

  // Load packages for dropdown (filtered to current conductor)
  useEffect(() => {
    if (!userId) return
    fetch(`/api/proxy?path=/tenants/${slug}/packages?conductorId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        const pkgs: Package[] = Array.isArray(data) ? data : (data.packages ?? [])
        setPackages(pkgs)
        if (pkgs.length > 0) setFormPackageId(pkgs[0].id)
      })
      .catch(() => {})
  }, [slug, userId])

  // Load all slots for calendar tile coloring (fetched when packages are ready)
  useEffect(() => {
    if (packages.length === 0) return
    setLoading(true)
    setSlotsError(null)
    Promise.all(
      packages.map((pkg) =>
        fetch(`/api/proxy?path=/tenants/${slug}/packages/${pkg.id}/slots`)
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
          .then((data) => (Array.isArray(data) ? data : (data.slots ?? [])) as Slot[])
      )
    )
      .then((results) => setAllSlots(results.flat()))
      .catch(() => setSlotsError("Erro ao carregar slots. Tente novamente."))
      .finally(() => setLoading(false))
  }, [packages, slug])

  // Fetch all tenant guides when a package is selected
  useEffect(() => {
    if (!formPackageId || !slug) {
      setGuides([])
      return
    }
    setGuidesLoading(true)
    fetch(`/api/proxy?path=/tenants/${slug}/guides`)
      .then((res) => res.json())
      .then((data: { guides: Array<{ id: string; user: { id: string; name: string } }> }) => {
        setGuides((data.guides ?? []).map(g => ({ guideId: g.id, name: g.user.name })))
      })
      .catch(() => setGuides([]))
      .finally(() => setGuidesLoading(false))
  }, [formPackageId, slug])

  // Filter slots for selected date
  useEffect(() => {
    if (!selectedDate) {
      setDaySlots([])
      return
    }
    const dateStr = toLocalDateStr(selectedDate)
    setDaySlots(allSlots.filter((s) => s.startsAt.startsWith(dateStr)))
  }, [selectedDate, allSlots])

  // Calendar tile content — color dot for days with slots
  function getTileContent({ date, view }: { date: Date; view: string }) {
    if (view !== "month") return null
    const dateStr = toLocalDateStr(date)
    const slotsForDay = allSlots.filter(
      (s) => s.startsAt.startsWith(dateStr) && s.status !== "CANCELLED" && s.status !== "COMPLETED"
    )
    if (slotsForDay.length === 0) return null

    const hasOpen = slotsForDay.some((s) => s.status === "OPEN")
    const isFullyBooked =
      !hasOpen &&
      slotsForDay.some((s) => s.status === "FULL")

    let bg = "var(--primary)" // disponível
    if (isFullyBooked) bg = "var(--danger)" // lotado
    else if (!hasOpen) bg = "var(--text-tertiary)" // fechado/sem slots ativos

    return <span className="agenda-dot" aria-hidden="true" style={{ background: bg }} />
  }

  async function handleCloseSlot(slot: Slot) {
    setClosingSlot(slot.id)
    setCloseError(null)
    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/packages/${slot.packageId}/slots/${slot.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAllSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, status: "CANCELLED" as const } : s)))
      toast.success("Slot fechado.")
    } catch {
      setCloseError("Erro ao cancelar slot. Tente novamente.")
      toast.error("Erro ao fechar slot.")
    } finally {
      setClosingSlot(null)
    }
  }

  function isStartsAtInPast(): boolean {
    if (!selectedDate || !formStartTime) return false
    const dateStr = toLocalDateStr(selectedDate)
    const startsAt = new Date(`${dateStr}T${formStartTime}:00`)
    return startsAt <= new Date()
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {}
    if (!formPackageId) errs.packageId = "Campo obrigatório."
    if (!formGuideId) errs.guideId = "Selecione um guia"
    if (!formStartTime) {
      errs.startTime = "Campo obrigatório."
    } else if (isStartsAtInPast()) {
      errs.startTime = "A data do slot deve ser no futuro"
    }
    if (!formEndTime) errs.endTime = "Campo obrigatório."
    else if (formStartTime && formEndTime && formEndTime <= formStartTime) {
      errs.endTime = "O horário de fim deve ser após o início."
    }
    if (!formVagas || formVagas < 1) errs.vagas = "Informe ao menos 1 vaga."
    if (!formMinCapacity || formMinCapacity < 1) errs.minCapacity = "Informe o mínimo de participantes."
    else if (formMinCapacity > formVagas) errs.minCapacity = "Mínimo não pode exceder a capacidade."
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !selectedDate) return
    setFormSubmitting(true)
    setFormApiError(null)
    setFormIsConflict(false)

    const dateStr = toLocalDateStr(selectedDate)
    const startsAt = new Date(`${dateStr}T${formStartTime}:00`).toISOString()

    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/packages/${formPackageId}/slots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startsAt, capacity: formVagas, minCapacity: formMinCapacity, guideId: formGuideId }),
        }
      )
      if (res.status === 409) {
        const data = await res.json()
        setFormIsConflict(true)
        setFormApiError(data.message ?? "Conflito de agenda para este guia")
        return
      }
      setFormIsConflict(false)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erro ao criar slot" }))
        throw new Error(err.message ?? "Erro ao criar slot")
      }
      const data = await res.json()
      const newSlot: Slot = data.slot ?? data
      setAllSlots((prev) => [...prev, newSlot])
      setModalOpen(false)
      setFormStartTime("")
      setFormEndTime("")
      setFormVagas(1)
      setFormMinCapacity(1)
      setFormErrors({})
      toast.success("Slot criado com sucesso.")
    } catch (err: unknown) {
      setFormApiError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o slot. Tente novamente."
      )
      toast.error("Erro ao criar slot.")
    } finally {
      setFormSubmitting(false)
    }
  }

  function closeModal() {
    setModalOpen(false)
    setFormErrors({})
    setFormApiError(null)
    setFormGuideId("")
    setGuides([])
    setGuidesLoading(false)
    setFormIsConflict(false)
  }

  // ── Apresentação ───────────────────────────────────────────────────────────

  const SLOT_STATUS: Record<Slot["status"], [string, Tone]> = {
    OPEN: ["Aberto", "success"],
    FULL: ["Lotado", "warning"],
    CANCELLED: ["Cancelado", "neutral"],
    COMPLETED: ["Concluído", "neutral"],
  }

  const packageName = (id: string) => packages.find((p) => p.id === id)?.name

  function dayLabel(date: Date) {
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
  }

  function openNewSlot(date: Date) {
    setSelectedDate(date)
    setModalOpen(true)
  }

  // Lista por dia (celular): próximos dias com horários, na ordem
  const todayKey = toLocalDateStr(new Date())
  const upcomingDays: Array<{ key: string; slots: Slot[] }> = []
  ;[...allSlots]
    .filter((s) => s.startsAt.slice(0, 10) >= todayKey)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .forEach((s) => {
      const key = s.startsAt.slice(0, 10)
      const last = upcomingDays[upcomingDays.length - 1]
      if (last && last.key === key) last.slots.push(s)
      else upcomingDays.push({ key, slots: [s] })
    })

  function renderSlotRow(slot: Slot) {
    const [label, tone] = SLOT_STATUS[slot.status] ?? [slot.status, "neutral" as Tone]
    const name = packageName(slot.packageId)
    return (
      <ListRow
        key={slot.id}
        leading={
          <span className="agenda-time" aria-hidden="true">
            <Clock size={18} strokeWidth={1.75} />
          </span>
        }
        title={formatTime(slot.startsAt)}
        subtitle={`${slot.booked}/${slot.capacity} vagas${name ? ` · ${name}` : ""}`}
        trailing={
          <div className="flex items-center gap-2">
            <Badge tone={tone} dot>{label}</Badge>
            {slot.status === "OPEN" && (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={Lock}
                loading={closingSlot === slot.id}
                onClick={() => handleCloseSlot(slot)}
                aria-label={`Fechar slot das ${formatTime(slot.startsAt)}`}
              >
                Fechar
              </Button>
            )}
          </div>
        }
      />
    )
  }

  const legend = (
    <ul className="agenda-legend" aria-label="Legenda do calendário">
      <li><span className="agenda-dot" style={{ background: "var(--primary)" }} aria-hidden="true" />Com vagas</li>
      <li><span className="agenda-dot" style={{ background: "var(--danger)" }} aria-hidden="true" />Lotado</li>
      <li><span className="agenda-dot" style={{ background: "var(--text-tertiary)" }} aria-hidden="true" />Fechado</li>
    </ul>
  )

  const listSkeleton = (
    <ListGroup>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="capi-row" aria-hidden="true">
          <Skeleton width={40} height={40} radius={12} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton width="30%" height={14} />
            <Skeleton width="60%" height={12} />
          </div>
        </div>
      ))}
    </ListGroup>
  )

  return (
    <>
      <style>{`
        /* react-calendar com tokens CAPI */
        .agenda-cal .react-calendar { width: 100%; max-width: 100%; border: 0; background: transparent; font-family: var(--font-sans); color: var(--text); }
        .agenda-cal .react-calendar button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
        .agenda-cal .react-calendar button:disabled { cursor: default; color: var(--text-tertiary); }
        .agenda-cal .react-calendar button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; }
        .agenda-cal .react-calendar__navigation { display: flex; align-items: center; gap: var(--space-1); margin-bottom: var(--space-3); }
        .agenda-cal .react-calendar__navigation button { min-width: var(--touch-target); height: var(--touch-target); border-radius: var(--radius-md); font-size: 18px; color: var(--text-secondary); }
        .agenda-cal .react-calendar__navigation button:enabled:hover { background: var(--bg-subtle); color: var(--text); }
        .agenda-cal .react-calendar__navigation__label { font-size: 16px !important; font-weight: 700; color: var(--text) !important; text-transform: capitalize; }
        .agenda-cal .react-calendar__month-view__weekdays { margin-bottom: var(--space-1); }
        .agenda-cal .react-calendar__month-view__weekdays__weekday { padding: var(--space-2) 0; text-align: center; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); }
        .agenda-cal .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; }
        .agenda-cal .react-calendar__tile {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
          min-height: var(--touch-target); padding: var(--space-1) 0; border-radius: var(--radius-md);
          font-size: 15px; font-weight: 500; font-variant-numeric: tabular-nums;
          transition: background-color .15s ease;
        }
        .agenda-cal .react-calendar__tile:enabled:hover { background: var(--bg-subtle); }
        .agenda-cal .react-calendar__month-view__days__day--neighboringMonth { color: var(--text-tertiary); }
        .agenda-cal .react-calendar__tile--now { background: var(--primary-subtle); color: var(--text-primary); font-weight: 700; }
        .agenda-cal .react-calendar__tile--active,
        .agenda-cal .react-calendar__tile--active:enabled:hover { background: var(--text); color: var(--bg-page); font-weight: 700; }
        .agenda-cal .react-calendar__tile--hasActive { background: var(--primary-subtle); color: var(--text-primary); }
        .agenda-cal .react-calendar__year-view .react-calendar__tile,
        .agenda-cal .react-calendar__decade-view .react-calendar__tile,
        .agenda-cal .react-calendar__century-view .react-calendar__tile { min-height: 56px; text-transform: capitalize; }
        @media (min-width: 1024px) { .agenda-cal .react-calendar__tile { min-height: 56px; } }

        .agenda-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex: none; }
        .agenda-legend { display: flex; flex-wrap: wrap; gap: var(--space-4); margin: var(--space-4) 0 0; padding: var(--space-3) 0 0; list-style: none; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-secondary); }
        .agenda-legend li { display: inline-flex; align-items: center; gap: var(--space-2); }
        .agenda-time { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary-subtle); color: var(--text-primary); }
        .agenda-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); }
        .agenda-day-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); text-transform: capitalize; }

        /* Celular primeiro: só a visão escolhida aparece */
        .agenda[data-view="list"] .agenda-calendar-layout { display: none; }
        .agenda[data-view="calendar"] .agenda-list { display: none; }
        .agenda-calendar-layout { display: grid; gap: var(--space-4); align-items: start; }
        @media (min-width: 1024px) {
          .agenda-switch { display: none; }
          .agenda .agenda-list { display: none !important; }
          .agenda .agenda-calendar-layout { display: grid !important; grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr); gap: var(--space-6); }
          .agenda-card { padding: var(--space-6); }
          .agenda-side { position: sticky; top: var(--space-8); }
        }
      `}</style>

      <PageHeader
        eyebrow="Painel do guia"
        title="Agenda"
        description="Abra horários para seus roteiros e acompanhe as vagas de cada dia."
        actions={
          selectedDate ? (
            <Button iconLeft={Plus} onClick={() => setModalOpen(true)}>
              Adicionar horário
            </Button>
          ) : undefined
        }
      />

      {(slotsError || closeError) && (
        <div className="mb-4 flex flex-col gap-3" aria-live="assertive">
          {slotsError && <Alert tone="danger" title={slotsError} />}
          {closeError && <Alert tone="danger" title={closeError} />}
        </div>
      )}

      <div className="agenda" data-view={view}>
        <Tabs
          variant="segmented"
          className="agenda-switch mb-4"
          label="Modo de visualização"
          value={view}
          onChange={(v) => setView(v as "list" | "calendar")}
          items={[
            { value: "list", label: "Lista" },
            { value: "calendar", label: "Calendário" },
          ]}
        />

        {/* ── Lista por dia (celular) ─────────────────────────────────── */}
        <div className="agenda-list">
          {loading ? (
            listSkeleton
          ) : upcomingDays.length === 0 ? (
            <ListGroup>
              <EmptyState
                compact
                icon={CalendarDays}
                title="Nenhum horário nos próximos dias"
                description="Escolha um dia no calendário para abrir o primeiro horário."
                action={
                  <Button iconLeft={CalendarPlus} onClick={() => setView("calendar")}>
                    Escolher dia
                  </Button>
                }
              />
            </ListGroup>
          ) : (
            <div className="flex flex-col gap-6">
              {upcomingDays.map((d) => {
                const date = new Date(`${d.key}T00:00:00`)
                return (
                  <section key={d.key} aria-label={dayLabel(date)}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h2 className="agenda-day-title">{dayLabel(date)}</h2>
                      <Button variant="ghost" size="sm" iconLeft={Plus} onClick={() => openNewSlot(date)}>
                        Horário
                      </Button>
                    </div>
                    <ListGroup>{d.slots.map(renderSlotRow)}</ListGroup>
                  </section>
                )
              })}
              <Button variant="secondary" iconLeft={CalendarPlus} onClick={() => setView("calendar")} fullWidth>
                Abrir horário em outro dia
              </Button>
            </div>
          )}
        </div>

        {/* ── Calendário + painel do dia ───────────────────────────────── */}
        <div className="agenda-calendar-layout">
          <div className="agenda-card agenda-cal">
            <Calendar
              value={selectedDate}
              onChange={(date) => setSelectedDate(date as Date)}
              tileContent={getTileContent}
            />
            {legend}
          </div>

          <div className="agenda-card agenda-side" aria-live="polite">
            {!selectedDate ? (
              <EmptyState
                compact
                icon={CalendarDays}
                title="Selecione um dia"
                description="Toque em um dia no calendário para ver e abrir horários."
              />
            ) : (
              <>
                <h2 className="agenda-day-title mb-4">{dayLabel(selectedDate)}</h2>

                {loading ? (
                  <div className="mb-4">{listSkeleton}</div>
                ) : daySlots.length === 0 ? (
                  <p className="mb-4 text-fg-secondary" style={{ fontSize: 15 }}>
                    Nenhum horário neste dia.
                  </p>
                ) : (
                  <div className="mb-4">
                    <ListGroup>{daySlots.map(renderSlotRow)}</ListGroup>
                  </div>
                )}

                <Button iconLeft={Plus} onClick={() => setModalOpen(true)} fullWidth>
                  Adicionar horário
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Criação de horário — sheet no celular */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={`Novo horário — ${selectedDate?.toLocaleDateString("pt-BR") ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" form="slot-form" loading={formSubmitting}>
              {formSubmitting ? "Criando..." : "Criar horário"}
            </Button>
          </>
        }
      >
        <form
          id="slot-form"
          onSubmit={handleCreateSlot}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            id="slot-package"
            label="Roteiro"
            value={formPackageId}
            onChange={(e) => setFormPackageId(e.target.value)}
            required
            error={formErrors.packageId}
          >
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </Select>

          <Select
            id="slot-guide"
            label="Guia"
            value={formGuideId}
            onChange={(e) => setFormGuideId(e.target.value)}
            disabled={guidesLoading || guides.length === 0}
            error={formErrors.guideId}
          >
            <option value="">
              {guidesLoading
                ? "Carregando guias..."
                : guides.length === 0
                ? "Nenhum guia qualificado para este roteiro"
                : "Selecione um guia"}
            </option>
            {guides.map((g) => (
              <option key={g.guideId} value={g.guideId}>
                {g.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="slot-start"
              type="time"
              label="Início"
              value={formStartTime}
              onChange={(e) => setFormStartTime(e.target.value)}
              onBlur={() => {
                if (formStartTime && isStartsAtInPast()) {
                  setFormErrors((prev) => ({
                    ...prev,
                    startTime: "A data do slot deve ser no futuro",
                  }))
                } else {
                  setFormErrors((prev) => {
                    const next = { ...prev }
                    delete next.startTime
                    return next
                  })
                }
              }}
              required
              error={formErrors.startTime}
            />
            <Input
              id="slot-end"
              type="time"
              label="Fim"
              value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)}
              required
              error={formErrors.endTime}
            />
          </div>

          <Input
            id="slot-vagas"
            type="number"
            inputMode="numeric"
            min={1}
            label="Vagas (capacidade máxima)"
            value={formVagas}
            onChange={(e) => setFormVagas(parseInt(e.target.value) || 1)}
            required
            error={formErrors.vagas}
          />

          <Input
            id="slot-min-capacity"
            type="number"
            inputMode="numeric"
            min={1}
            label="Mínimo de participantes"
            value={formMinCapacity}
            onChange={(e) => setFormMinCapacity(parseInt(e.target.value) || 1)}
            required
            error={formErrors.minCapacity}
          />

          {formApiError && (
            <Alert tone={formIsConflict ? "warning" : "danger"} title={formIsConflict ? "Conflito de agenda" : undefined}>
              {formApiError}
            </Alert>
          )}
        </form>
      </Modal>
    </>
  )
}
