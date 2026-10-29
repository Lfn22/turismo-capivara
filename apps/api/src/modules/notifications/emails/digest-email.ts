export function digestSubject(n: number): string {
  return `Você tem ${n} novidade(s) na CAPI`
}

interface DigestEmailParams {
  name: string
  items: { title: string; body: string; count: number }[]
  link: string
  linkLabel?: string
}

export function digestEmailText({ name, items, link, linkLabel = 'Veja tudo em' }: DigestEmailParams): string {
  const lines = items
    .map((i) => `- ${i.title} — ${i.body}${i.count > 1 ? ` (${i.count}x)` : ''}`)
    .join('\n')

  return `Olá, ${name}!

Você tem novidades não lidas na CAPI:

${lines}

${linkLabel}: ${link}

— Equipe CAPI`
}
