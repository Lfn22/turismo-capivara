"use client"
import { use, useState, useEffect } from "react"
import Calendar from "react-calendar"
import { Modal } from "@/components/ui/Modal"
import BackButton from "@/src/components/ui/BackButton"
import { toast } from "sonner"

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formApiError, setFormApiError] = useState<string | null>(null)

  // Load packages for dropdown
  useEffect(() => {
    fetch(`/api/proxy?path=/tenants/${slug}/packages`)
      .then((r) => r.json())
      .then((data) => {
        const pkgs: Package[] = Array.isArray(data) ? data : (data.packages ?? [])
        setPackages(pkgs)
        if (pkgs.length > 0) setFormPackageId(pkgs[0].id)
      })
      .catch(() => {})
  }, [slug])

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

    let bg = "rgba(196,133,42,0.8)" // ochre = disponível
    if (isFullyBooked) bg = "rgba(220,38,38,0.7)" // vermelho = lotado
    else if (!hasOpen) bg = "rgba(156,163,175,0.7)" // cinza = fechado/sem slots ativos

    return (
      <div
        aria-hidden="true"
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: bg,
          margin: "2px auto 0",
        }}
      />
    )
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

  function validateForm(): boolean {
    const errs: Record<string, string> = {}
    if (!formPackageId) errs.packageId = "Campo obrigatório."
    if (!formStartTime) errs.startTime = "Campo obrigatório."
    if (!formEndTime) errs.endTime = "Campo obrigatório."
    else if (formStartTime && formEndTime && formEndTime <= formStartTime) {
      errs.endTime = "O horário de fim deve ser após o início."
    }
    if (!formVagas || formVagas < 1) errs.vagas = "Informe ao menos 1 vaga."
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !selectedDate) return
    setFormSubmitting(true)
    setFormApiError(null)

    const dateStr = toLocalDateStr(selectedDate)
    const startsAt = new Date(`${dateStr}T${formStartTime}:00`).toISOString()

    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/packages/${formPackageId}/slots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startsAt, capacity: formVagas }),
        }
      )
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
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--stone-300)",
    borderRadius: "4px",
    fontSize: "16px",
    color: "var(--stone-800)",
    background: "white",
    boxSizing: "border-box",
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    color: "var(--stone-700)",
    marginBottom: "4px",
    fontWeight: 600,
  }

  const errorStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#DC2626",
    marginTop: "4px",
  }

  return (
    <>
      <BackButton />
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <p
          style={{
            fontSize: "11px",
            color: "var(--ochre)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Painel do Guia
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            color: "var(--stone-900)",
            lineHeight: 1.2,
          }}
        >
          Disponibilidade
        </h1>
      </div>

      {slotsError && (
        <p
          role="alert"
          aria-live="assertive"
          style={{
            fontSize: "14px",
            color: "#DC2626",
            marginBottom: "16px",
            padding: "8px 12px",
            background: "#FEF2F2",
            borderRadius: "4px",
          }}
        >
          {slotsError}
        </p>
      )}

      {closeError && (
        <p
          role="alert"
          aria-live="assertive"
          style={{
            fontSize: "14px",
            color: "#DC2626",
            marginBottom: "16px",
            padding: "8px 12px",
            background: "#FEF2F2",
            borderRadius: "4px",
          }}
        >
          {closeError}
        </p>
      )}

      {/* Two-column layout: calendar + slots panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Calendar */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--stone-200)",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <Calendar
            value={selectedDate}
            onChange={(date) => setSelectedDate(date as Date)}
            tileContent={getTileContent}
            locale="pt-BR"
          />
        </div>

        {/* Slots panel */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--stone-200)",
            borderRadius: "8px",
            padding: "24px",
            minHeight: "200px",
          }}
        >
          {!selectedDate ? (
            <p
              style={{
                fontSize: "16px",
                color: "var(--stone-500)",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              Selecione um dia no calendário para ver os slots.
            </p>
          ) : (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  color: "var(--stone-800)",
                  marginBottom: "16px",
                }}
              >
                {selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </h2>

              {loading ? (
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--stone-400)",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  Carregando slots...
                </p>
              ) : daySlots.length === 0 ? (
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--stone-500)",
                    marginBottom: "16px",
                  }}
                >
                  Nenhum slot neste dia.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 16px 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {daySlots.map((slot) => (
                    <li
                      key={slot.id}
                      style={{
                        padding: "12px",
                        border: "1px solid var(--stone-200)",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "var(--stone-800)",
                            margin: 0,
                            fontWeight: 600,
                          }}
                        >
                          {formatTime(slot.startsAt)}
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--stone-500)",
                            margin: "2px 0 0",
                          }}
                        >
                          {slot.booked}/{slot.capacity} vagas
                          {slot.status === "CANCELLED" && " — Cancelado"}
                          {slot.status === "COMPLETED" && " — Concluído"}
                        </p>
                      </div>
                      {slot.status === "OPEN" && (
                        <button
                          onClick={() => handleCloseSlot(slot)}
                          disabled={closingSlot === slot.id}
                          aria-label={`Fechar slot das ${formatTime(slot.startsAt)}`}
                          style={{
                            background: "#DC2626",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: 600,
                            border: "none",
                            cursor: closingSlot === slot.id ? "not-allowed" : "pointer",
                            opacity: closingSlot === slot.id ? 0.7 : 1,
                            minHeight: "44px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {closingSlot === slot.id ? "..." : "Fechar Slot"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => setModalOpen(true)}
                style={{
                  width: "100%",
                  background: "var(--ochre)",
                  color: "white",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                  minHeight: "44px",
                }}
              >
                Adicionar Slot
              </button>
            </>
          )}
        </div>
      </div>

      {/* Slot creation modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={`Novo Slot — ${selectedDate?.toLocaleDateString("pt-BR") ?? ""}`}
        titleId="slot-modal-title"
      >
        <form
          onSubmit={handleCreateSlot}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          noValidate
        >
          {/* Roteiro select */}
          <div>
            <label htmlFor="slot-package" style={labelStyle}>
              Roteiro
            </label>
            <select
              id="slot-package"
              value={formPackageId}
              onChange={(e) => setFormPackageId(e.target.value)}
              required
              aria-describedby={formErrors.packageId ? "slot-package-error" : undefined}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
            {formErrors.packageId && (
              <p id="slot-package-error" style={errorStyle}>
                {formErrors.packageId}
              </p>
            )}
          </div>

          {/* Time inputs */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
          >
            <div>
              <label htmlFor="slot-start" style={labelStyle}>
                Horário início
              </label>
              <input
                id="slot-start"
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
                aria-describedby={
                  formErrors.startTime ? "slot-start-error" : undefined
                }
                style={{
                  ...inputStyle,
                  borderColor: formErrors.startTime ? "#DC2626" : undefined,
                }}
              />
              {formErrors.startTime && (
                <p id="slot-start-error" style={errorStyle}>
                  {formErrors.startTime}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="slot-end" style={labelStyle}>
                Horário fim
              </label>
              <input
                id="slot-end"
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                required
                aria-describedby={formErrors.endTime ? "slot-end-error" : undefined}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.endTime ? "#DC2626" : undefined,
                }}
              />
              {formErrors.endTime && (
                <p id="slot-end-error" style={errorStyle}>
                  {formErrors.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Vagas */}
          <div>
            <label htmlFor="slot-vagas" style={labelStyle}>
              Vagas
            </label>
            <input
              id="slot-vagas"
              type="number"
              min={1}
              value={formVagas}
              onChange={(e) => setFormVagas(parseInt(e.target.value) || 1)}
              required
              aria-describedby={formErrors.vagas ? "slot-vagas-error" : undefined}
              style={{
                ...inputStyle,
                borderColor: formErrors.vagas ? "#DC2626" : undefined,
              }}
            />
            {formErrors.vagas && (
              <p id="slot-vagas-error" style={errorStyle}>
                {formErrors.vagas}
              </p>
            )}
          </div>

          {formApiError && (
            <p
              role="alert"
              style={{
                ...errorStyle,
                padding: "8px 12px",
                background: "#FEF2F2",
                borderRadius: "4px",
              }}
            >
              {formApiError}
            </p>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                padding: "8px 20px",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                background: "transparent",
                color: "var(--stone-700)",
                border: "1px solid var(--stone-300)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              style={{
                background: formSubmitting ? "var(--stone-400)" : "var(--ochre)",
                color: "white",
                padding: "8px 20px",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                border: "none",
                cursor: formSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {formSubmitting ? "Criando..." : "Criar Slot"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
