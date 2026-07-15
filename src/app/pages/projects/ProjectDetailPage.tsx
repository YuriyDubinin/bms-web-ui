import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, deleteProject } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog } from '@app/ui';
import { NavGlyph, type NavIconName } from '@app/layout/icons';
import { useProjects } from './useProjects';
import { ProjectFormDialog } from './ProjectFormDialog';
import { StatusChip } from './StatusChip';
import { ArrowLeftIcon, PencilIcon, PlusIcon, TrashIcon } from './icons';
import { formatDateTime, formatPeriod } from './model';
import { ServicesManager, useServices } from '../services';

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={[
        // min-w-0: в grid-раскладке трек иначе тянется по max-content (truncate-значения
        // MetaRow с white-space:nowrap), и карточка вылазит за вьюпорт на мобиле.
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

type SectionKey = 'clients' | 'services' | 'tasks' | 'deals';
type TabKey = 'overview' | SectionKey;

type Section = {
  key: SectionKey;
  label: string;
  icon: NavIconName;
  add: string;
  columns: string[];
  hint: string;
};

const SECTIONS: Section[] = [
  {
    key: 'clients',
    label: 'Клиенты',
    icon: 'clients',
    add: 'Добавить клиента',
    columns: ['Клиент', 'Контакты', 'Статус', 'Источник'],
    hint: 'Здесь появятся клиенты, привязанные к этому проекту: контакты, компании и статусы взаимодействия.',
  },
  {
    key: 'services',
    label: 'Услуги',
    icon: 'services',
    add: 'Добавить услугу',
    columns: ['Услуга', 'Категория', 'Цена', 'Длительность'],
    hint: 'Здесь появятся услуги проекта: наименования, категории, цены и длительность.',
  },
  {
    key: 'tasks',
    label: 'Задачи',
    icon: 'tasks',
    add: 'Добавить задачу',
    columns: ['Задача', 'Статус', 'Приоритет', 'Срок'],
    hint: 'Здесь появятся задачи, прикреплённые к проекту: статусы, приоритеты, исполнители и сроки.',
  },
  {
    key: 'deals',
    label: 'Сделки',
    icon: 'deals',
    add: 'Добавить сделку',
    columns: ['Сделка', 'Этап', 'Сумма', 'Ответственный'],
    hint: 'Здесь появятся сделки проекта и воронка продаж: этапы, суммы и вероятность закрытия.',
  },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Обзор' },
  ...SECTIONS.map((s) => ({ key: s.key, label: s.label })),
];

/** Превью раздела сущности: тулбар + «будущая» таблица (заголовки колонок) и заглушка тела. */
function SectionPreview({ section }: { section: Section }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg-primary">{section.label} проекта</h2>
        <Button variant="secondary" size="sm" leftIcon={<PlusIcon />} disabled title="Функционал в разработке">
          {section.add}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-subtle">
        {/* Заголовки будущих колонок — показывают структуру раздела. */}
        <div className="hidden border-b border-border-subtle bg-bg-2/60 sm:flex">
          {section.columns.map((col) => (
            <span
              key={col}
              className="flex-1 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted"
            >
              {col}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <NavGlyph name={section.icon} size={24} />
          </span>
          <h3 className="text-base font-semibold text-fg-primary">{section.label} проекта</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-secondary">{section.hint}</p>
          <span className="mt-4 inline-flex items-center rounded-full bg-bg-2 px-2.5 py-0.5 font-mono text-[11px] text-fg-muted">
            Функционал в разработке
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { projects, isLoading, error, reload } = useProjects();
  // Услуги этого проекта — для счётчика в KPI и для вкладки «Услуги».
  const {
    services,
    isLoading: servicesLoading,
    error: servicesError,
    reload: reloadServices,
  } = useServices({ projectId: id });

  const project = projects.find((p) => p.id === id) ?? null;

  const [tab, setTab] = useState<TabKey>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!project || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProject(token, project.id);
      navigate('/projects');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        navigate('/projects');
        return;
      }
      setDeleteError('Не удалось удалить проект. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const backLink = (
    <button
      type="button"
      onClick={() => navigate('/projects')}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
    >
      <ArrowLeftIcon />
      Проекты
    </button>
  );

  // Загрузка (проект ещё не найден в списке).
  if (isLoading && !project) {
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
  if (!project) {
    return (
      <>
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
          <p className="text-sm text-fg-secondary">
            {error ?? 'Проект не найден или был удалён.'}
          </p>
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            К списку проектов
          </Button>
        </div>
      </>
    );
  }

  const hasAttributes = Object.keys(project.attributes).length > 0;

  return (
    <>
      {backLink}

      {/* Шапка проекта */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h1>
            <StatusChip status={project.status} />
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {project.direction || 'Без направления'}
            {project.slug ? <span className="font-mono text-fg-muted"> · {project.slug}</span> : null}
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

      {/* KPI-счётчики разделов (пока заглушки, клик — переход на вкладку) */}
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
              {s.key === 'services' ? (servicesLoading ? '…' : services.length) : '—'}
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
              <h2 className="text-base font-semibold text-fg-primary">О проекте</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                {project.description || 'Описание не заполнено.'}
              </p>
              <dl className="mt-4 border-t border-border-subtle pt-2">
                <MetaRow label="Направление">{project.direction || '—'}</MetaRow>
                <MetaRow label="Slug">
                  {project.slug ? <span className="font-mono">{project.slug}</span> : '—'}
                </MetaRow>
                <MetaRow label="Период">{formatPeriod(project.starts_at, project.ends_at)}</MetaRow>
                <MetaRow label="Создан">{formatDateTime(project.created_at)}</MetaRow>
                <MetaRow label="Обновлён">{formatDateTime(project.updated_at)}</MetaRow>
              </dl>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-fg-primary">Доп. атрибуты</h2>
              {hasAttributes ? (
                <dl className="mt-3">
                  {Object.entries(project.attributes).map(([key, value]) => (
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
            services={services}
            isLoading={servicesLoading}
            error={servicesError}
            reload={reloadServices}
            projects={projects}
            defaultProjectId={project.id}
            showProjectColumn={false}
          />
        ) : (
          <SectionPreview section={SECTIONS.find((s) => s.key === tab) as Section} />
        )}
      </div>

      <ProjectFormDialog
        open={formOpen}
        project={project}
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
        title="Удалить проект?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Проект <span className="font-medium text-fg-primary">{project.name}</span> будет удалён.
            Прикреплённые услуги, клиенты и задачи не удаляются, но останутся без проекта.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
