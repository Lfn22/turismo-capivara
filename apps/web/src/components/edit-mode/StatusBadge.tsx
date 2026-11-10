import { Badge } from "@/src/components/ui/capi"

const LABELS = {
  DRAFT: ["Rascunho", "neutral"],
  HIDDEN: ["Oculto", "neutral"],
  PENDING: ["Aguardando aprovação", "warning"],
} as const

/** Selo de estado no modo edição: fino sobre o Badge do kit capi. */
export function StatusBadge({ status }: { status: keyof typeof LABELS }) {
  const [label, tone] = LABELS[status]
  return <Badge tone={tone}>{label}</Badge>
}
