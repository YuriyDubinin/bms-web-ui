import { PageHeader } from '../PageHeader';
import { ClientsManager } from './ClientsManager';
import { useClients } from './useClients';
import { useProjects } from '../projects/useProjects';

export function ClientsPage() {
  const { clients, isLoading, error, reload } = useClients();
  // Проекты нужны для выбора «домашнего» проекта в форме и показа его имени в таблице.
  const { projects } = useProjects();

  return (
    <>
      <PageHeader title="Клиенты" subtitle="База клиентов компании" />

      <ClientsManager
        clients={clients}
        isLoading={isLoading}
        error={error}
        reload={reload}
        projects={projects}
      />
    </>
  );
}
