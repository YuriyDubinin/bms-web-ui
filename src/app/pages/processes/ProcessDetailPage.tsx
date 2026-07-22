import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, deleteProcess } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog } from '@app/ui';
import { NavGlyph, type NavIconName } from '@app/layout/icons';
import { useProcesses } from './useProcesses';
import { ProcessFormDialog } from './ProcessFormDialog';
import { ProcessStagesBoard, CURRENT_STAGE_ATTR } from './ProcessStagesBoard';
import { StatusChip } from './StatusChip';
import { PencilIcon, TrashIcon } from './icons';
import { formatDateTime, formatPeriod } from './model';
import { ArrowLeftIcon } from '../projects/icons';
import { ServicesManager, useServices } from '../services';
import { ClientsManager, useClients } from '../clients';
import { DealsManager, useDeals } from '../deals';
import { TasksManager, useTasks, useUsers } from '../tasks';
import { useProjects } from '../projects/useProjects';

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={[
        'min-w-0 rounded-lg border border-border-subtle bg-bg-1 p-5 shadow-sm transition-colors duration-300',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2.5 last:border-0">
      <dt className="shrink-0 text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-fg-primary">{children}</dd>
    </div>
  );
}

type SectionKey = 'services' | 'clients' | 'deals' | 'tasks';
type TabKey = 'overview' | SectionKey;

type Section = {
  key: SectionKey;
  label: string;
  icon: NavIconName;
};

/**
 * Разделы связанных сущностей процесса — единый источник порядка для KPI-счётчиков и вкладок.
 * Порядок совпадает с боковой панелью (за вычетом самих процессов): услуги → клиенты → сделки → задачи.
 */
const SECTIONS: Section[] = [
  { key: 'services', label: 'Услуги', icon: 'services' },
  { key: 'clients', label: 'Клиенты', icon: 'clients' },
  { key: 'deals', label: 'Сделки', icon: 'deals' },
  { key: 'tasks', label: 'Задачи', icon: 'tasks' },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Обзор' },
  ...SECTIONS.map((s) => ({ key: s.key, label: s.label })),
];

