import type { Metadata } from 'next'
import PublicLayout from '@/src/components/layout/PublicLayout'
import CadastroForm from '@/src/components/turista/CadastroForm'

export const metadata: Metadata = {
  title: 'Criar conta — CAPI',
  description: 'Crie sua conta para explorar roteiros e reservar viagens.',
}

export default function CadastroPage() {
  return (
    <PublicLayout>
      <div className="flex min-h-dvh items-center justify-center px-4 py-16">
        <CadastroForm />
      </div>
    </PublicLayout>
  )
}
