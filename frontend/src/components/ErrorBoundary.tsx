import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full text-center">
            <div className="text-5xl mb-4">😿</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Произошла ошибка в интерфейсе</h1>
            <p className="text-slate-600 mb-6 text-sm">
              Что-то пошло не так при отрисовке приложения. Мы уже записали информацию об ошибке.
            </p>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 text-left">
              <p className="text-[10px] font-mono text-red-600 line-clamp-3">
                {this.state.error?.toString()}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
