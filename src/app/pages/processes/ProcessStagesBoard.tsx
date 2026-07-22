import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ApiError,
  createProcessStage,
  deleteProcessStage,
  listProcessStages,
  updateProcess,
  updateProcessStage,
  type Client,
  type Deal,
  type Process,
  type ProcessInput,
  type ProcessStage,
  type Project,
  type Service,
  type Task,
  type UpdateProcessStageInput,
  type User,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog } from '@app/ui';
import { PencilIcon, PlusIcon, TrashIcon } from './icons';
import { TaskFormDialog } from '../tasks/TaskFormDialog';
import { PriorityChip, StatusChip } from '../tasks/chips';
import { formatDueAt, isOverdue } from '../tasks/model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

/**
 * Ключ в attributes процесса, где хранится «текущий этап» (где процесс находится сейчас).
 * Отдельного поля бэкенда для этого нет, а attributes — персистентное и общее для всех
 * пользователей место. Скрывается из карточки «Доп. атрибуты» на странице процесса.
 */
export const CURRENT_STAGE_ATTR = 'current_stage_id';

/** Псевдо-идентификатор сегмента «Без этапа» (задачи процесса без привязки к этапу). */
const UNASSIGNED = '__unassigned__';

/* ---------------------------------- Иконки --------------------------------- */

function Glyph({
  size = 16,
  className,
  children,
}: {
  size?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cx('shrink-0', className)}
    >
      {children}
    </svg>
  );
}

function ChevronRightIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <path d="m9 18 6-6-6-6" />
    </Glyph>
  );
}

function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Glyph>
  );
}

function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Glyph>
  );
}

function FlagIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </Glyph>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Glyph>
  );
}

/* --------------------------------- Хелперы --------------------------------- */

/**
 * Тело PUT-процесса из текущего процесса с подменой attributes. Зеркалит ProcessFormDialog,
 * чтобы полная замена (PUT) не затёрла остальные поля процесса.
 */
function processToInput(p: Process, attributes: Record<string, unknown>): ProcessInput {
  return {
    name: p.name,
    description: p.description,
    status: p.status,
    starts_at: p.starts_at,
    ends_at: p.ends_at,
    attributes,
    ...(p.project_id ? { project_id: p.project_id } : {}),
  };
}

/** Тело update этапа: берём текущее состояние этапа и накладываем изменения (PUT = полная замена). */
function stageUpdatePayload(
  stage: ProcessStage,
  override: Partial<Pick<ProcessStage, 'name' | 'description' | 'position' | 'attributes'>>,
): UpdateProcessStageInput {
  const description = override.description ?? stage.description;
  const attributes = override.attributes ?? stage.attributes;
  return {
    id: stage.id,
    name: override.name ?? stage.name,
    position: override.position ?? stage.position,
    ...(description ? { description } : {}),
    ...(attributes && Object.keys(attributes).length > 0 ? { attributes } : {}),
  };
}

/* ------------------------------ Мелкие блоки UI ---------------------------- */

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-border-subtle hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const overdue = isOverdue(task.due_at, task.status);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg-primary">
          {task.title}
        </span>
        {task.due_at ? (
          <span
            className={cx(
              'shrink-0 font-mono text-xs',
              overdue ? 'font-medium text-state-error' : 'text-fg-muted',
            )}
          >
            {formatDueAt(task.due_at)}
          </span>
        ) : null}
        <span className="hidden shrink-0 sm:inline-flex">
          <PriorityChip priority={task.priority} />
        </span>
        <StatusChip status={task.status} />
      </button>
    </li>
  );
}

/* -------------------------------- Компонент -------------------------------- */

export type ProcessStagesBoardProps = {
  process: Process;
  /** Все задачи процесса (загружены родителем) — группируем по этапам в памяти. */
  tasks: Task[];
  /** Справочники для формы создания задачи на этапе. */
  projects: Project[];
  clients: Client[];
  deals: Deal[];
  users: User[];
  services: Service[];
  processes: Process[];
  /** Перезагрузить задачи процесса после добавления/переноса. */
  reloadTasks: () => void;
  /** Открыть карточку задачи. */
  onOpenTask: (task: Task) => void;
};

/**
 * Конструктор этапов процесса: пайплайн этапов над счётчиками страницы процесса.
 * Позволяет создавать/переименовывать/удалять этапы и менять их порядок, привязывать к
 * этапам задачи и «передвигать» процесс по этапам (текущий этап — в attributes процесса).
 */
