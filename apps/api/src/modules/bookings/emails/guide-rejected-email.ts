export const guideRejectedSubject = 'Seu cadastro na CAPI precisa de ajustes'

interface GuideRejectedEmailParams {
  guideName: string
  reason: string
  slug: string
}

export function guideRejectedEmailText({ guideName, reason, slug }: GuideRejectedEmailParams): string {
  return `Olá, ${guideName}!

Seu cadastro de guia não foi aprovado desta vez.

Motivo informado pela agência: ${reason}

Para corrigir, acesse seu perfil, ajuste as informações indicadas e entre em contato com a agência para uma nova análise: https://capi.turismo/${slug}/guia/perfil

— Equipe CAPI`
}
