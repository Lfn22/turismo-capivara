const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:    { label: "Pendente",          bg: "#FEF9EC", color: "#B45309" },
  CONFIRMED:  { label: "Confirmada",        bg: "#F0FDF4", color: "#15803D" },
  CANCELLED:  { label: "Cancelada",         bg: "#FEF2F2", color: "#DC2626" },
  CHECKED_IN: { label: "Check-in",          bg: "#EFF6FF", color: "#1D4ED8" },
  COMPLETED:  { label: "Concluída",         bg: "var(--stone-100)", color: "var(--stone-500)" },
  NO_SHOW:    { label: "Não compareceu",    bg: "#FEF2F2", color: "#9CA3AF" },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, bg: "var(--stone-100)", color: "var(--stone-500)" }
  return (
    <span
      aria-label={s.label}
      style={{
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  )
}
