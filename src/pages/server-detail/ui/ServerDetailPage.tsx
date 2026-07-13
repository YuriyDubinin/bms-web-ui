import { ArrowLeft, Server as ServerIcon } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, FullScreenSpinner } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { useServersQuery, type Server } from '@entities/server';
import { ServerDetailTabs, type ServerDetailTab } from './ServerDetailTabs';
import { ServerCicdTab } from './tabs/ServerCicdTab';
import { ServerMainTab } from './tabs/ServerMainTab';

/**
 * Найти сервер по id через список (отдельного getServer API пока нет).
 * Берём максимум, который разрешает бэк (page_size: 100). Если сервер не попал
 * в этот окно — покажем «not found», предложим вернуться к списку.
 */
function useServerById(id: string | undefined): {
  server: Server | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useServersQuery({ page: 1, page_size: 100 });
  const server = id ? data?.items.find((s) => s.id === id) : undefined;
  return { server, isLoading };
}

function tabFromPathname(pathname: string): ServerDetailTab {
  return pathname.replace(/\/+$/, '').endsWith('/cicd') ? 'cicd' : 'main';
}

export function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPathname(location.pathname);

  const { server, isLoading } = useServerById(id);

  useDocumentTitle(server ? `Server · ${server.name}` : 'Server');

  if (isLoading && !server) {
    return <FullScreenSpinner label="Loading server" />;
  }

  if (!server) {
    return (
      <>
        <PageHeader
          title="Server"
          subtitle={'// not found'}
          actions={
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft size={14} aria-hidden />}
              onClick={() => navigate('/servers')}
            >
              Back to servers
            </Button>
          }
        />
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ServerIcon size={22} aria-hidden className="text-fg-muted" />
            <p className="text-sm text-fg-secondary">Server not found</p>
            <p className="font-mono text-xs text-fg-muted">
              It may have been deleted, or is on a different page of the list.
            </p>
          </div>
        </Card>
      </>
    );
  }

  const onTabChange = (next: ServerDetailTab) => {
    navigate(next === 'cicd' ? `/servers/${server.id}/cicd` : `/servers/${server.id}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={server.name}
        subtitle={`// ${server.host}:${server.port}`}
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={14} aria-hidden />}
            onClick={() => navigate('/servers')}
          >
            Back to servers
          </Button>
        }
      />

      <ServerDetailTabs active={tab} onChange={onTabChange} />

      <div role="tabpanel">
        {tab === 'main' ? <ServerMainTab server={server} /> : <ServerCicdTab server={server} />}
      </div>
    </div>
  );
}
