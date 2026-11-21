import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/dynamic to render the loading placeholder instead of the actual MapWidget
vi.mock('next/dynamic', () => ({
  default: (_loader: () => Promise<unknown>, opts: { loading?: () => React.JSX.Element }) => {
    // Return a component that renders the loading fallback
    return function MockDynamic() {
      return opts?.loading?.() ?? null
    }
  },
}))

// Must import after mock setup
import MapWidgetClient from './MapWidgetClient'

describe('MapWidgetClient', () => {
  it('renders loading placeholder initially', () => {
    render(<MapWidgetClient lat={-8.83} lng={-42.55} destinationName="Serra da Capivara" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows "Carregando mapa..." text in placeholder', () => {
    render(<MapWidgetClient lat={-8.83} lng={-42.55} destinationName="Serra da Capivara" />)
    expect(screen.getByText(/Carregando mapa/)).toBeInTheDocument()
  })
})
