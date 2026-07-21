import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, deleteTask } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog } from '@app/ui';
import { NavGlyph, type NavIconName } from '@app/layout/icons';
import { useTasks } from './useTasks';
import { useUsers } from './useUsers';
import { TaskFormDialog } from './TaskFormDialog';
import { StatusChip, PriorityChip } from './chips';
import { PencilIcon, TrashIcon } from './icons';
import { formatDateTime, formatDueAt, isOverdue } from './model';
import { ArrowLeftIcon } from '../projects/icons';
import { clientName } from '../clients/model';
import { ServicesManager, useServices } from '../services';
import { ClientsManager, useClients } from '../clients';
import { DealsManager, useDeals } from '../deals';
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

type SectionKey = 'services' | 'clients' | 'deals' | 'processes';
type TabKey = 'overview' | SectionKey;

type Section = {
  key: SectionKey;
  label: string;
  icon: NavIconName;
};

/**
 * Разделы связанных сущностей задачи — единый источник порядка для KPI-счётчиков и вкладок.
 * Порядок совпадает с боковой панелью (за вычетом самих задач): услуги → клиенты → сделки → процессы.
 */
const SECTIONS: Section[] = [
  { key: 'services', label: 'Услуги', icon: 'services' },
  { key: 'clients', label: 'Клиенты', icon: 'clients' },
  { key: 'deals', label: 'Сделки', icon: 'deals' },
  { key: 'processes', label: 'Процессы', icon: 'processes' },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Обзор' },
  ...SECTIONS.map((s) => ({ key: s.key, label: s.label })),
];

