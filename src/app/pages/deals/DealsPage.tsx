import { PageHeader } from '../PageHeader';
import { DealsManager } from './DealsManager';
import { useDeals } from './useDeals';
import { useProjects } from '../projects/useProjects';
import { useClients } from '../clients/useClients';
import { useServices } from '../services/useServices';
import { useUsers } from '../tasks/useUsers';
import { useProcesses } from '../processes/useProcesses';

export function DealsPage() {
  const { deals, isLoading, error, reload } = useDeals();
  // Справочники для селектов формы и резолва имён в таблице.
  const { projects } = useProjects();
  const { clients } = useClients();
  const { services } = useServices();
  const { users } = useUsers();
  const { processes } = useProcesses();

  return (
    <>
      <PageHeader title="Сделки" subtitle="Воронка продаж компании" />

      <DealsManager
        deals={deals}
        isLoading={isLoading}
        error={error}
        reload={reload}
        projects={projects}
        clients={clients}
        services={services}
        processes={processes}
        users={users}
      />
    </>
  );
}
