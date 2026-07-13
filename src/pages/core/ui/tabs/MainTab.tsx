import { FadeIn } from '@shared/ui';
import { useSystemQuery } from '@entities/system';
import { useContainersQuery } from '@entities/containers';
import { useServicesQuery } from '@entities/services';
import {
  ContainersPanel,
  CpuPanel,
  DisksPanel,
  ErrorsBanner,
  KpiGauges,
  MemoryPanel,
  NetworkPanel,
  ServicesPanel,
  SystemSnapshotSkeleton,
} from '@widgets/system-snapshot';
import { CoreError } from '../sections/CoreError';
import { DatabasePanel } from '../sections/DatabasePanel';
import { ProcessPanel } from '../sections/ProcessPanel';
import { SummaryStrip } from '../sections/SummaryStrip';

const POLL_INTERVAL_MS = 3000;

/**
 * Вкладка Main: дашборд состояния ЛОКАЛЬНОЙ машины (на которой работает API).
 * Тяжёлые панели (CPU/Memory/Disks/Network/KPI/Errors) живут в widget-слое и
 * переиспользуются страницей удалённого сервера.
 */
export function MainTab() {
  const { data, error, isLoading, isFetching, refetch } = useSystemQuery();
  const containersQ = useContainersQuery();
  const servicesQ = useServicesQuery();

  if (!data && isLoading) {
    return <SystemSnapshotSkeleton />;
  }
  if (!data) {
    return <CoreError error={error} onRetry={() => refetch()} />;
  }

  const sampledAt = data.collected_at;

  return (
    <FadeIn distance={4}>
      <div className="space-y-4">
        <SummaryStrip data={data} fetching={isFetching} pollIntervalMs={POLL_INTERVAL_MS} />

        <KpiGauges
          cpu={data.cpu}
          memory={data.memory}
          disks={data.disks}
          dbPool={data.database.pool}
          sampledAt={sampledAt}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <CpuPanel cpu={data.cpu} sampledAt={sampledAt} />
          <MemoryPanel memory={data.memory} sampledAt={sampledAt} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <DisksPanel disks={data.disks} sampledAt={sampledAt} />
          <NetworkPanel network={data.network} sampledAt={sampledAt} />
        </div>

        <ContainersPanel
          data={containersQ.data}
          isLoading={containersQ.isLoading}
          error={containersQ.error}
        />

        <ServicesPanel
          data={servicesQ.data}
          isLoading={servicesQ.isLoading}
          error={servicesQ.error}
        />

        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <DatabasePanel database={data.database} />
          <ProcessPanel process={data.process} />
        </div>

        {data.errors?.length ? <ErrorsBanner errors={data.errors} /> : null}
      </div>
    </FadeIn>
  );
}