export function TaskDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { tasks, isLoading, error, reload } = useTasks();

  // Справочники: проекты и полные каталоги услуг/клиентов/сделок/процессов — для форм,
  // резолва имён и единичных связей задачи. Операторы — для исполнителя.
  const { projects } = useProjects();
  const { services, reload: reloadServices } = useServices();
  const { clients, reload: reloadClients } = useClients();
  const { deals, reload: reloadDeals } = useDeals();
  const { processes, reload: reloadProcesses } = useProcesses();
  const { users } = useUsers();

  const task = tasks.find((t) => t.id === id) ?? null;

  // Единичные связи задачи (все поля-ссылки) → резолвим в объекты из каталогов;
  // получаем список из 0 или 1 элемента для вкладок/счётчиков.
  const taskServices = useMemo(
    () => (task?.service_id ? services.filter((s) => s.id === task.service_id) : []),
    [task?.service_id, services],
  );
  const taskClients = useMemo(
    () => (task?.client_id ? clients.filter((c) => c.id === task.client_id) : []),
    [task?.client_id, clients],
  );
  const taskDeals = useMemo(
    () => (task?.deal_id ? deals.filter((d) => d.id === task.deal_id) : []),
    [task?.deal_id, deals],
  );
  const taskProcesses = useMemo(
    () => (task?.process_id ? processes.filter((p) => p.id === task.process_id) : []),
    [task?.process_id, processes],
  );

  const resolvers = useMemo(() => {
    const proj = new Map(projects.map((p) => [p.id, p.name]));
    const user = new Map(users.map((u) => [u.id, u.full_name || u.email]));
    return {
      projectName: (pid: string | null) => (pid ? (proj.get(pid) ?? '') : ''),
      userName: (uid: string | null) => (uid ? (user.get(uid) ?? '') : ''),
    };
  }, [projects, users]);

  const [tab, setTab] = useState<TabKey>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!task || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteTask(token, task.id);
      navigate('/tasks');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        navigate('/tasks');
        return;
      }
      setDeleteError('Не удалось удалить задачу. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const backLink = (
    <button
      type="button"
      onClick={() => navigate('/tasks')}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
    >
      <ArrowLeftIcon />
      Задачи
    </button>
  );

  // Загрузка (задача ещё не найдена в списке).
  if (isLoading && !task) {
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

  // Не найдена (загрузка завершена).
  if (!task) {
    return (
      <>
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
          <p className="text-sm text-fg-secondary">{error ?? 'Задача не найдена или была удалена.'}</p>
          <Button variant="secondary" onClick={() => navigate('/tasks')}>
            К списку задач
          </Button>
        </div>
      </>
    );
  }

  const hasAttributes = Object.keys(task.attributes).length > 0;
  const ownerProject = resolvers.projectName(task.project_id);
  const assignee = resolvers.userName(task.assigned_to);
  const overdue = isOverdue(task.due_at, task.status);
  const linkedClient = taskClients[0];
  const linkedService = taskServices[0];
  const linkedDeal = taskDeals[0];
  const linkedProcess = taskProcesses[0];
  const dueText = task.due_at ? formatDueAt(task.due_at) : '';
  const subtitle = [dueText, ownerProject].filter(Boolean).join(' · ') || 'Без срока';

  // Значения KPI-счётчиков по ключу раздела. Счётчик всегда показывает число: 0 (пока
  // пусто/грузится/ошибка) или реальное количество — без индикатора загрузки «…».
  const sectionCounts: Record<SectionKey, number> = {
    services: taskServices.length,
    clients: taskClients.length,
    deals: taskDeals.length,
    processes: taskProcesses.length,
  };

  return (
    <>
      {backLink}

      {/* Шапка задачи */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{task.title}</h1>
            <StatusChip status={task.status} />
            <PriorityChip priority={task.priority} />
          </div>
          <p
            className={`mt-1 min-w-0 truncate text-sm ${overdue ? 'font-medium text-state-error' : 'text-fg-secondary'}`}
          >
            {subtitle}
          </p>
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
              <h2 className="text-base font-semibold text-fg-primary">О задаче</h2>
              {task.description ? (
                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{task.description}</p>
              ) : null}
              <dl className="mt-4 border-t border-border-subtle pt-2">
                <MetaRow label="Срок">
                  {task.due_at ? (
                    <span className={overdue ? 'font-medium text-state-error' : undefined}>
                      {formatDueAt(task.due_at)}
                    </span>
                  ) : (
                    <span className="text-fg-muted">—</span>
                  )}
                </MetaRow>
                <MetaRow label="Исполнитель">
                  {assignee ? assignee : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Проект">
                  {ownerProject ? ownerProject : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Клиент">
                  {linkedClient ? clientName(linkedClient) : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Сделка">
                  {linkedDeal ? linkedDeal.title : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Услуга">
                  {linkedService ? linkedService.name : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Процесс">
                  {linkedProcess ? linkedProcess.name : <span className="text-fg-muted">—</span>}
                </MetaRow>
                <MetaRow label="Создана">{formatDateTime(task.created_at)}</MetaRow>
                <MetaRow label="Завершена">
                  {task.completed_at ? formatDateTime(task.completed_at) : <span className="text-fg-muted">—</span>}
                </MetaRow>
              </dl>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-fg-primary">Доп. атрибуты</h2>
              {hasAttributes ? (
                <dl className="mt-3">
                  {Object.entries(task.attributes).map(([key, value]) => (
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
            services={taskServices}
            isLoading={isLoading}
            error={error}
            reload={reloadServices}
            projects={projects}
            showProjectColumn
            onRowClick={(s) => navigate(`/services/${s.id}`)}
          />
        ) : tab === 'clients' ? (
          <ClientsManager
            clients={taskClients}
            isLoading={isLoading}
            error={error}
            reload={reloadClients}
            projects={projects}
            showProjectColumn
            onRowClick={(c) => navigate(`/clients/${c.id}`)}
          />
        ) : tab === 'deals' ? (
          <DealsManager
            deals={taskDeals}
            isLoading={isLoading}
            error={error}
            reload={reloadDeals}
            projects={projects}
            clients={clients}
            services={services}
            processes={processes}
            users={users}
            showProjectColumn
            onRowClick={(d) => navigate(`/deals/${d.id}`)}
          />
        ) : tab === 'processes' ? (
          <ProcessesManager
            processes={taskProcesses}
            isLoading={isLoading}
            error={error}
            reload={reloadProcesses}
            projects={projects}
            showProjectColumn
            onRowClick={(p) => navigate(`/processes/${p.id}`)}
          />
        ) : null}
      </div>

      <TaskFormDialog
        open={formOpen}
        task={task}
        projects={projects}
        clients={clients}
        deals={deals}
        users={users}
        services={services}
        processes={processes}
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
        title="Удалить задачу?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Задача <span className="font-medium text-fg-primary">{task.title}</span> будет удалена.
            Это действие мягкое — задача исчезнет из списков.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
