import React, { ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background text-foreground">
          <div className="max-w-md w-full p-6 bg-card rounded-lg border shadow-lg">
            <h2 className="text-2xl font-bold text-destructive mb-4">Что-то пошло не так</h2>
            <p className="text-muted-foreground mb-4">
              Произошла непредвиденная ошибка в приложении.
            </p>
            {this.state.error && (
              <pre className="bg-muted p-3 rounded text-xs text-left overflow-auto mb-4 max-h-32">
                {this.state.error.toString()}
              </pre>
            )}
            <Button
              onClick={this.handleRetry}
            >
              Обновить страницу
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;