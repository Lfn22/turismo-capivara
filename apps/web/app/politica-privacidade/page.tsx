import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — CAPI',
}

export default function PoliticaPrivacidade() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', color: '#3d3028', fontFamily: 'inherit', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#2a1f16' }}>
        Política de Privacidade
      </h1>
      <p style={{ color: '#6B5D4F', marginBottom: 40, fontSize: 14 }}>
        Última atualização: outubro de 2026
      </p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          1. Dados coletados
        </h2>
        <p>
          Coletamos dados que você nos fornece diretamente (nome, e-mail, telefone) ao se cadastrar
          ou realizar uma reserva, além de dados gerados automaticamente durante o uso do site
          (endereço IP, navegador, páginas visitadas, eventos de clique).
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          2. Finalidade
        </h2>
        <p>Utilizamos seus dados para:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Criação e gerenciamento de conta</li>
          <li>Processamento de reservas e pagamentos</li>
          <li>Comunicações transacionais (confirmações, lembretes)</li>
          <li>Análise de uso para melhoria do produto (com seu consentimento)</li>
          <li>Monitoramento de erros para estabilidade do serviço</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          3. Cookies e analytics
        </h2>
        <p>
          Utilizamos o <strong>PostHog</strong> para analytics de uso. Esses cookies só são
          ativados após seu consentimento explícito via o banner de cookies. Você pode rejeitar
          a qualquer momento — sem impacto nas funcionalidades do site.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          4. Compartilhamento de dados
        </h2>
        <p>Seus dados podem ser compartilhados com os seguintes prestadores de serviço:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><strong>Mercado Pago</strong> — processamento de pagamentos via PIX e cartão</li>
          <li><strong>Resend</strong> — envio de e-mails transacionais</li>
          <li><strong>Cloudflare</strong> — armazenamento de arquivos (fotos de perfil, imagens de roteiros)</li>
          <li><strong>PostHog</strong> — analytics de uso (somente com consentimento)</li>
          <li><strong>Sentry</strong> — monitoramento de erros (interesse legítimo, sem dados pessoais sensíveis)</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Não vendemos nem alugamos seus dados a terceiros.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          5. Seus direitos (LGPD — Art. 18)
        </h2>
        <p>Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Confirmar a existência de tratamento dos seus dados</li>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
          <li>Portabilidade dos dados a outro fornecedor de serviço</li>
          <li>Revogar o consentimento a qualquer momento</li>
          <li>Opor-se ao tratamento realizado com fundamento em legítimo interesse</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          6. Retenção
        </h2>
        <p>
          Mantemos seus dados pelo tempo necessário para a prestação dos serviços e cumprimento
          de obrigações legais. Dados de reservas são retidos por 5 anos (obrigação fiscal).
          Dados de analytics são retidos por 12 meses.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          7. Segurança
        </h2>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
          não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia em
          trânsito (TLS), tokens de autenticação com expiração e controle de acesso por função (RBAC).
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#2a1f16' }}>
          8. Contato
        </h2>
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato com
          nosso encarregado de dados (DPO):
        </p>
        <p style={{ marginTop: 8 }}>
          <a href="mailto:privacidade@capi.turismo" style={{ color: '#C4852A' }}>
            privacidade@capi.turismo
          </a>
        </p>
      </section>
    </main>
  )
}
