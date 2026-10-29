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
    })
    expect(result).toContain('Roberto')
    expect(result).toContain('Foto de perfil ilegível')
    expect(result).toContain('https://capi.turismo/guia/status')
    expect(result).toContain('reenvie o comprovante')
    expect(result).not.toContain('agência')
    expect(result).toContain('— Equipe CAPI')
  })
})
