import 'dotenv/config'
import { createHmac } from 'crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

function hashCpf(cpf: string): string {
  const secret = process.env.CPF_SECRET
  if (!secret) throw new Error('CPF_SECRET environment variable is required')
  return createHmac('sha256', secret).update(cpf).digest('hex')
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function createTenantData(
  tenantId: string,
  adminEmail: string,
  adminName: string,
  guia1: { name: string; email: string; cpf: string; bio: string; especialidades: string[]; regioes: string[]; photoUrl?: string },
  guia2: { name: string; email: string; cpf: string; bio: string; especialidades: string[]; regioes: string[]; photoUrl?: string },
  pacotes: { name: string; description: string; duration: number; price: number; capacity: number; difficulty: string }[]
) {
  await prisma.user.create({
    data: {
      tenantId,
      name: adminName,
      email: adminEmail,
      password: hashSync('senha123', 10),
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
    },
  })

  const guiaAprovado = await prisma.user.create({
    data: {
      tenantId,
      name: guia1.name,
      email: guia1.email,
      password: hashSync('senha123', 10),
      role: 'CONDUTOR',
      cpf: hashCpf(guia1.cpf),
      approvalStatus: 'APPROVED',
    },
  })

  await prisma.guideProfile.create({
    data: {
      userId: guiaAprovado.id,
      bio: guia1.bio,
      photoUrl: guia1.photoUrl ?? null,
      especialidades: guia1.especialidades,
      regioes: guia1.regioes,
    },
  })

  const guiaPendente = await prisma.user.create({
    data: {
      tenantId,
      name: guia2.name,
      email: guia2.email,
      password: hashSync('senha123', 10),
      role: 'CONDUTOR',
      cpf: hashCpf(guia2.cpf),
      approvalStatus: 'PENDING',
    },
  })

  await prisma.guideProfile.create({
    data: {
      userId: guiaPendente.id,
      bio: guia2.bio,
      photoUrl: guia2.photoUrl ?? null,
      especialidades: guia2.especialidades,
      regioes: guia2.regioes,
    },
  })

  const hoje = new Date()
  let primeiroSlotId: string | null = null

  for (const pacote of pacotes) {
    const pkg = await prisma.tourPackage.create({
      data: {
        tenantId,
        conductorId: guiaAprovado.id,
        name: pacote.name,
        description: pacote.description,
        duration: pacote.duration,
        price: pacote.price,
        capacity: pacote.capacity,
        difficulty: pacote.difficulty as 'EASY' | 'MODERATE' | 'HARD',
      },
    })

    for (let i = 1; i <= 5; i++) {
      const data = new Date(hoje)
      data.setDate(hoje.getDate() + i * 3)
      data.setHours(8, 0, 0, 0)
      const slot = await prisma.departureSlot.create({
        data: { packageId: pkg.id, startsAt: data, capacity: pkg.capacity },
      })
      if (!primeiroSlotId) primeiroSlotId = slot.id
    }

    if (primeiroSlotId) {
      await prisma.booking.create({
        data: {
          tenantId,
          slotId: primeiroSlotId,
          customerName: 'Maria Turista',
          customerEmail: 'maria@teste.com',
          customerPhone: '86999990000',
          customerCpfHash: hashCpf('11122233344'),
          pax: 2,
          status: 'PENDING',
          cancelToken: `seed-cancel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
      })
      await prisma.departureSlot.update({
        where: { id: primeiroSlotId },
        data: { booked: 2 },
      })
      primeiroSlotId = null
    }
  }

  return { guiaAprovadoId: guiaAprovado.id, guiaPendenteId: guiaPendente.id }
}

async function main() {
  console.log('Limpando banco...')
  await prisma.voucher.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.departureSlot.deleteMany()
  await prisma.packageGuide.deleteMany()
  await prisma.tourPackage.deleteMany()
  await prisma.guideProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()
  // destinations NÃO são deletadas — upsert preserva heroImageUrl e photos existentes

  // ── Destinations ──────────────────────────────────────────────────────────
  console.log('Criando/atualizando destinations...')

  const destSerraCapivara = await prisma.destination.upsert({
    where: { slug: 'serra-da-capivara' },
    update: {
      title: 'Serra da Capivara',
      subtitle: 'Arte rupestre e patrimônio mundial',
      description:
        'O Parque Nacional Serra da Capivara é um dos maiores acervos de arte rupestre do mundo, com mais de 30 mil anos de história humana registrada nas pedras.',
      state: 'PI',
      highlights: ['Arte Rupestre', 'Patrimônio UNESCO', 'Trilhas', 'Arqueologia'],
    },
    create: {
      slug: 'serra-da-capivara',
      title: 'Serra da Capivara',
      subtitle: 'Arte rupestre e patrimônio mundial',
      description:
        'O Parque Nacional Serra da Capivara é um dos maiores acervos de arte rupestre do mundo, com mais de 30 mil anos de história humana registrada nas pedras.',
      heroImageUrl: 'https://images.unsplash.com/photo-1580820726687-ac2885e50f18?w=1200&q=80',
      photos: [],
      state: 'PI',
      highlights: ['Arte Rupestre', 'Patrimônio UNESCO', 'Trilhas', 'Arqueologia'],
    },
  })

  const destJalapao = await prisma.destination.upsert({
    where: { slug: 'jalapao' },
    update: {
      title: 'Jalapão',
      subtitle: 'Dunas, fervedouros e cerrado intocado',
      description:
        'O Jalapão é um dos destinos mais selvagens do Brasil, com fervedouros de água cristalina, dunas de areia dourada e paisagens do cerrado preservadas.',
      state: 'TO',
      highlights: ['Fervedouros', 'Dunas', 'Cerrado', 'Cachoeiras'],
    },
    create: {
      slug: 'jalapao',
      title: 'Jalapão',
      subtitle: 'Dunas, fervedouros e cerrado intocado',
      description:
        'O Jalapão é um dos destinos mais selvagens do Brasil, com fervedouros de água cristalina, dunas de areia dourada e paisagens do cerrado preservadas.',
      heroImageUrl: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=80',
      photos: [],
      state: 'TO',
      highlights: ['Fervedouros', 'Dunas', 'Cerrado', 'Cachoeiras'],
    },
  })

  const destPetrolina = await prisma.destination.upsert({
    where: { slug: 'petrolina' },
    update: {
      title: 'Petrolina',
      subtitle: 'Vale do São Francisco e turismo do vinho',
      description:
        'Petrolina surpreende com o turismo gastronômico e vinícola às margens do Rio São Francisco, além de passeios de barco e culinária típica nordestina.',
      state: 'PE',
      highlights: ['Vinícolas', 'Rio São Francisco', 'Gastronomia', 'Passeios de Barco'],
    },
    create: {
      slug: 'petrolina',
      title: 'Petrolina',
      subtitle: 'Vale do São Francisco e turismo do vinho',
      description:
        'Petrolina surpreende com o turismo gastronômico e vinícola às margens do Rio São Francisco, além de passeios de barco e culinária típica nordestina.',
      heroImageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
      photos: [],
      state: 'PE',
      highlights: ['Vinícolas', 'Rio São Francisco', 'Gastronomia', 'Passeios de Barco'],
    },
  })

  // ── Tenants ───────────────────────────────────────────────────────────────
  console.log('Criando tenants...')

  const tenantCapivara = await prisma.tenant.create({
    data: {
      name: 'Guias Serra da Capivara',
      slug: 'serra-capivara',
      cnpj: '11222333000181',
      approvalStatus: 'APPROVED',
      destinationId: destSerraCapivara.id,
    },
  })

  const tenantJalapao = await prisma.tenant.create({
    data: {
      name: 'Jalapão Expedições',
      slug: 'jalapao',
      cnpj: '22333444000192',
      approvalStatus: 'APPROVED',
      destinationId: destJalapao.id,
    },
  })

  const tenantPetrolina = await prisma.tenant.create({
    data: {
      name: 'Petrolina Turismo',
      slug: 'petrolina',
      cnpj: '33444555000103',
      approvalStatus: 'APPROVED',
      destinationId: destPetrolina.id,
    },
  })

  // ── Serra da Capivara — usuários e roteiros ───────────────────────────────
  console.log('Criando dados da Serra da Capivara...')
  await createTenantData(
    tenantCapivara.id,
    'admin@serracapivara.com',
    'Lucas Admin Capivara',
    {
      name: 'Ana Arqueóloga',
      email: 'ana@serracapivara.com',
      cpf: '11122233344',
      bio: 'Guia certificada com 12 anos de experiência nos sítios arqueológicos do PNSC. Especialista em arte rupestre pré-histórica.',
      especialidades: ['Arqueologia', 'Arte Rupestre', 'Fotografia'],
      regioes: ['Serra da Capivara', 'Piauí'],
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    },
    {
      name: 'Roberto Trilheiro',
      email: 'roberto@serracapivara.com',
      cpf: '22233344455',
      bio: 'Condutor local com conhecimento profundo das trilhas e da fauna do parque.',
      especialidades: ['Trilhas', 'Fauna', 'Sobrevivência'],
      regioes: ['Serra da Capivara'],
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    },
    [
      {
        name: 'Circuito das Pedras Pintadas',
        description: 'Visita guiada aos principais sítios arqueológicos com pinturas rupestres de até 30 mil anos.',
        duration: 4,
        price: 150,
        capacity: 8,
        difficulty: 'MODERATE',
      },
      {
        name: 'Trilha do Boqueirão da Pedra Furada',
        description: 'Trilha icônica até a Pedra Furada, um dos símbolos do parque, com vista panorâmica do vale.',
        duration: 6,
        price: 220,
        capacity: 6,
        difficulty: 'HARD',
      },
    ]
  )

  // ── Jalapão — usuários e roteiros ────────────────────────────────────────
  console.log('Criando dados do Jalapão...')
  await createTenantData(
    tenantJalapao.id,
    'admin@jalapao.com',
    'Marcos Admin Jalapão',
    {
      name: 'Fernanda Fervedouros',
      email: 'fernanda@jalapao.com',
      cpf: '33344455566',
      bio: 'Guia certificada do Jalapão com 8 anos conduzindo grupos pelos fervedouros e dunas do Tocantins.',
      especialidades: ['Fervedouros', 'Dunas', 'Cerrado', 'Cachoeiras'],
      regioes: ['Jalapão', 'Tocantins'],
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    },
    {
      name: 'Diego Aventureiro',
      email: 'diego@jalapao.com',
      cpf: '44455566677',
      bio: 'Condutor especializado em expedições off-road e acampamentos no cerrado do Jalapão.',
      especialidades: ['Off-road', 'Camping', 'Fotografia'],
      regioes: ['Jalapão'],
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    },
    [
      {
        name: 'Rota dos Fervedouros',
        description: 'Visita aos principais fervedouros do Jalapão: Buritizeiro, Ceiça e Encantado, com banho incluído.',
        duration: 8,
        price: 280,
        capacity: 10,
        difficulty: 'EASY',
      },
      {
        name: 'Dunas do Jalapão ao Pôr do Sol',
        description: 'Passeio até as dunas de areia dourada com pôr do sol e observação do cerrado.',
        duration: 4,
        price: 180,
        capacity: 12,
        difficulty: 'EASY',
      },
    ]
  )

  // ── Petrolina — usuários e roteiros ──────────────────────────────────────
  console.log('Criando dados de Petrolina...')
  await createTenantData(
    tenantPetrolina.id,
    'admin@petrolina.com',
    'Sandra Admin Petrolina',
    {
      name: 'Carlos Sommelier',
      email: 'carlos@petrolina.com',
      cpf: '55566677788',
      bio: 'Guia especializado em enoturismo no Vale do São Francisco, com certificação em sommelerie e 10 anos no setor.',
      especialidades: ['Vinícolas', 'Gastronomia', 'Enoturismo'],
      regioes: ['Vale do São Francisco', 'Petrolina', 'Juazeiro'],
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    },
    {
      name: 'Juliana Rio',
      email: 'juliana@petrolina.com',
      cpf: '66677788899',
      bio: 'Condutora local especializada em passeios fluviais e cultura ribeirinha do São Francisco.',
      especialidades: ['Passeios de Barco', 'Cultura Ribeirinha', 'Pesca'],
      regioes: ['Petrolina', 'Rio São Francisco'],
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    },
    [
      {
        name: 'Tour pelas Vinícolas do Vale',
        description: 'Visita a 3 vinícolas premiadas do Vale do São Francisco com degustação e almoço incluídos.',
        duration: 6,
        price: 320,
        capacity: 10,
        difficulty: 'EASY',
      },
      {
        name: 'Passeio de Barco no São Francisco',
        description: 'Navegação pelo Rio São Francisco ao pôr do sol, com paradas em ilhas e cultura ribeirinha.',
        duration: 3,
        price: 160,
        capacity: 15,
        difficulty: 'EASY',
      },
    ]
  )

  // ── CAPI Platform — super admin ───────────────────────────────────────────
  console.log('Criando plataforma e super admin...')

  const platformTenant = await prisma.tenant.create({
    data: {
      name: 'CAPI Platform',
      slug: 'capi-platform',
      approvalStatus: 'APPROVED',
    },
  })

  await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      name: 'Super Admin',
      email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@capi.turismo',
      password: hashSync(process.env.SUPER_ADMIN_PASSWORD ?? 'superadmin123', 10),
      role: 'SUPER_ADMIN',
      approvalStatus: 'APPROVED',
    },
  })

  console.log('\nSeed concluído!')
  console.log('\nDestinations: serra-da-capivara | jalapao | petrolina')
  console.log('Tenants: serra-capivara | jalapao | petrolina | capi-platform')
  console.log('\nUsuários por tenant:')
  console.log('  [Serra da Capivara]')
  console.log('    ADMIN: admin@serracapivara.com / senha123')
  console.log('    CONDUTOR (APPROVED): ana@serracapivara.com / senha123')
  console.log('    CONDUTOR (PENDING): roberto@serracapivara.com / senha123')
  console.log('  [Jalapão]')
  console.log('    ADMIN: admin@jalapao.com / senha123')
  console.log('    CONDUTOR (APPROVED): fernanda@jalapao.com / senha123')
  console.log('    CONDUTOR (PENDING): diego@jalapao.com / senha123')
  console.log('  [Petrolina]')
  console.log('    ADMIN: admin@petrolina.com / senha123')
  console.log('    CONDUTOR (APPROVED): carlos@petrolina.com / senha123')
  console.log('    CONDUTOR (PENDING): juliana@petrolina.com / senha123')
  console.log('  [Super Admin]')
  console.log('    SUPER_ADMIN: superadmin@capi.turismo / superadmin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
