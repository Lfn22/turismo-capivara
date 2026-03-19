import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

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
      role: 'ADMIN',
    },
  })

  await prisma.user.create({
    data: {
      tenantId: receptivo1.id,
      name: 'Ana Condutora',
      email: 'ana@serraviva.com',
      role: 'CONDUTOR',
    },
  })

  await prisma.user.create({
    data: {
      tenantId: receptivo2.id,
      name: 'Pedro Admin',
      email: 'pedro@capivaraturismo.com',
      role: 'ADMIN',
    },
  })

  console.log('Criando roteiros...')

  const roteiro1 = await prisma.tourPackage.create({
    data: {
      tenantId: receptivo1.id,
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

  console.log('Seed concluido!')
  console.log('Tenants criados:', receptivo1.slug, receptivo2.slug)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())