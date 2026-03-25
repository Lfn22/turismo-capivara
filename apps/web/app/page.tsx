"use client"

import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-bold text-[#1A1A1A] tracking-tight">
              Serra da Capivara
            </p>
            <p className="text-xs text-gray-400">
              Patrimônio Mundial UNESCO
            </p>
          </div>

          <Link
            href="/roteiros"
            className="bg-[#14532D] hover:bg-[#166534] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
          >
            Ver roteiros
          </Link>
        </div>
      </nav>

      <section className="bg-white px-4 py-24 text-center border-b border-gray-100">
        <p className="text-sm font-medium text-[#166534] mb-3 tracking-widest uppercase">
          Patrimônio Mundial da UNESCO
        </p>

        <h1 className="text-5xl font-bold text-[#1A1A1A] tracking-tight mb-4 leading-tight">
          Explore a história
          <br />
          de 25 mil anos
        </h1>

        <p className="text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">
          A Serra da Capivara abriga o maior conjunto de sítios arqueológicos
          das Américas. Venha conhecer as pinturas rupestres mais antigas do mundo.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/roteiros"
            className="bg-[#14532D] hover:bg-[#166534] text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Ver roteiros disponíveis
          </Link>

          <a
            href="#sobre"
            className="bg-white hover:bg-gray-50 text-[#1A1A1A] font-medium px-6 py-3 rounded-full border border-gray-200 transition-colors"
          >
            Saiba mais
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <span className="text-green-700 text-lg">🗿</span>
          </div>
          <h3 className="font-semibold text-[#1A1A1A] mb-2">
            Sítios arqueológicos
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Mais de 1.300 sítios registrados com pinturas rupestres datando de 25.000 anos.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <span className="text-green-700 text-lg">🦁</span>
          </div>
          <h3 className="font-semibold text-[#1A1A1A] mb-2">
            Fauna e flora únicas
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Cerrado e caatinga se encontram formando um ecossistema único com espécies endêmicas.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <span className="text-green-700 text-lg">🧭</span>
          </div>
          <h3 className="font-semibold text-[#1A1A1A] mb-2">
            Condutores credenciados
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Todos os nossos guias são credenciados pelo ICMBio e especializados no parque.
          </p>
        </div>
      </section>

      <section id="sobre" className="bg-white border-t border-gray-100 px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] tracking-tight mb-4">
            Como funciona
          </h2>

          <p className="text-gray-500 mb-12">
            Reserve seu passeio em poucos minutos
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="text-center">
                <div className="w-10 h-10 bg-[#14532D] text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  {step}
                </div>

                {step === 1 && (
                  <>
                    <h4 className="font-semibold text-[#1A1A1A] mb-1">
                      Escolha o roteiro
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Selecione o circuito e a data que preferir
                    </p>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h4 className="font-semibold text-[#1A1A1A] mb-1">
                      Preencha seus dados
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Nome, contato e número de pessoas
                    </p>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h4 className="font-semibold text-[#1A1A1A] mb-1">
                      Confirme via Pix
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Receba a confirmação por WhatsApp após o pagamento
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#1A1A1A] text-white px-4 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold tracking-tight">
              Serra da Capivara Turismo
            </p>
            <p className="text-gray-400 text-sm mt-0.5">
              São Raimundo Nonato, Piauí
            </p>
          </div>

          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/roteiros" className="hover:text-white transition-colors">
              Roteiros
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Painel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}