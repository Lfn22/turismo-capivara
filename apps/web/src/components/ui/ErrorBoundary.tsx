'use client'

import React from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button, EmptyState } from '@/src/components/ui/capi'

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
        <div role="alert">
          <EmptyState
            icon={TriangleAlert}
            title="Algo deu errado"
            description="Ocorreu um erro inesperado nesta parte da página. Tente novamente; se continuar, recarregue a página."
            action={
              <Button variant="secondary" iconLeft={RotateCcw} onClick={this.handleReset}>
                Tentar novamente
              </Button>
            }
          />
        </div>
      )
    }

    return this.props.children
  }
}
