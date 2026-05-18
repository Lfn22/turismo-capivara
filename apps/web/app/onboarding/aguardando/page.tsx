export default function OnboardingAguardando() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--stone-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          padding: "clamp(32px, 5vw, 48px) clamp(24px, 5vw, 40px)",
          width: "100%",
          maxWidth: "480px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ochre)",
            marginBottom: "8px",
          }}
        >
          CAPI
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--stone-900)",
            marginBottom: "16px",
          }}
        >
          Cadastro recebido!
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--stone-600)",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}
        >
          Sua solicitação está sendo analisada pela equipe CAPI. Você receberá um email quando for aprovada.
        </p>

        {/* Checklist — 3 static items */}
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
          {/* Item 1 — done */}
          <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "16px", color: "#15803D", fontWeight: 600 }}>✓</span>
            <span style={{ fontSize: "16px", color: "var(--stone-800)" }}>Cadastro enviado</span>
          </li>
          {/* Item 2 — pending */}
          <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "16px", color: "var(--stone-300)" }}>○</span>
            <span style={{ fontSize: "16px", color: "var(--stone-500)" }}>Aguardando aprovação</span>
          </li>
          {/* Item 3 — pending */}
          <li style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px", color: "var(--stone-300)" }}>○</span>
            <span style={{ fontSize: "16px", color: "var(--stone-500)" }}>Acesso liberado</span>
          </li>
        </ul>

        <a href="/" style={{ fontSize: "14px", color: "var(--ochre)", textDecoration: "none" }}>
          ← Voltar para o início
        </a>
      </div>
    </main>
  )
}
