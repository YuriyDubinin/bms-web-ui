import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Корневой ErrorBoundary. Перехватывает rendering-исключения, ниже которых
 * нет других boundaries. Логируем в console.error только в DEV.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      const message = this.state.error.message || 'Unknown error';
      return (
        <div
          role="alert"
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0 px-4"
        >
          <div className="w-full max-w-md">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
              {'// CONSOLE ERROR'}
            </p>
            <h1 className="mt-3 font-mono text-xl text-fg-primary">Something broke.</h1>
            <p className="mt-2 break-words text-sm text-fg-secondary">{message}</p>
            <div className="mt-6">
              <Button variant="secondary" onClick={this.reload}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
