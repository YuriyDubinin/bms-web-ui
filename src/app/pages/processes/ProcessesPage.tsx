import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../PageHeader';
import { ProcessesManager } from './ProcessesManager';
import { useProcesses } from './useProcesses';
import { useProjects } from '../projects/useProjects';

export function ProcessesPage() {
  const navigate = useNavigate();
  const { processes, isLoading, error, reload } = useProcesses();
  // Проекты нужны для выбора проекта в форме и показа его имени в таблице.
  const { projects } = useProjects();

  return (
    <>
      <PageHeader title="Процессы" subtitle="Бизнес-процессы компании" />

      <ProcessesManager
        processes={processes}
        isLoading={isLoading}
        error={error}
        reload={reload}
        projects={projects}
        onRowClick={(p) => navigate(`/processes/${p.id}`)}
      />
    </>
  );
}
