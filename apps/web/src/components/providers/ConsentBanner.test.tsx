import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConsentBanner } from './ConsentBanner'

describe('ConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows banner when no consent stored', () => {
    render(<ConsentBanner />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/cookies/i)).toBeInTheDocument()
  })

  it('hides banner when consent already accepted', () => {
    localStorage.setItem('capi-cookie-consent', 'accepted')
    render(<ConsentBanner />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides banner when consent already rejected', () => {
    localStorage.setItem('capi-cookie-consent', 'rejected')
    render(<ConsentBanner />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stores "rejected" and hides on Recusar click', () => {
    render(<ConsentBanner />)
    fireEvent.click(screen.getByText('Recusar'))
    expect(localStorage.getItem('capi-cookie-consent')).toBe('rejected')
  })

  it('stores "accepted" on Aceitar click', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    })

    render(<ConsentBanner />)
    fireEvent.click(screen.getByText('Aceitar'))
    expect(localStorage.getItem('capi-cookie-consent')).toBe('accepted')
  })

  it('links to privacy policy', () => {
    render(<ConsentBanner />)
    const link = screen.getByText(/política de privacidade/i)
    expect(link).toHaveAttribute('href', '/politica-privacidade')
  })
})
