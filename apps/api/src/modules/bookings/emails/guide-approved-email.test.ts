import { describe, it, expect } from 'vitest'
import { guideApprovedSubject, guideApprovedEmailText } from './guide-approved-email'

describe('guideApprovedEmail', () => {
  it('NOTIF-03: subject is correct', () => {
    expect(guideApprovedSubject).toBe('Sua conta de guia foi aprovada — CAPI')
  })

  it('NOTIF-03: text includes guideName and profile URL with slug', () => {
    const result = guideApprovedEmailText({
      guideName: 'Roberto Explorador',
      slug: 'capivara-adventures',
    })
    expect(result).toContain('Roberto Explorador')
    expect(result).toContain('https://capi.turismo/capivara-adventures/guia/perfil')
    expect(result).toContain('— Equipe CAPI')
  })

  it('NOTIF-03: text confirms guide account was approved', () => {
    const result = guideApprovedEmailText({
      guideName: 'Marina',
      slug: 'marina-tours',
    })
    expect(result).toContain('aprovada')
    expect(result).toContain('reservas')
  })
})
