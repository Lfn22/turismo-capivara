import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Limpando banco...')
  await prisma.voucher.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.departureSlot.deleteMany()
  await prisma.tourPackage.deleteMany()
  await prisma.guideProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  console.log('Criando tenants...')

  const receptivo1 = await prisma.tenant.create({
    data: {
      name: 'Receptivo Serra Viva',
      slug: 'serra-viva',
    },
  })

  const receptivo2 = await prisma.tenant.create({
    data: {
      name: 'Agencia Capivara Turismo',
      slug: 'capivara-turismo',
    },
  })

  console.log('Criando usuarios...')

  await prisma.user.create({
    data: {
      tenantId: receptivo1.id,
      name: 'Carlos Admin',
      email: 'carlos@serraviva.com',
      password: hashSync('senha123', 10),
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
    },
  })

  const anaUser = await prisma.user.create({
    data: {
      tenantId: receptivo1.id,
      name: 'Ana Condutora',
      email: 'ana@serraviva.com',
      password: hashSync('senha123', 10),
      role: 'CONDUTOR',
      cpf: '12345678901',
      approvalStatus: 'APPROVED',
    },
  })

  await prisma.guideProfile.create({
    data: {
      userId: anaUser.id,
      bio: 'Guia experiente da Serra da Capivara com 10 anos de experiência em arqueologia e trilhas.',
      especialidades: ['Arqueologia', 'Trilhas', 'Fotografia'],
      regioes: ['Serra da Capivara', 'Piauí'],
    },
  })

  // CONDUTOR pendente de aprovação — para testar fluxo de admin
  const joaoUser = await prisma.user.create({
    data: {
      tenantId: receptivo1.id,
      name: 'João Condutor Pendente',
      email: 'joao@serraviva.com',
      password: hashSync('senha123', 10),
      role: 'CONDUTOR',
      cpf: '98765432100',
      approvalStatus: 'PENDING',
    },
  })

  await prisma.guideProfile.create({
    data: {
      userId: joaoUser.id,
      bio: 'Condutor local especializado em fauna e flora do cerrado piauiense.',
      especialidades: ['Fauna', 'Flora', 'Cerrado'],
      regioes: ['Serra da Capivara'],
    },
  })

  await prisma.user.create({
    data: {
      tenantId: receptivo2.id,
      name: 'Pedro Admin',
      email: 'pedro@capivaraturismo.com',
      password: hashSync('senha123', 10),
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
    },
  })

  console.log('Criando roteiros...')

  const roteiro1 = await prisma.tourPackage.create({
    data: {
      tenantId: receptivo1.id,
      conductorId: anaUser.id,
      name: 'Circuito das Pedras Pintadas',
      description: 'Visita aos principais sitios arqueologicos do parque',
      duration: 4,
      price: 150.00,
      capacity: 10,
      difficulty: 'MODERATE',
    },
  })

  const roteiro2 = await prisma.tourPackage.create({
    data: {
      tenantId: receptivo1.id,
      conductorId: anaUser.id,
      name: 'Trilha do Boqueirao',
      description: 'Trilha com vista panoramica do vale',
      duration: 6,
      price: 220.00,
      capacity: 8,
      difficulty: 'HARD',
    },
  })

  console.log('Criando slots de saida...')

  const hoje = new Date()

  for (let i = 1; i <= 5; i++) {
    const data = new Date(hoje)
    data.setDate(hoje.getDate() + i * 3)
    data.setHours(8, 0, 0, 0)

    await prisma.departureSlot.create({
      data: {
        packageId: roteiro1.id,
        startsAt: data,
        capacity: roteiro1.capacity,
      },
    })
  }

  for (let i = 1; i <= 3; i++) {
    const data = new Date(hoje)
    data.setDate(hoje.getDate() + i * 5)
    data.setHours(7, 0, 0, 0)

    await prisma.departureSlot.create({
      data: {
        packageId: roteiro2.id,
        startsAt: data,
        capacity: roteiro2.capacity,
      },
    })
  }

  console.log('Criando booking de teste...')

  const primeiroSlot = await prisma.departureSlot.findFirst({
    where: { packageId: roteiro1.id },
    orderBy: { startsAt: 'asc' },
  })

  if (primeiroSlot) {
    await prisma.booking.create({
      data: {
        tenantId: receptivo1.id,
        slotId: primeiroSlot.id,
        customerName: 'Maria Turista',
        customerEmail: 'maria@teste.com',
        customerPhone: '86999990000',
        customerCpf: '11122233344',
        pax: 2,
        status: 'PENDING',
      },
    })

    await prisma.departureSlot.update({
      where: { id: primeiroSlot.id },
      data: { booked: 2 },
    })
  }

  console.log('Seed concluido!')
  console.log('Tenants: serra-viva | capivara-turismo')
  console.log('Usuarios:')
  console.log('  ADMIN: carlos@serraviva.com / senha123')
  console.log('  CONDUTOR (APPROVED): ana@serraviva.com / senha123')
  console.log('  CONDUTOR (PENDING): joao@serraviva.com / senha123')
  console.log('  ADMIN (tenant2): pedro@capivaraturismo.com / senha123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())