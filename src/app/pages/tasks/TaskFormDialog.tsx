import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  createTask,
  updateTask,
  type Client,
  type Deal,
  type Project,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
  type User,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, Modal } from '@app/ui';
import { clientName } from '../clients/model';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  formatDateTime,
  isoToLocalInput,
  localInputToIso,
} from './model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const FORM_ID = 'task-form';

const TITLE_MIN = 2;
const TITLE_MAX = 500;
const DESCRIPTION_MAX = 10000;

type FieldKey =
  | 'title'
  | 'description'
  | 'project_id'
  | 'client_id'
  | 'deal_id'
  | 'assigned_to'
  | 'attributes';
type Errors = Partial<Record<FieldKey, string>>;

function inputClass(hasError: boolean): string {
  return cx(
    'w-full min-w-0 rounded-md border bg-bg-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted',
    'transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-state-error focus:border-state-error focus:ring-state-error-muted'
      : 'border-border-subtle focus:border-accent focus:ring-accent-muted',
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-fg-secondary">
        {label}
        {required ? <span className="text-state-error"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-state-error">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-border-subtle pt-4 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
      {children}
    </p>
  );
}

export type TaskFormDialogProps = {
  open: boolean;
  /** null — режим создания; объект — режим редактирования. */
  task: Task | null;
  projects: Project[];
  clients: Client[];
  /** Сделки организации — для привязки задачи к сделке. */
  deals: Deal[];
  /** Операторы организации — для выбора исполнителя. */
  users: User[];
  /** Предвыбранный проект при создании (например, со страницы проекта). */
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string;
  project_id: string;
  client_id: string;
  deal_id: string;
  assigned_to: string;
  attributes: string;
};

function emptyForm(projectId = ''): FormState {
  return {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    due_at: '',
    project_id: projectId,
    client_id: '',
    deal_id: '',
    assigned_to: '',
    attributes: '',
  };
}

function formFromTask(t: Task): FormState {
  return {
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_at: isoToLocalInput(t.due_at),
    project_id: t.project_id ?? '',
    client_id: t.client_id ?? '',
    deal_id: t.deal_id ?? '',
    assigned_to: t.assigned_to ?? '',
    attributes:
      t.attributes && Object.keys(t.attributes).length > 0
        ? JSON.stringify(t.attributes, null, 2)
        : '',
  };
}

export function TaskFormDialog({
  open,
  task,
  projects,
  clients,
  deals,
  users,
  defaultProjectId,
  onClose,
  onSaved,
}: TaskFormDialogProps) {
  const { token, logout } = useAuth();
  const isEdit = !!task;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Заполняем форму при открытии: PUT перезаписывает задачу целиком, поэтому подставляем ВСЕ поля.
  useEffect(() => {
    if (!open) return;
    setForm(task ? formFromTask(task) : emptyForm(defaultProjectId));
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, task, defaultProjectId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): { errors: Errors; attributes: Record<string, unknown> } => {
    const next: Errors = {};
    const title = form.title.trim();
    if (title.length < TITLE_MIN) next.title = 'Минимум 2 символа';
    else if (title.length > TITLE_MAX) next.title = 'Максимум 500 символов';
    if (form.description.trim().length > DESCRIPTION_MAX) next.description = 'Слишком длинное описание';

    let attributes: Record<string, unknown> = {};
    const rawAttrs = form.attributes.trim();
    if (rawAttrs) {
      try {
        const parsed: unknown = JSON.parse(rawAttrs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.attributes = 'Должен быть JSON-объект, например {"checklist": []}';
        } else {
          attributes = parsed as Record<string, unknown>;
        }
      } catch {
        next.attributes = 'Некорректный JSON';
      }
    }

    return { errors: next, attributes };
  };

  const applyServerError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        void logout();
        return;
      }
      if (err.status === 404 || err.code === 'TASK_NOT_FOUND') {
        setFormError('Задача не найдена — возможно, она была удалена. Обновите список.');
        return;
      }
      if (err.status === 422 && err.details?.length) {
        const mapped: Errors = {};
        for (const d of err.details) {
          if (
            d.field === 'title' ||
            d.field === 'description' ||
            d.field === 'project_id' ||
            d.field === 'client_id' ||
            d.field === 'deal_id' ||
            d.field === 'assigned_to' ||
            d.field === 'attributes'
          ) {
            mapped[d.field] = d.message;
          }
        }
        if (Object.keys(mapped).length > 0) {
          setErrors((prev) => ({ ...prev, ...mapped }));
          return;
        }
        setFormError('Проверьте правильность заполнения полей.');
        return;
      }
      if (err.code === 'NETWORK_ERROR') {
        setFormError('Не удалось связаться с сервером. Проверьте подключение.');
        return;
      }
      setFormError('Что-то пошло не так, попробуйте позже.');
      return;
    }
    setFormError('Что-то пошло не так, попробуйте позже.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !token) return;

    const { errors: validationErrors, attributes } = validate();
    setErrors(validationErrors);
    setFormError(null);
    if (Object.keys(validationErrors).length > 0) return;

    const dueIso = localInputToIso(form.due_at);

    // PUT = полная замена. Незаданные привязки/срок опускаем — бэкенд трактует отсутствие
    // как null (явный null он не принимает). completed_at/created_by не отправляем — read-only.
    const payload: TaskInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      attributes,
      ...(form.project_id ? { project_id: form.project_id } : {}),
      ...(form.client_id ? { client_id: form.client_id } : {}),
      ...(form.deal_id ? { deal_id: form.deal_id } : {}),
      ...(form.assigned_to ? { assigned_to: form.assigned_to } : {}),
      ...(dueIso ? { due_at: dueIso } : {}),
    };

    setSubmitting(true);
    try {
      if (isEdit && task) {
        await updateTask(token, { ...payload, id: task.id });
      } else {
        await createTask(token, payload);
      }
      onSaved();
    } catch (err) {
      applyServerError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const authorName = task?.created_by
    ? (users.find((u) => u.id === task.created_by)?.full_name ?? '—')
    : '—';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Редактировать задачу' : 'Новая задача'}
      description={isEdit ? task?.title : 'Заполните данные задачи'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button type="submit" form={FORM_ID} loading={submitting}>
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <div
            role="alert"
            className="rounded-md bg-state-error-muted px-3 py-2.5 text-sm text-state-error"
          >
            {formError}
          </div>
        ) : null}

        <Field label="Заголовок" htmlFor="task-title" required error={errors.title}>
          <input
            id="task-title"
            type="text"
            value={form.title}
            maxLength={TITLE_MAX}
            disabled={submitting}
            placeholder="Например: Позвонить клиенту и согласовать смету"
            onChange={(e) => setField('title', e.target.value)}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <Field label="Описание" htmlFor="task-description" error={errors.description}>
          <textarea
            id="task-description"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            disabled={submitting}
            placeholder="Детали задачи"
            onChange={(e) => setField('description', e.target.value)}
            className={cx(inputClass(!!errors.description), 'resize-y')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Статус" htmlFor="task-status">
            <select
              id="task-status"
              value={form.status}
              disabled={submitting}
              onChange={(e) => setField('status', e.target.value as TaskStatus)}
              className={inputClass(false)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Приоритет" htmlFor="task-priority">
            <select
              id="task-priority"
              value={form.priority}
              disabled={submitting}
              onChange={(e) => setField('priority', e.target.value as TaskPriority)}
              className={inputClass(false)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Срок" htmlFor="task-due">
            <input
              id="task-due"
              type="datetime-local"
              value={form.due_at}
              disabled={submitting}
              onChange={(e) => setField('due_at', e.target.value)}
              className={inputClass(false)}
            />
          </Field>
          <Field label="Исполнитель" htmlFor="task-assignee" error={errors.assigned_to}>
            <select
              id="task-assignee"
              value={form.assigned_to}
              disabled={submitting}
              onChange={(e) => setField('assigned_to', e.target.value)}
              className={inputClass(!!errors.assigned_to)}
            >
              <option value="">Без исполнителя</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Проект" htmlFor="task-project" error={errors.project_id}>
            <select
              id="task-project"
              value={form.project_id}
              disabled={submitting}
              onChange={(e) => setField('project_id', e.target.value)}
              className={inputClass(!!errors.project_id)}
            >
              <option value="">Без проекта</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Клиент" htmlFor="task-client" error={errors.client_id}>
            <select
              id="task-client"
              value={form.client_id}
              disabled={submitting}
              onChange={(e) => setField('client_id', e.target.value)}
              className={inputClass(!!errors.client_id)}
            >
              <option value="">Без клиента</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientName(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Сделка" htmlFor="task-deal" error={errors.deal_id}>
            <select
              id="task-deal"
              value={form.deal_id}
              disabled={submitting}
              onChange={(e) => setField('deal_id', e.target.value)}
              className={inputClass(!!errors.deal_id)}
            >
              <option value="">Без сделки</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <SectionLabel>Дополнительно</SectionLabel>
        <Field
          label="Доп. атрибуты (JSON)"
          htmlFor="task-attributes"
          error={errors.attributes}
          hint='Произвольный JSON-объект, например {"checklist": ["смета", "сроки"]}'
        >
          <textarea
            id="task-attributes"
            rows={3}
            value={form.attributes}
            disabled={submitting}
            placeholder="{}"
            spellCheck={false}
            onChange={(e) => setField('attributes', e.target.value)}
            className={cx(inputClass(!!errors.attributes), 'resize-y font-mono text-xs')}
          />
        </Field>

        {isEdit && task ? (
          <>
            <SectionLabel>Служебное</SectionLabel>
            <dl className="grid grid-cols-1 gap-3 rounded-md bg-bg-2/40 p-3 text-xs sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-fg-muted">Автор</dt>
                <dd className="mt-0.5 truncate text-fg-secondary">{authorName}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-muted">Создана</dt>
                <dd className="mt-0.5 text-fg-secondary">{formatDateTime(task.created_at)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-muted">Завершена</dt>
                <dd className="mt-0.5 text-fg-secondary">
                  {task.completed_at ? formatDateTime(task.completed_at) : '—'}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
