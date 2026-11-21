import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { Difficulty } from '@prisma/client'
import { paginationQuerySchema } from '../../../shared/utils/pagination'

// Reproduce the schemas from search.route.ts so we test the validation logic
// without needing a running Fastify server.

const searchQuerySchema = paginationQuerySchema.extend({
  sw_lat: z.coerce.number().min(-90).max(90).optional(),
  sw_lng: z.coerce.number().min(-180).max(180).optional(),
  ne_lat: z.coerce.number().min(-90).max(90).optional(),
  ne_lng: z.coerce.number().min(-180).max(180).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  difficulty: z.string().optional(),
  duration_min: z.coerce.number().int().min(0).optional(),
  duration_max: z.coerce.number().int().min(0).optional(),
  search: z.string().min(1).max(100).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name']).optional().default('newest'),
})

function parseDifficulties(raw: string): Difficulty[] {
  const valid = new Set<string>(Object.values(Difficulty))
  return raw
    .split(',')
    .map((d) => d.trim().toUpperCase())
    .filter((d) => valid.has(d)) as Difficulty[]
}

// ---------------------------------------------------------------------------
// searchQuerySchema — bbox params
// ---------------------------------------------------------------------------

describe('searchQuerySchema — bbox params', () => {
  it('aceita bbox válido', () => {
    const result = searchQuerySchema.safeParse({
      sw_lat: '-10.5',
      sw_lng: '-43.2',
      ne_lat: '-8.0',
      ne_lng: '-41.5',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sw_lat).toBe(-10.5)
      expect(result.data.sw_lng).toBe(-43.2)
      expect(result.data.ne_lat).toBe(-8.0)
      expect(result.data.ne_lng).toBe(-41.5)
    }
  })

  it('rejeita latitude > 90', () => {
    const result = searchQuerySchema.safeParse({ sw_lat: '91' })
    expect(result.success).toBe(false)
  })

  it('rejeita latitude < -90', () => {
    const result = searchQuerySchema.safeParse({ ne_lat: '-91' })
    expect(result.success).toBe(false)
  })

  it('rejeita longitude > 180', () => {
    const result = searchQuerySchema.safeParse({ ne_lng: '181' })
    expect(result.success).toBe(false)
  })

  it('rejeita longitude < -180', () => {
    const result = searchQuerySchema.safeParse({ sw_lng: '-181' })
    expect(result.success).toBe(false)
  })

  it('aceita limites exatos (-90, 90, -180, 180)', () => {
    const result = searchQuerySchema.safeParse({
      sw_lat: '-90',
      sw_lng: '-180',
      ne_lat: '90',
      ne_lng: '180',
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// searchQuerySchema — sort
// ---------------------------------------------------------------------------

describe('searchQuerySchema — sort', () => {
  it('default sort é "newest"', () => {
    const result = searchQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sort).toBe('newest')
    }
  })

  it('aceita price_asc', () => {
    const result = searchQuerySchema.safeParse({ sort: 'price_asc' })
    expect(result.success).toBe(true)
  })

  it('aceita price_desc', () => {
    const result = searchQuerySchema.safeParse({ sort: 'price_desc' })
    expect(result.success).toBe(true)
  })

  it('aceita name', () => {
    const result = searchQuerySchema.safeParse({ sort: 'name' })
    expect(result.success).toBe(true)
  })

  it('rejeita sort inválido', () => {
    const result = searchQuerySchema.safeParse({ sort: 'rating' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// searchQuerySchema — price filters
// ---------------------------------------------------------------------------

describe('searchQuerySchema — price filters', () => {
  it('aceita min_price numérico', () => {
    const result = searchQuerySchema.safeParse({ min_price: '5000' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.min_price).toBe(5000)
    }
  })

  it('aceita max_price numérico', () => {
    const result = searchQuerySchema.safeParse({ max_price: '15000' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.max_price).toBe(15000)
    }
  })

  it('rejeita min_price negativo', () => {
    const result = searchQuerySchema.safeParse({ min_price: '-1' })
    expect(result.success).toBe(false)
  })

  it('aceita min_price e max_price juntos', () => {
    const result = searchQuerySchema.safeParse({ min_price: '100', max_price: '500' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.min_price).toBe(100)
      expect(result.data.max_price).toBe(500)
    }
  })
})

// ---------------------------------------------------------------------------
// parseDifficulties — CSV parsing
// ---------------------------------------------------------------------------

describe('parseDifficulties', () => {
  it('faz parse de CSV de dificuldades', () => {
    expect(parseDifficulties('EASY,HARD')).toEqual(['EASY', 'HARD'])
  })

  it('normaliza minúsculas para maiúsculas', () => {
    expect(parseDifficulties('easy,moderate')).toEqual(['EASY', 'MODERATE'])
  })

  it('ignora valores inválidos', () => {
    expect(parseDifficulties('EASY,INVALID,HARD')).toEqual(['EASY', 'HARD'])
  })

  it('trata espaços em branco', () => {
    expect(parseDifficulties(' EASY , MODERATE ')).toEqual(['EASY', 'MODERATE'])
  })

  it('retorna array vazio para string totalmente inválida', () => {
    expect(parseDifficulties('FOO,BAR')).toEqual([])
  })

  it('aceita valor único sem vírgula', () => {
    expect(parseDifficulties('MODERATE')).toEqual(['MODERATE'])
  })
})

// ---------------------------------------------------------------------------
// searchQuerySchema — search text
// ---------------------------------------------------------------------------

describe('searchQuerySchema — search text', () => {
  it('aceita busca textual válida', () => {
    const result = searchQuerySchema.safeParse({ search: 'Serra da Capivara' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe('Serra da Capivara')
    }
  })

  it('rejeita busca vazia (min 1 char)', () => {
    const result = searchQuerySchema.safeParse({ search: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita busca com mais de 100 caracteres', () => {
    const result = searchQuerySchema.safeParse({ search: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// searchQuerySchema — pagination defaults
// ---------------------------------------------------------------------------

describe('searchQuerySchema — pagination', () => {
  it('default limit é 20', () => {
    const result = searchQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
    }
  })

  it('aceita cursor string', () => {
    const result = searchQuerySchema.safeParse({ cursor: 'clxyz123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cursor).toBe('clxyz123')
    }
  })

  it('rejeita limit > 100', () => {
    const result = searchQuerySchema.safeParse({ limit: '101' })
    expect(result.success).toBe(false)
  })
})
