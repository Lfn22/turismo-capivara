import { describe, it, expect } from 'vitest'
import { guideRejectedSubject, guideRejectedEmailText } from './guide-rejected-email'

describe('guideRejectedEmail', () => {
  it('subject is correct', () => {
    expect(guideRejectedSubject).toBe('Seu cadastro na CAPI precisa de ajustes')
  })

  it('text includes guide name, reason, profile URL and signature', () => {
    const result = guideRejectedEmailText({
      guideName: 'Roberto',
      reason: 'Foto de perfil ilegível',
      slug: 'capivara-adventures',
    })
    expect(result).toContain('Roberto')
    expect(result).toContain('Foto de perfil ilegível')
    expect(result).toContain('https://capi.turismo/capivara-adventures/guia/perfil')
    expect(result).toContain('— Equipe CAPI')
  })
})
