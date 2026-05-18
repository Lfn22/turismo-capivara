export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--stone-50)" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid var(--stone-200)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            fontWeight: 400,
            color: "var(--stone-900)",
          }}
        >
          CAPI — Painel Super-Admin
        </span>
      </header>
      <main
        style={{
          padding: "32px 24px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
    </div>
  )
}
