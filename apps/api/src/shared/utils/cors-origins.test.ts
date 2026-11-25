import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { corsOrigins } from './cors-origins'

describe('corsOrigins', () => {
  it('uma origem continua funcionando como antes', () => {
    expect(corsOrigins('https://capiturismo.com.br')).toEqual(['https://capiturismo.com.br'])
  })

  it('lista separada por vírgula, com espaços e barra final removidos', () => {
    expect(
      corsOrigins(' https://capiturismo.com.br/ , https://turismoweb-production.up.railway.app,'),
    ).toEqual(['https://capiturismo.com.br', 'https://turismoweb-production.up.railway.app'])
  })

  it('sem variável → localhost (desenvolvimento)', () => {
    expect(corsOrigins(undefined)).toEqual(['http://localhost:3000'])
  })

  it('preflight devolve a origem pedida quando ela está na lista, e nada quando não está', async () => {
    const app = Fastify()
    await app.register(cors, {
      origin: corsOrigins(
        'https://capiturismo.com.br,https://turismoweb-production.up.railway.app',
      ),
    })
    app.post('/x', async () => ({}))
    const preflight = (origin: string) =>
      app.inject({
        method: 'OPTIONS',
        url: '/x',
        headers: { origin, 'access-control-request-method': 'POST' },
      })

    const railway = await preflight('https://turismoweb-production.up.railway.app')
    expect(railway.headers['access-control-allow-origin']).toBe(
      'https://turismoweb-production.up.railway.app',
    )
    const evil = await preflight('https://evil.example.com')
    expect(evil.headers['access-control-allow-origin']).toBeUndefined()
    await app.close()
  })
})
