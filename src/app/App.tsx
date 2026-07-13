import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@shared/ui';
import { AppRoutes } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
