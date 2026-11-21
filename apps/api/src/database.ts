import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const poolSize = Number(process.env.DATABASE_POOL_SIZE ?? '20')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: poolSize,
})

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
})

export default prisma
