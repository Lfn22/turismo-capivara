import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastProvider'

function ToastTrigger({
  message,
  type,
}: {
  message: string
  type?: 'success' | 'error' | 'info'
}) {
  const { toast } = useToast()
  return <button onClick={() => toast(message, type)}>Show Toast</button>
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div>child</div>
      </ToastProvider>,
    )
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('shows toast on trigger', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Test toast" />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText('Test toast')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('auto-dismisses toast after 4 seconds', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastTrigger message="Dismiss me" />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText('Dismiss me')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4100)
    })
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