export function ProcessStagesBoard({
  process,
  tasks,
  projects,
  clients,
  deals,
  users,
  services,
  processes,
  reloadTasks,
  onOpenTask,
}: ProcessStagesBoardProps) {
  const { token, logout } = useAuth();

  const [stages, setStages] = useState<ProcessStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stagesReloadKey, setStagesReloadKey] = useState(0);
  const reloadStages = () => setStagesReloadKey((k) => k + 1);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [currentStageId, setCurrentStageId] = useState<string>(() => {
    const raw = process.attributes[CURRENT_STAGE_ATTR];
    return typeof raw === 'string' ? raw : '';
  });

  // Общая строка ошибки действий над этапами (создание/переименование/порядок/перенос).
  const [actionError, setActionError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [creating, setCreating] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  const [reordering, setReordering] = useState(false);
  const [movingProcess, setMovingProcess] = useState(false);

  const [deletingStage, setDeletingStage] = useState<ProcessStage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Этап, для которого открыта форма создания задачи (задача привяжется к процессу и этапу).
  const [addTaskFor, setAddTaskFor] = useState<ProcessStage | null>(null);

  // Загрузка этапов процесса (по позиции).
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setStagesLoading(true);
    setStagesError(null);
    listProcessStages(token, process.id, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setStages([...items].sort((a, b) => a.position - b.position));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setStagesError('Не удалось загрузить этапы процесса. Попробуйте ещё раз.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setStagesLoading(false);
      });
    return () => controller.abort();
  }, [token, process.id, stagesReloadKey, logout]);

  // Группировка задач процесса по этапам — в памяти, без доп. запросов.
  const tasksByStage = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const sid = t.process_stage_id;
      if (!sid) continue;
      const arr = map.get(sid);
      if (arr) arr.push(t);
      else map.set(sid, [t]);
    }
    return map;
  }, [tasks]);

  const stageIds = useMemo(() => new Set(stages.map((s) => s.id)), [stages]);

  // «Без этапа»: задачи процесса без привязки к этапу или с этапом, которого уже нет.
  const unassignedTasks = useMemo(
    () => tasks.filter((t) => !t.process_stage_id || !stageIds.has(t.process_stage_id)),
    [tasks, stageIds],
  );

  // Дефолтный выбор сегмента: сохраняем валидный выбор, иначе — текущий этап / первый / «без этапа».
  useEffect(() => {
    setSelectedStageId((prev) => {
      if (prev && (prev === UNASSIGNED || stages.some((s) => s.id === prev))) return prev;
      if (currentStageId && stages.some((s) => s.id === currentStageId)) return currentStageId;
      const first = stages[0];
      if (first) return first.id;
      if (unassignedTasks.length > 0) return UNASSIGNED;
      return null;
    });
  }, [stages, currentStageId, unassignedTasks.length]);

  const viewingUnassigned = selectedStageId === UNASSIGNED;
  const selectedStage = viewingUnassigned
    ? null
    : (stages.find((s) => s.id === selectedStageId) ?? null);
  const selectedIndex = selectedStage
    ? stages.findIndex((s) => s.id === selectedStage.id)
    : -1;
  const selectedTasks = viewingUnassigned
    ? unassignedTasks
    : selectedStage
      ? (tasksByStage.get(selectedStage.id) ?? [])
      : [];

  const handleErr = (err: unknown, fallback: string): string | null => {
    if (err instanceof ApiError && err.status === 401) {
      void logout();
      return null;
    }
    return fallback;
  };

  /* ------------------------------- Действия -------------------------------- */

  const submitCreate = async () => {
    const name = addName.trim();
    if (!name || !token || creating) return;
    setCreating(true);
    setActionError(null);
    try {
      const created = await createProcessStage(token, {
        process_id: process.id,
        name,
        position: stages.length,
      });
      setStages((prev) => [...prev, created].sort((a, b) => a.position - b.position));
      setSelectedStageId(created.id);
      setAdding(false);
      setAddName('');
    } catch (err) {
      const msg = handleErr(err, 'Не удалось создать этап. Попробуйте ещё раз.');
      if (msg) setActionError(msg);
    } finally {
      setCreating(false);
    }
  };

  const submitRename = async (stage: ProcessStage) => {
    const name = renameName.trim();
    if (!token || savingRename) return;
    if (!name || name === stage.name) {
      setRenamingId(null);
      return;
    }
    setSavingRename(true);
    setActionError(null);
    try {
      const updated = await updateProcessStage(token, stageUpdatePayload(stage, { name }));
      setStages((prev) =>
        prev.map((s) => (s.id === stage.id ? updated : s)).sort((a, b) => a.position - b.position),
      );
      setRenamingId(null);
    } catch (err) {
      const msg = handleErr(err, 'Не удалось переименовать этап.');
      if (msg) setActionError(msg);
    } finally {
      setSavingRename(false);
    }
  };

  // Перестановка этапов: меняем местами i и j, нормализуем позиции (0..n-1) и сохраняем изменившиеся.
  const swapStages = async (i: number, j: number) => {
    if (!token || reordering) return;
    if (i < 0 || j < 0 || i >= stages.length || j >= stages.length) return;
    const next = [...stages];
    const a = next[i];
    const b = next[j];
    if (!a || !b) return;
    next[i] = b;
    next[j] = a;
    const renumbered = next.map((s, idx) => ({ ...s, position: idx }));
    const prev = stages;
    setStages(renumbered);
    setReordering(true);
    setActionError(null);
    try {
      const changed = renumbered.filter((s) => {
        const before = prev.find((p) => p.id === s.id);
        return before && before.position !== s.position;
      });
      await Promise.all(changed.map((s) => updateProcessStage(token, stageUpdatePayload(s, {}))));
    } catch (err) {
      setStages(prev);
      const msg = handleErr(err, 'Не удалось изменить порядок этапов.');
      if (msg) setActionError(msg);
    } finally {
      setReordering(false);
    }
  };

  // «Передвинуть процесс» на этап: сохраняем current_stage_id в attributes процесса.
  const moveProcessToStage = async (stageId: string) => {
    if (!token || movingProcess) return;
    const prev = currentStageId;
    setCurrentStageId(stageId);
    setMovingProcess(true);
    setActionError(null);
    try {
      const attributes = { ...process.attributes, [CURRENT_STAGE_ATTR]: stageId };
      await updateProcess(token, { id: process.id, ...processToInput(process, attributes) });
    } catch (err) {
      setCurrentStageId(prev);
      const msg = handleErr(err, 'Не удалось переместить процесс на этап.');
      if (msg) setActionError(msg);
    } finally {
      setMovingProcess(false);
    }
  };

  // Сброс текущего этапа (например, когда удалили тот, на котором стоял процесс). Best-effort.
  const clearCurrentStage = async () => {
    if (!token) return;
    const prev = currentStageId;
    setCurrentStageId('');
    try {
      const attributes = { ...process.attributes };
      delete attributes[CURRENT_STAGE_ATTR];
      await updateProcess(token, { id: process.id, ...processToInput(process, attributes) });
    } catch {
      setCurrentStageId(prev);
    }
  };

  const confirmDeleteStage = async () => {
    if (!deletingStage || !token || deleteLoading) return;
    const target = deletingStage;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProcessStage(token, target.id);
      setStages((prev) => prev.filter((s) => s.id !== target.id));
      if (selectedStageId === target.id) setSelectedStageId(null);
      if (currentStageId === target.id) void clearCurrentStage();
      setDeletingStage(null);
      // Задачи удалённого этапа больше ни к чему не привязаны — обновим, чтобы попали в «Без этапа».
      reloadTasks();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      setDeleteError('Не удалось удалить этап. Возможно, к нему ещё привязаны задачи.');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ------------------------------- Рендер ---------------------------------- */

  const stepCircleClass = (current: boolean) =>
    cx(
      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
      current ? 'bg-accent text-accent-on' : 'bg-bg-2 text-fg-muted',
    );

  const countBadgeClass = (active: boolean) =>
    cx(
      'ml-auto flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full border px-1 font-mono text-[11px] tabular-nums',
      active ? 'border-accent text-accent' : 'border-border-subtle text-fg-muted',
    );

  const pillClass = (selected: boolean) =>
    cx(
      'flex h-11 min-w-[8.5rem] max-w-[14rem] shrink-0 items-center gap-2.5 rounded-lg border px-3 text-left text-sm transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
      selected
        ? 'border-accent bg-accent-muted shadow-sm'
        : 'border-border-subtle bg-bg-1 hover:border-border-strong hover:bg-bg-2',
    );

  const addStageInput = (
    <div className="flex h-11 shrink-0 items-center gap-1 rounded-lg border border-accent bg-bg-1 px-2">
      <input
        autoFocus
        value={addName}
        disabled={creating}
        placeholder="Название этапа"
        onChange={(e) => setAddName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void submitCreate();
          } else if (e.key === 'Escape') {
            setAdding(false);
            setAddName('');
          }
        }}
        className="w-44 min-w-0 bg-transparent text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none disabled:opacity-50"
      />
      <IconButton
        label="Добавить этап"
        onClick={() => void submitCreate()}
        disabled={creating || !addName.trim()}
      >
        <CheckIcon size={15} />
      </IconButton>
      <IconButton
        label="Отмена"
        onClick={() => {
          setAdding(false);
          setAddName('');
        }}
        disabled={creating}
      >
        <XIcon size={15} />
      </IconButton>
    </div>
  );

  const hasBoard = stages.length > 0 || unassignedTasks.length > 0;

  return (
    <section className="mt-6 rounded-lg border border-border-subtle bg-bg-1 p-5 shadow-sm transition-colors duration-300">
      {/* Шапка блока */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg-primary">Этапы процесса</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Разбейте процесс на этапы, распределите по ним задачи и отмечайте, на каком этапе
            процесс находится сейчас.
          </p>
        </div>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="mt-3 rounded-md bg-state-error-muted px-3 py-2 text-sm text-state-error"
        >
          {actionError}
        </div>
      ) : null}

      {stagesLoading ? (
        <div className="mt-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 w-40 shrink-0 animate-pulse rounded-lg bg-bg-2" />
          ))}
        </div>
      ) : stagesError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-state-error-muted px-4 py-3 text-sm text-state-error">
          <span>{stagesError}</span>
          <Button size="sm" variant="secondary" onClick={reloadStages}>
            Повторить
          </Button>
        </div>
      ) : !hasBoard ? (
        // Совсем пусто: ни этапов, ни нераспределённых задач.
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-2 px-6 py-10 text-center">
          <p className="text-sm font-medium text-fg-secondary">У процесса ещё нет этапов</p>
          <p className="max-w-md text-xs text-fg-muted">
            Разбейте процесс на последовательные этапы (например «Заявка», «Согласование»,
            «Выполнение») и распределите по ним задачи — так будет видно, что нужно сделать на
            каждом шаге и где процесс находится сейчас.
          </p>
          {adding ? (
            addStageInput
          ) : (
            <Button
              leftIcon={<PlusIcon />}
              onClick={() => {
                setActionError(null);
                setAdding(true);
              }}
            >
              Добавить первый этап
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Пайплайн этапов */}
          <div className="no-scrollbar mt-4 flex items-center gap-1.5 overflow-x-auto py-1">
            {unassignedTasks.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedStageId(UNASSIGNED)}
                  className={cx(
                    'flex h-11 shrink-0 items-center gap-2.5 rounded-lg border px-3 text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    viewingUnassigned
                      ? 'border-accent bg-accent-muted shadow-sm'
                      : 'border-dashed border-border-strong bg-bg-1 hover:border-fg-muted hover:bg-bg-2',
                  )}
                >
                  <span className="whitespace-nowrap text-fg-secondary">Без этапа</span>
                  <span className={countBadgeClass(viewingUnassigned)}>{unassignedTasks.length}</span>
                </button>
                <span className="mx-1 h-6 w-px shrink-0 self-center bg-border-subtle" aria-hidden />
              </>
            ) : null}

            {stages.map((s, i) => {
              const isCurrent = currentStageId === s.id;
              const isSelected = selectedStageId === s.id;
              const count = tasksByStage.get(s.id)?.length ?? 0;
              return (
                <Fragment key={s.id}>
                  {i > 0 ? (
                    <ChevronRightIcon className="shrink-0 self-center text-fg-muted" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedStageId(s.id)}
                    className={pillClass(isSelected)}
                  >
                    <span className={stepCircleClass(isCurrent)}>
                      {isCurrent ? <FlagIcon size={12} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-fg-primary">
                      {s.name}
                    </span>
                    <span className={countBadgeClass(isSelected || isCurrent)}>{count}</span>
                  </button>
                </Fragment>
              );
            })}

            {/* Добавление этапа */}
            {adding ? (
              addStageInput
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setAdding(true);
                }}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 text-sm text-fg-muted transition-colors duration-150 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <PlusIcon size={15} />
                Этап
              </button>
            )}
          </div>

          {/* Панель выбранного этапа / сегмента «Без этапа» */}
          {selectedStage ? (
            <div className="mt-4 rounded-lg border border-border-subtle bg-bg-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {renamingId === selectedStage.id ? (
                    <input
                      autoFocus
                      value={renameName}
                      disabled={savingRename}
                      onChange={(e) => setRenameName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submitRename(selectedStage);
                        } else if (e.key === 'Escape') {
                          setRenamingId(null);
                        }
                      }}
                      onBlur={() => void submitRename(selectedStage)}
                      className="w-56 max-w-full min-w-0 rounded-md border border-accent bg-bg-1 px-2 py-1 text-base font-semibold text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                    />
                  ) : (
                    <h3 className="truncate text-base font-semibold text-fg-primary">
                      {selectedStage.name}
                    </h3>
                  )}
                  {currentStageId === selectedStage.id ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent">
                      <FlagIcon size={11} />
                      Текущий этап
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <IconButton
                    label="Переместить левее"
                    onClick={() => void swapStages(selectedIndex, selectedIndex - 1)}
                    disabled={selectedIndex <= 0 || reordering}
                  >
                    <ArrowLeftIcon size={15} />
                  </IconButton>
                  <IconButton
                    label="Переместить правее"
                    onClick={() => void swapStages(selectedIndex, selectedIndex + 1)}
                    disabled={selectedIndex >= stages.length - 1 || reordering}
                  >
                    <ArrowRightIcon size={15} />
                  </IconButton>
                  {currentStageId !== selectedStage.id ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<FlagIcon size={14} />}
                      loading={movingProcess}
                      onClick={() => void moveProcessToStage(selectedStage.id)}
                    >
                      Переместить сюда
                    </Button>
                  ) : null}
                  <span className="mx-0.5 h-5 w-px shrink-0 bg-border-subtle" aria-hidden />
                  <IconButton
                    label="Переименовать этап"
                    onClick={() => {
                      setActionError(null);
                      setRenamingId(selectedStage.id);
                      setRenameName(selectedStage.name);
                    }}
                  >
                    <PencilIcon />
                  </IconButton>
                  <IconButton
                    label="Удалить этап"
                    onClick={() => {
                      setDeleteError(null);
                      setDeletingStage(selectedStage);
                    }}
                  >
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>

              {selectedStage.description ? (
                <p className="mt-1.5 text-sm text-fg-secondary">{selectedStage.description}</p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
                <span className="text-xs text-fg-muted">Задачи этапа · {selectedTasks.length}</span>
                <Button
                  size="sm"
                  leftIcon={<PlusIcon size={15} />}
                  onClick={() => setAddTaskFor(selectedStage)}
                >
                  Добавить задачу
                </Button>
              </div>

              {selectedTasks.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-fg-muted">
                  На этом этапе пока нет задач
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {selectedTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={() => onOpenTask(t)} />
                  ))}
                </ul>
              )}
            </div>
          ) : viewingUnassigned ? (
            <div className="mt-4 rounded-lg border border-border-subtle bg-bg-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-fg-primary">Без этапа</h3>
                <span className="text-xs text-fg-muted">{unassignedTasks.length}</span>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Эти задачи процесса ещё не привязаны к этапу. Откройте задачу, чтобы назначить ей
                этап.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {unassignedTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={() => onOpenTask(t)} />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <TaskFormDialog
        open={!!addTaskFor}
        task={null}
        projects={projects}
        clients={clients}
        deals={deals}
        users={users}
        services={services}
        processes={processes}
        defaultProcessId={process.id}
        defaultProcessStageId={addTaskFor?.id}
        onClose={() => setAddTaskFor(null)}
        onSaved={() => {
          setAddTaskFor(null);
          reloadTasks();
        }}
      />

      <ConfirmDialog
        open={!!deletingStage}
        onClose={() => (deleteLoading ? undefined : setDeletingStage(null))}
        onConfirm={confirmDeleteStage}
        title="Удалить этап?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Этап <span className="font-medium text-fg-primary">{deletingStage?.name}</span> будет
            удалён. Задачи этого этапа не удалятся — они останутся у процесса без привязки к этапу.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}
