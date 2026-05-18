interface ApprovalEmailParams {
  operatorName: string
  slug: string
}

export function approvalEmailText({ operatorName, slug }: ApprovalEmailParams): string {
  return `Olá, ${operatorName}!

Sua operadora foi aprovada no CAPI e já está ativa no marketplace.

Acesse seu painel em: https://capi.turismo/${slug}/admin

Boas vendas!
— Equipe CAPI`
}
