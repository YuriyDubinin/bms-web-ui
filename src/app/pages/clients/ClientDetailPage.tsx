import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, deleteClient } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog } from '@app/ui';
import { NavGlyph, type NavIconName } from '@app/layout/icons';
import { useClients } from './useClients';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientProjectsField } from './ClientProjectsField';
import { StatusChip, SubjectTypeChip } from './StatusChip';
import { PencilIcon, TrashIcon } from './icons';
import {
  CLIENT_SUBJECT_TYPE_LABELS,
  clientName,
  clientSubjectType,
  clientSubtitle,
  formatAddress,
  formatDateTime,
} from './model';
import { ArrowLeftIcon } from '../projects/icons';
import { ServicesManager, useServices } from '../services';
import { DealsManager, useDeals } from '../deals';
import { TasksManager, useTasks, useUsers } from '../tasks';
import { ProcessesManager, useProcesses } from '../processes';
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

type SectionKey = 'services' | 'deals' | 'tasks' | 'processes';
type TabKey = 'overview' | SectionKey;

type Section = {
  key: SectionKey;
  label: string;
  icon: NavIconName;
};

/**
 * Разделы связанных сущностей клиента — единый источник порядка для KPI-счётчиков и вкладок.
 * Порядок совпадает с боковой панелью (за вычетом самих клиентов): услуги → сделки → задачи → процессы.
 */
const SECTIONS: Section[] = [
  { key: 'services', label: 'Услуги', icon: 'services' },
  { key: 'deals', label: 'Сделки', icon: 'deals' },
  { key: 'tasks', label: 'Задачи', icon: 'tasks' },
  { key: 'processes', label: 'Процессы', icon: 'processes' },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Обзор' },
  ...SECTIONS.map((s) => ({ key: s.key, label: s.label })),
];

export function ClientDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { clients, isLoading, error, reload } = useClients();

  // Прямые связи по client_id: сделки и задачи этого клиента.
  const {
    deals,
    isLoading: dealsLoading,
    error: dealsError,
    reload: reloadDeals,
  } = useDeals({ clientId: id });
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
  } = useTasks({ clientId: id });

  // Справочники: проекты (M:N-блок + формы), полные каталоги услуг/процессов (для форм и
  // резолва косвенных связей), операторы (исполнители/ответственные).
  const { projects } = useProjects();
  const { services, error: servicesError, reload: reloadServices } = useServices();
  const { processes, error: processesError, reload: reloadProcesses } = useProcesses();
  const { users } = useUsers();

  const client = clients.find((c) => c.id === id) ?? null;

  // Косвенные связи: услуги, оказанные клиенту, и процессы, где он фигурировал —
  // собираем по сделкам и задачам клиента (прямого фильтра client_id у них нет).
  const clientServices = useMemo(() => {
    const ids = new Set<string>();
    for (const d of deals) if (d.service_id) ids.add(d.service_id);
    for (const t of tasks) if (t.service_id) ids.add(t.service_id);
    return services.filter((s) => ids.has(s.id));
  }, [deals, tasks, services]);

  const clientProcesses = useMemo(() => {
    const ids = new Set<string>();
    for (const d of deals) if (d.process_id) ids.add(d.process_id);
    for (const t of tasks) if (t.process_id) ids.add(t.process_id);
    return processes.filter((p) => ids.has(p.id));
  }, [deals, tasks, processes]);

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
    if (!client || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteClient(token, client.id);
      navigate('/clients');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        navigate('/clients');
        return;
      }
      setDeleteError('Не удалось удалить клиента. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const backLink = (
    <button
      type="button"
      onClick={() => navigate('/clients')}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
    >
      <ArrowLeftIcon />
      Клиенты
    </button>
  );

  // Загрузка (клиент ещё не найден в списке).
  if (isLoading && !client) {
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
  if (!client) {
    return (
      <>
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
          <p className="text-sm text-fg-secondary">{error ?? 'Клиент не найден или был удалён.'}</p>
          <Button variant="secondary" onClick={() => navigate('/clients')}>
            К базе клиентов
          </Button>
        </div>
      </>
    );
  }

  const hasAttributes = Object.keys(client.attributes).length > 0;
  const address = formatAddress(client.address);
  const subtitle =
    [clientSubtitle(client), client.email, client.phone].filter(Boolean).join(' · ') || 'Без контактов';
  const ownerProject = projectName(client.project_id);

  // Значения KPI-счётчиков по ключу раздела. Счётчик всегда показывает число: 0 (пока
  // пусто/грузится/ошибка) или реальное количество — без индикатора загрузки «…».
  const sectionCounts: Record<SectionKey, number> = {
    services: clientServices.length,
    deals: deals.length,
    tasks: tasks.length,
    processes: clientProcesses.length,
  };

  return (
    <>
      {backLink}

      {/* Шапка клиента */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{clientName(client)}</h1>
            <StatusChip status={client.status} />
            <SubjectTypeChip client={client} />
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
              <h2 className="text-base font-semibold text-fg-primary">О клиенте</h2>
              <dl className="mt-3">
                <MetaRow label="Вид субъекта">
                  {CLIENT_SUBJECT_TYPE_LABELS[clientSubjectType(client)]}
                </MetaRow>
                <MetaRow label="Email">
                  {client.email ? client.email : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Телефон">
                  {client.phone ? client.phone : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Источник">
                  {client.source ? client.source : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Основной проект">
                  {ownerProject ? ownerProject : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Адрес">
                  {address ? address : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Создан">{formatDateTime(client.created_at)}</MetaRow>
                <MetaRow label="Обновлён">{formatDateTime(client.updated_at)}</MetaRow>
              </dl>
            </Card>

            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <h2 className="text-base font-semibold text-fg-primary">Проекты</h2>
                <div className="mt-3">
                  <ClientProjectsField
                    clientId={client.id}
                    mainProjectId={client.project_id ?? ''}
                    allProjects={projects}
                  />
                </div>
              </Card>

              <Card>
                <h2 className="text-base font-semibold text-fg-primary">Доп. атрибуты</h2>
                {hasAttributes ? (
                  <dl className="mt-3">
                    {Object.entries(client.attributes).map(([key, value]) => (
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
          </div>
        ) : tab === 'services' ? (
          <ServicesManager
            services={clientServices}
            isLoading={dealsLoading || tasksLoading}
            error={servicesError ?? dealsError ?? tasksError}
            reload={reloadServices}
            projects={projects}
            showProjectColumn
            onRowClick={(s) => navigate(`/services/${s.id}`)}
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
            defaultClientId={client.id}
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
            defaultClientId={client.id}
            showProjectColumn
            onRowClick={(t) => navigate(`/tasks/${t.id}`)}
          />
        ) : tab === 'processes' ? (
          <ProcessesManager
            processes={clientProcesses}
            isLoading={dealsLoading || tasksLoading}
            error={processesError ?? dealsError ?? tasksError}
            reload={reloadProcesses}
            projects={projects}
            showProjectColumn
            onRowClick={(p) => navigate(`/processes/${p.id}`)}
          />
        ) : null}
      </div>

      <ClientFormDialog
        open={formOpen}
        client={client}
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
        title="Удалить клиента?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Клиент <span className="font-medium text-fg-primary">{clientName(client)}</span> будет
            удалён. Это действие мягкое — клиент исчезнет из списков.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
