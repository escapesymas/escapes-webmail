import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado en renderizado:', error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-tech-card text-center min-h-[300px]">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            No se pudo mostrar este mensaje
          </h3>
          <p className="text-xs text-tech-muted mb-4 max-w-xs">
            Ocurrió un problema temporal al procesar el formato del correo.
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 rounded-xl bg-tech-yellow text-black font-semibold text-xs flex items-center gap-2 hover:bg-yellow-400 transition-colors shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Volver a la bandeja</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
