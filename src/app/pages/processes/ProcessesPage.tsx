import { PageHeader } from '../PageHeader';
import { ProcessesManager } from './ProcessesManager';
import { useProcesses } from './useProcesses';

export function ProcessesPage() {
  const { processes, isLoading, error, reload } = useProcesses();

  return (
    <>
      <PageHeader title="Процессы" subtitle="Бизнес-процессы компании" />

      <ProcessesManager
        processes={processes}
        isLoading={isLoading}
        error={error}
        reload={reload}
      />
    </>
  );
}
