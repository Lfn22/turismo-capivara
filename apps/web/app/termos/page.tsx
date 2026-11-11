import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos e Condições',
  description: 'Termos e condições de uso da plataforma CAPI',
}

export default function TermosPage() {
  return (
    <main
      className="capi-container"
      style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}
    >
      <article style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Termos e Condições de Uso
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
          Última atualização: novembro de 2026
        </p>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            1. Aceitação dos Termos
          </h2>
          <p>
            Ao utilizar a plataforma CAPI, você concorda com estes Termos e Condições. Se não
            concordar, não utilize nossos serviços.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            2. Descrição do Serviço
          </h2>
          <p>
            A CAPI é uma plataforma de marketplace que conecta turistas a guias de turismo
            certificados. A CAPI facilita a descoberta, comparação e reserva de roteiros turísticos
            com pagamento integrado via PIX.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            3. Política de Cancelamento e Reembolso
          </h2>
          <p>
            Em conformidade com o Código de Defesa do Consumidor (Art. 49), você tem o direito de
            cancelar sua reserva em até <strong>7 (sete) dias corridos</strong> após a confirmação
            do pagamento, com reembolso integral do valor pago.
          </p>
          <p style={{ marginTop: 'var(--space-3)' }}>Após o período de 7 dias:</p>
          <ul style={{ paddingLeft: 'var(--space-6)', marginTop: 'var(--space-2)' }}>
            <li>Cancelamento até 48h antes da partida: reembolso de 80% do valor</li>
            <li>Cancelamento até 24h antes da partida: reembolso de 50% do valor</li>
            <li>Cancelamento com menos de 24h: sem reembolso</li>
          </ul>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            4. Responsabilidades
          </h2>
          <p>
            A CAPI atua como intermediária entre turistas e guias. A execução do roteiro é
            responsabilidade do guia/operadora contratada. A CAPI não se responsabiliza por
            condições climáticas, cancelamentos por força maior ou qualidade dos serviços prestados
            pelo guia.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            5. Proteção de Dados (LGPD)
          </h2>
          <p>
            Seus dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (Lei
            13.709/2018). O CPF é armazenado de forma criptografada e nunca compartilhado com
            terceiros. Você pode solicitar a exportação ou exclusão dos seus dados a qualquer
            momento.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            6. Pagamentos
          </h2>
          <p>
            Todos os pagamentos são processados via Mercado Pago utilizando PIX. A CAPI não armazena
            dados de cartão de crédito ou dados bancários.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            7. Alterações nos Termos
          </h2>
          <p>
            A CAPI reserva-se o direito de alterar estes termos a qualquer momento. Alterações
            significativas serão comunicadas por e-mail aos usuários cadastrados.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>8. Contato</h2>
          <p>
            Para dúvidas sobre estes termos, entre em contato pelo e-mail:
            contato@capi.turismo.com.br
          </p>
        </section>
      </article>
    </main>
  )
}