export function ProcessDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { processes, isLoading, error, reload } = useProcesses();

  // Прямые связи по process_id: сделки и задачи этого процесса.
  const {
    deals,
    isLoading: dealsLoading,
    error: dealsError,
    reload: reloadDeals,
  } = useDeals({ processId: id });
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
  } = useTasks({ processId: id });

  // Справочники: проекты (владелец + формы), полные каталоги услуг/клиентов (для форм и
  // резолва косвенных связей), операторы (исполнители/ответственные).
  const { projects } = useProjects();
  const { services, error: servicesError, reload: reloadServices } = useServices();
  const { clients, error: clientsError, reload: reloadClients } = useClients();
  const { users } = useUsers();

  const process = processes.find((p) => p.id === id) ?? null;

  // Косвенные связи: услуги и клиенты, фигурирующие в сделках/задачах процесса
  // (прямого фильтра process_id у них нет) — собираем по их service_id / client_id.
  const processServices = useMemo(() => {
    const ids = new Set<string>();
    for (const d of deals) if (d.service_id) ids.add(d.service_id);
    for (const t of tasks) if (t.service_id) ids.add(t.service_id);
    return services.filter((s) => ids.has(s.id));
  }, [deals, tasks, services]);

  const processClients = useMemo(() => {
    const ids = new Set<string>();
    for (const d of deals) if (d.client_id) ids.add(d.client_id);
    for (const t of tasks) if (t.client_id) ids.add(t.client_id);
    return clients.filter((c) => ids.has(c.id));
  }, [deals, tasks, clients]);

  const projectName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return (pid: string | null) => (pid ? (map.get(pid) ?? '') : '');
  }, [projects]);

  const [tab, setTab] = useState<TabKey>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!process || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProcess(token, process.id);
      navigate('/processes');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        navigate('/processes');
        return;
      }
      setDeleteError('Не удалось удалить процесс. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const backLink = (
    <button
      type="button"
      onClick={() => navigate('/processes')}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
    >
      <ArrowLeftIcon />
      Процессы
    </button>
  );

  // Загрузка (процесс ещё не найден в списке).
  if (isLoading && !process) {
    return (
      <>
        {backLink}
        <div className="rounded-lg border border-border-subtle bg-bg-1 p-5 shadow-sm">
          <div className="h-6 w-1/3 animate-pulse rounded bg-bg-2" />
          <div className="mt-3 h-4 w-1/4 animate-pulse rounded bg-bg-2" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTIONS.map((s) => (
            <div key={s.key} className="h-20 animate-pulse rounded-lg bg-bg-1" />
          ))}
        </div>
      </>
    );
  }

  // Не найден (загрузка завершена).
  if (!process) {
    return (
      <>
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
          <p className="text-sm text-fg-secondary">{error ?? 'Процесс не найден или был удалён.'}</p>
          <Button variant="secondary" onClick={() => navigate('/processes')}>
            К списку процессов
          </Button>
        </div>
      </>
    );
  }

  // Служебный ключ текущего этапа не показываем как пользовательский атрибут — им управляет
  // конструктор этапов.
  const visibleAttributes = Object.entries(process.attributes).filter(
    ([key]) => key !== CURRENT_STAGE_ATTR,
  );
  const hasAttributes = visibleAttributes.length > 0;
  const ownerProject = projectName(process.project_id);
  const period = formatPeriod(process.starts_at, process.ends_at);
  const subtitle = [ownerProject, period !== '—' ? period : ''].filter(Boolean).join(' · ') || 'Процесс';

  // Значения KPI-счётчиков по ключу раздела. Счётчик всегда показывает число: 0 (пока
  // пусто/грузится/ошибка) или реальное количество — без индикатора загрузки «…».
  const sectionCounts: Record<SectionKey, number> = {
    services: processServices.length,
    clients: processClients.length,
    deals: deals.length,
    tasks: tasks.length,
  };

  return (
    <>
      {backLink}

      {/* Шапка процесса */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{process.name}</h1>
            <StatusChip status={process.status} />
          </div>
          <p className="mt-1 min-w-0 truncate text-sm text-fg-secondary">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<PencilIcon />} onClick={() => setFormOpen(true)}>
            Редактировать
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<TrashIcon />} onClick={() => setDeleteOpen(true)}>
            Удалить
          </Button>
        </div>
      </div>

      {/* Конструктор этапов процесса (до счётчиков): пайплайн этапов + задачи на каждом этапе */}
      <ProcessStagesBoard
        process={process}
        tasks={tasks}
        projects={projects}
        clients={clients}
        deals={deals}
        users={users}
        services={services}
        processes={processes}
        reloadTasks={reloadTasks}
        onOpenTask={(t) => navigate(`/tasks/${t.id}`)}
      />

      {/* KPI-счётчики разделов (клик — переход на вкладку) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className="rounded-lg border border-border-subtle bg-bg-1 p-4 text-left shadow-sm transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="flex items-center gap-2 text-fg-muted">
              <NavGlyph name={s.icon} size={16} />
              <span className="text-xs">{s.label}</span>
            </span>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-fg-primary">
              {sectionCounts[s.key]}
            </p>
          </button>
        ))}
      </div>

      {/* Вкладки */}
      <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-border-subtle">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t',
                active
                  ? 'border-accent text-fg-primary'
                  : 'border-transparent text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Контент вкладки */}
      <div className="mt-5">
        {tab === 'overview' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-base font-semibold text-fg-primary">О процессе</h2>
              {process.description ? (
                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{process.description}</p>
              ) : null}
              <dl className="mt-4 border-t border-border-subtle pt-2">
                <MetaRow label="Проект">
                  {ownerProject ? ownerProject : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Период">{period}</MetaRow>
                <MetaRow label="Создан">{formatDateTime(process.created_at)}</MetaRow>
                <MetaRow label="Обновлён">{formatDateTime(process.updated_at)}</MetaRow>
                <MetaRow label="Завершён">{formatDateTime(process.closed_at)}</MetaRow>
              </dl>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-fg-primary">Доп. атрибуты</h2>
              {hasAttributes ? (
                <dl className="mt-3">
                  {visibleAttributes.map(([key, value]) => (
                    <MetaRow key={key} label={key}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </MetaRow>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-fg-muted">Дополнительные атрибуты не заданы.</p>
              )}
            </Card>
          </div>
        ) : tab === 'services' ? (
          <ServicesManager
            services={processServices}
            isLoading={dealsLoading || tasksLoading}
            error={servicesError ?? dealsError ?? tasksError}
            reload={reloadServices}
            projects={projects}
            showProjectColumn
            onRowClick={(s) => navigate(`/services/${s.id}`)}
          />
        ) : tab === 'clients' ? (
          <ClientsManager
            clients={processClients}
            isLoading={dealsLoading || tasksLoading}
            error={clientsError ?? dealsError ?? tasksError}
            reload={reloadClients}
            projects={projects}
            showProjectColumn
            onRowClick={(c) => navigate(`/clients/${c.id}`)}
          />
        ) : tab === 'deals' ? (
          <DealsManager
            deals={deals}
            isLoading={dealsLoading}
            error={dealsError}
            reload={reloadDeals}
            projects={projects}
            clients={clients}
            services={services}
            processes={processes}
            users={users}
            defaultProcessId={process.id}
            showProjectColumn
            onRowClick={(d) => navigate(`/deals/${d.id}`)}
          />
        ) : tab === 'tasks' ? (
          <TasksManager
            tasks={tasks}
            isLoading={tasksLoading}
            error={tasksError}
            reload={reloadTasks}
            projects={projects}
            clients={clients}
            deals={deals}
            users={users}
            services={services}
            processes={processes}
            defaultProcessId={process.id}
            showProjectColumn
            onRowClick={(t) => navigate(`/tasks/${t.id}`)}
          />
        ) : null}
      </div>

      <ProcessFormDialog
        open={formOpen}
        process={process}
        projects={projects}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (deleteLoading ? undefined : setDeleteOpen(false))}
        onConfirm={confirmDelete}
        title="Удалить процесс?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Процесс <span className="font-medium text-fg-primary">{process.name}</span> будет удалён.
            Это действие мягкое — процесс и его этапы исчезнут из списков.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
