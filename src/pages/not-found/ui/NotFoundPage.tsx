import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useDocumentTitle('404');

  return (
    <div className="py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
        {'// 404 / not found'}
      </p>
      <h1 className="mt-3 font-mono text-2xl text-fg-primary">404</h1>
      <p className="mt-2 font-mono text-xs text-fg-muted">
        path: <span className="text-fg-secondary">{pathname}</span>
      </p>
      <div className="mt-6">
        <Button variant="secondary" onClick={() => navigate('/core')}>
          Back to Core
        </Button>
      </div>
    </div>
  );
}
