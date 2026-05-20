export const guideApprovedSubject = 'Sua conta de guia foi aprovada — CAPI'

interface GuideApprovedEmailParams {
  guideName: string
  slug: string
}

export function guideApprovedEmailText({ guideName, slug }: GuideApprovedEmailParams): string {
  return `Olá, ${guideName}!

Sua conta de guia foi aprovada. Você já pode acessar seu painel e começar a receber reservas.

Acesse seu painel em: https://capi.turismo/${slug}/guia/perfil

— Equipe CAPI`
}
