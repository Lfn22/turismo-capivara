'use client'

import React from 'react'
import * as Sentry from '@sentry/nextjs'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, { contexts: { react: { componentStack: info?.componentStack } } })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 'clamp(2rem, 8vw, 4rem) 1rem',
            gap: '1rem',
            minHeight: '200px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
              fontWeight: 600,
              color: 'var(--stone-800)',
              margin: 0,
            }}
          >
            Algo deu errado
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              color: 'var(--stone-500)',
              margin: 0,
              maxWidth: '360px',
              lineHeight: 1.5,
            }}
          >
            Ocorreu um erro inesperado. Tente novamente.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 1.5rem',
              minHeight: '44px',
              background: 'var(--brand)',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
