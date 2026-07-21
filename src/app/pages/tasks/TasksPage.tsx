import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../PageHeader';
import { TasksManager } from './TasksManager';
import { useTasks } from './useTasks';
import { useUsers } from './useUsers';
import { useProjects } from '../projects/useProjects';
import { useClients } from '../clients/useClients';
import { useDeals } from '../deals/useDeals';
import { useServices } from '../services/useServices';
import { useProcesses } from '../processes/useProcesses';

export function TasksPage() {
  const navigate = useNavigate();
  const { tasks, isLoading, error, reload } = useTasks();
  // Справочники для селектов формы и резолва имён в таблице.
  const { projects } = useProjects();
  const { clients } = useClients();
  const { deals } = useDeals();
  const { users } = useUsers();
  const { services } = useServices();
  const { processes } = useProcesses();

  return (
    <>
      <PageHeader title="Задачи" subtitle="Задачи и поручения команды" />

      <TasksManager
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        reload={reload}
        projects={projects}
        clients={clients}
        deals={deals}
        users={users}
        services={services}
        processes={processes}
        onRowClick={(t) => navigate(`/tasks/${t.id}`)}
      />
    </>
  );
}
