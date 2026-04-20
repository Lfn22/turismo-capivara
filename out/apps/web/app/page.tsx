export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--stone-50)" }}>

      <nav style={{
        background: "var(--stone-900)",
        borderBottom: "1px solid var(--stone-700)",
        padding: "20px 24px",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              color: "var(--stone-100)",
              letterSpacing: "-0.02em",
            }}>
              Serra da Capivara
            </p>
            <p style={{ fontSize: "11px", color: "var(--stone-400)", marginTop: "2px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Patrimônio Mundial UNESCO
            </p>
          </div>
          <a href="/roteiros" style={{
            background: "var(--ochre)",
            color: "white",
            padding: "10px 20px",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            Ver Roteiros
          </a>
        </div>
      </nav>

      <section style={{
        background: "linear-gradient(160deg, var(--stone-900) 0%, var(--stone-700) 60%, var(--stone-600) 100%)",
        padding: "120px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(196,133,42,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(196,133,42,0.08) 0%, transparent 50%)",
        }} />
        <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative" }}>
          <p style={{
            fontSize: "12px",
            color: "var(--ochre-light)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}>
            Piauí, Brasil · 25.000 anos de história
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 7vw, 80px)",
            color: "var(--stone-50)",
            lineHeight: "1.05",
            letterSpacing: "-0.03em",
            marginBottom: "32px",
            maxWidth: "700px",
          }}>
            Onde a história<br />
            <span style={{ color: "var(--ochre-light)" }}>humana começou</span>
          </h1>
          <p style={{
            fontSize: "18px",
            color: "var(--stone-300)",
            maxWidth: "520px",
            lineHeight: "1.7",
            marginBottom: "48px",
          }}>
            O maior conjunto de sítios arqueológicos das Américas, 
            com pinturas rupestres que reescreveram a história da humanidade.
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <a href="/roteiros" style={{
              background: "var(--ochre)",
              color: "white",
              padding: "16px 32px",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: "600",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}>
              Explorar roteiros
            </a>
            <a href="#como-funciona" style={{
              background: "transparent",
              color: "var(--stone-300)",
              padding: "16px 32px",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: "400",
              textDecoration: "none",
              border: "1px solid var(--stone-600)",
            }}>
              Como funciona
            </a>
          </div>
        </div>
      </section>

      <section style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "80px 24px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "24px",
      }}>
        {[
          {
            num: "1.300+",
            label: "Sítios arqueológicos",
            desc: "Registrados dentro do parque nacional, cada um com pinturas e gravuras únicas.",
          },
          {
            num: "25 mil",
            label: "Anos de história",
            desc: "As pinturas rupestres mais antigas das Américas, que reescreveram a cronologia humana.",
          },
          {
            num: "100%",
            label: "Condutores credenciados",
            desc: "Todos os guias são certificados pelo ICMBio e especializados no parque.",
          },
        ].map((item) => (
          <div key={item.num} style={{
            background: "white",
            border: "1px solid var(--stone-200)",
            borderRadius: "8px",
            padding: "32px",
          }}>
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: "40px",
              color: "var(--ochre)",
              letterSpacing: "-0.03em",
              marginBottom: "8px",
            }}>
              {item.num}
            </p>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--stone-800)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {item.label}
            </p>
            <p style={{ fontSize: "14px", color: "var(--stone-500)", lineHeight: "1.6" }}>
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      <section id="como-funciona" style={{
        background: "var(--stone-100)",
        borderTop: "1px solid var(--stone-200)",
        borderBottom: "1px solid var(--stone-200)",
        padding: "80px 24px",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: "var(--ochre)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
            Processo
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 44px)",
            color: "var(--stone-900)",
            marginBottom: "56px",
          }}>
            Como reservar sua visita
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "40px",
          }}>
            {[
              { n: "01", title: "Escolha o roteiro", desc: "Selecione entre nossos circuitos e encontre a data ideal" },
              { n: "02", title: "Preencha os dados", desc: "Nome, contato e número de pessoas do seu grupo" },
              { n: "03", title: "Confirme via Pix", desc: "Receba a confirmação por WhatsApp após o pagamento" },
            ].map((step) => (
              <div key={step.n} style={{ textAlign: "center" }}>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "48px",
                  color: "var(--stone-200)",
                  letterSpacing: "-0.04em",
                  lineHeight: "1",
                  marginBottom: "16px",
                }}>
                  {step.n}
                </p>
                <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--stone-800)", marginBottom: "8px" }}>
                  {step.title}
                </p>
                <p style={{ fontSize: "14px", color: "var(--stone-500)", lineHeight: "1.6" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "56px" }}>
            <a href="/roteiros" style={{
              background: "var(--stone-900)",
              color: "white",
              padding: "16px 40px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              Ver roteiros disponíveis
            </a>
          </div>
        </div>
      </section>

      <footer style={{
        background: "var(--stone-900)",
        padding: "48px 24px",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "24px",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              color: "var(--stone-100)",
            }}>
              Serra da Capivara Turismo
            </p>
            <p style={{ fontSize: "12px", color: "var(--stone-500)", marginTop: "4px" }}>
              São Raimundo Nonato, Piauí
            </p>
          </div>
          <div style={{ display: "flex", gap: "32px" }}>
            <a href="/roteiros" style={{ fontSize: "13px", color: "var(--stone-400)", textDecoration: "none" }}>
              Roteiros
            </a>
            <a href="/dashboard" style={{ fontSize: "13px", color: "var(--stone-400)", textDecoration: "none" }}>
              Painel
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}