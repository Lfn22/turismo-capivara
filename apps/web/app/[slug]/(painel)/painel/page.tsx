import { redirect } from "next/navigation"

/** /{slug}/painel não tem conteúdo próprio: leva à visão geral (destino dos botões "voltar"). */
export default async function PainelIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/${slug}/painel/dashboard`)
}
