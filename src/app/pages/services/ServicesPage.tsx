import { PageHeader } from '../PageHeader';
import { ServicesManager } from './ServicesManager';
import { useServices } from './useServices';
import { useProjects } from '../projects/useProjects';

export function ServicesPage() {
  const { services, isLoading, error, reload } = useServices();
  // Проекты нужны для выбора «домашнего» проекта в форме и показа его имени в таблице.
  const { projects } = useProjects();

  return (
    <>
      <PageHeader title="Услуги" subtitle="Каталог услуг компании" />

      <ServicesManager
        services={services}
        isLoading={isLoading}
        error={error}
        reload={reload}
        projects={projects}
      />
    </>
  );
}
