"use client"
import { useState } from "react"
import { Select } from "@/src/components/ui/capi"
import { PackageEditor } from "./PackageEditor"

/** Cartão "＋ Novo roteiro". Com mais de uma agência possível, mostra o seletor de agência. */
export function NewPackageCard({
  tenants,
  onCreated,
}: {
  tenants: { slug: string; name: string }[]
  onCreated: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tenant, setTenant] = useState(tenants[0].slug)
  const [created, setCreated] = useState(0)
  const chosen = tenants.some((t) => t.slug === tenant) ? tenant : tenants[0].slug

  return (
    <div style={{ display: "grid", gap: "var(--space-2)", alignContent: "start" }}>
      {tenants.length > 1 ? (
        <Select label="Agência" value={chosen} onChange={(e) => setTenant(e.target.value)}>
          {tenants.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </Select>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
          minHeight: 200, border: "2px dashed var(--ochre)", borderRadius: "var(--radius-lg)", background: "transparent",
          color: "var(--text)", font: "inherit", fontWeight: 600, cursor: "pointer",
        }}
      >
        ＋ Novo roteiro
      </button>
      <PackageEditor
        key={`${chosen}-${created}`}
        tenantSlug={chosen}
        pkg={null}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={({ id }) => {
          setOpen(false)
          setCreated((n) => n + 1)
          onCreated(id)
        }}
      />
    </div>
  )
}
