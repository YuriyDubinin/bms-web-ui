import { Card, Button } from '@shared/ui';
import { ApiError } from '@shared/api';
import { PanelTitle } from '@widgets/system-snapshot';

export type CoreErrorProps = {
  error: unknown;
  onRetry?: () => void;
};

export function CoreError({ error, onRetry }: CoreErrorProps) {
  const message =
    error instanceof ApiError
      ? `${error.code} · ${error.message}`
      : error instanceof Error
        ? error.message
        : 'Unknown error';

  return (
    <Card>
      <PanelTitle title="System snapshot unavailable" subtitle={'// fetch failed'} />
      <p className="font-mono text-xs text-fg-secondary">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
