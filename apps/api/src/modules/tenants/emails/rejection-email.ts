interface RejectionEmailParams {
  operatorName: string
  rejectionReason: string
}

export function rejectionEmailText({ operatorName, rejectionReason }: RejectionEmailParams): string {
  return `Olá, ${operatorName}.

Infelizmente sua solicitação de cadastro no CAPI foi rejeitada.

Motivo: ${rejectionReason}

Em caso de dúvidas, entre em contato com nosso suporte.
— Equipe CAPI`
}
