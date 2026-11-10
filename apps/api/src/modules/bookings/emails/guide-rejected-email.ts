export const guideRejectedSubject = 'Seu cadastro na CAPI precisa de ajustes'

interface GuideRejectedEmailParams {
  guideName: string
  reason: string
}

export function guideRejectedEmailText({ guideName, reason }: GuideRejectedEmailParams): string {
  return `Olá, ${guideName}!

Seu cadastro de guia não foi aprovado desta vez.

Motivo informado pela equipe CAPI: ${reason}

Para corrigir, reenvie o comprovante na página de status do seu cadastro: https://capi.turismo/guia/status

— Equipe CAPI`
}
