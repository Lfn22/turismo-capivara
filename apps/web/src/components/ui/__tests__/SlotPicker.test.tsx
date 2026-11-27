import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/src/lib/posthog', () => ({ posthog: { capture: vi.fn() } }))

import SlotPicker from '../SlotPicker'

const base = { status: 'OPEN', capacity: 16, booked: 0 }

describe('SlotPicker — modelo de grupo', () => {
  it('mostra "até N pessoas" e só oferece horários livres', () => {
    render(
      <SlotPicker
        packageId="p1"
        slug="capi"
        slots={[
          { ...base, id: 's1', startsAt: '2026-12-10T12:00:00.000Z', available: true, maxPax: 16 },
          {
            ...base,
            id: 's2',
            startsAt: '2026-12-10T15:00:00.000Z',
            booked: 3,
            available: false,
            maxPax: 16,
          },
        ]}
      />,
    )
    expect(screen.getByText('até 16 pessoas')).toBeInTheDocument()
    expect(screen.getAllByRole('option', { name: /pessoas/ })).toHaveLength(1)
    expect(screen.queryByText(/vagas?/)).toBeNull()
  })
})
