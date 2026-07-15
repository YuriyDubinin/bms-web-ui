import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  createProject,
  updateProject,
  type Project,
  type ProjectInput,
  type ProjectStatus,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, Modal } from '@app/ui';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from './model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const FORM_ID = 'project-form';

const NAME_MIN = 2;
const NAME_MAX = 255;
const SLUG_MAX = 100;
const DIRECTION_MAX = 255;
const DESCRIPTION_MAX = 5000;

type FieldKey = 'name' | 'slug' | 'direction' | 'description' | 'attributes' | 'starts_at' | 'ends_at';
type Errors = Partial<Record<FieldKey, string>>;

function inputClass(hasError: boolean): string {
  return cx(
    // min-w-0 обязателен: иначе нативный date-инпут на мобильных не сжимается и вылезает из формы.
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

export type ProjectFormDialogProps = {
  open: boolean;
  /** null — режим создания; объект — режим редактирования. */
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  slug: string;
  direction: string;
  description: string;
  status: ProjectStatus;
  starts_at: string;
  ends_at: string;
  attributes: string;
};

function emptyForm(): FormState {
  return {
    name: '',
    slug: '',
    direction: '',
    description: '',
    status: 'ACTIVE',
    starts_at: '',
    ends_at: '',
    attributes: '',
  };
}

function formFromProject(p: Project): FormState {
  return {
    name: p.name,
    slug: p.slug,
    direction: p.direction,
    description: p.description,
    status: p.status,
    starts_at: p.starts_at ?? '',
    ends_at: p.ends_at ?? '',
    attributes:
      p.attributes && Object.keys(p.attributes).length > 0
        ? JSON.stringify(p.attributes, null, 2)
        : '',
  };
}

export function ProjectFormDialog({ open, project, onClose, onSaved }: ProjectFormDialogProps) {
  const { token, logout } = useAuth();
  const isEdit = !!project;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Заполняем форму при открытии: PUT перезаписывает проект целиком, поэтому подставляем ВСЕ поля.
  useEffect(() => {
    if (!open) return;
    setForm(project ? formFromProject(project) : emptyForm());
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, project]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): { errors: Errors; attributes: Record<string, unknown> } => {
    const next: Errors = {};
    const name = form.name.trim();
    if (name.length < NAME_MIN) next.name = 'Минимум 2 символа';
    else if (name.length > NAME_MAX) next.name = 'Слишком длинное название';
    if (form.slug.trim().length > SLUG_MAX) next.slug = 'Максимум 100 символов';
    if (form.direction.trim().length > DIRECTION_MAX) next.direction = 'Максимум 255 символов';
    if (form.description.trim().length > DESCRIPTION_MAX) next.description = 'Максимум 5000 символов';

    let attributes: Record<string, unknown> = {};
    const rawAttrs = form.attributes.trim();
    if (rawAttrs) {
      try {
        const parsed: unknown = JSON.parse(rawAttrs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.attributes = 'Должен быть JSON-объект, например {"chairs": 6}';
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
      if (err.status === 409 || err.code === 'PROJECT_EXISTS') {
        setErrors((prev) => ({ ...prev, slug: 'Такой slug уже занят в организации' }));
        return;
      }
      if (err.status === 422 && err.details?.length) {
        const mapped: Errors = {};
        for (const d of err.details) {
          if (
            d.field === 'name' ||
            d.field === 'slug' ||
            d.field === 'direction' ||
            d.field === 'description' ||
            d.field === 'attributes' ||
            d.field === 'starts_at' ||
            d.field === 'ends_at'
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

    // Отправляем ВСЕ поля (PUT = полная замена; для create поведение идентичное).
    const payload: ProjectInput = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      direction: form.direction.trim(),
      description: form.description.trim(),
      status: form.status,
      attributes,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    setSubmitting(true);
    try {
      if (isEdit && project) {
        await updateProject(token, { ...payload, id: project.id });
      } else {
        await createProject(token, payload);
      }
      onSaved();
    } catch (err) {
      applyServerError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Редактировать проект' : 'Новый проект'}
      description={isEdit ? project?.name : 'Заполните данные проекта'}
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

        <Field label="Название" htmlFor="project-name" required error={errors.name}>
          <input
            id="project-name"
            type="text"
            value={form.name}
            maxLength={NAME_MAX}
            disabled={submitting}
            placeholder="Например: Автопарк"
            onChange={(e) => setField('name', e.target.value)}
            className={inputClass(!!errors.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Slug"
            htmlFor="project-slug"
            error={errors.slug}
            hint="ЧПУ-идентификатор, уникален. Можно оставить пустым."
          >
            <input
              id="project-slug"
              type="text"
              value={form.slug}
              maxLength={SLUG_MAX}
              disabled={submitting}
              placeholder="avtopark"
              onChange={(e) => setField('slug', e.target.value)}
              className={inputClass(!!errors.slug)}
            />
          </Field>

          <Field label="Направление" htmlFor="project-direction" error={errors.direction}>
            <input
              id="project-direction"
              type="text"
              value={form.direction}
              maxLength={DIRECTION_MAX}
              disabled={submitting}
              placeholder="автопарк"
              onChange={(e) => setField('direction', e.target.value)}
              className={inputClass(!!errors.direction)}
            />
          </Field>
        </div>

        <Field label="Описание" htmlFor="project-description" error={errors.description}>
          <textarea
            id="project-description"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            disabled={submitting}
            placeholder="Краткое описание проекта"
            onChange={(e) => setField('description', e.target.value)}
            className={cx(inputClass(!!errors.description), 'resize-y')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Статус" htmlFor="project-status">
            <select
              id="project-status"
              value={form.status}
              disabled={submitting}
              onChange={(e) => setField('status', e.target.value as ProjectStatus)}
              className={inputClass(false)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Дата начала" htmlFor="project-starts" error={errors.starts_at}>
            <input
              id="project-starts"
              type="date"
              value={form.starts_at}
              disabled={submitting}
              onChange={(e) => setField('starts_at', e.target.value)}
              className={inputClass(!!errors.starts_at)}
            />
          </Field>

          <Field label="Дата окончания" htmlFor="project-ends" error={errors.ends_at}>
            <input
              id="project-ends"
              type="date"
              value={form.ends_at}
              disabled={submitting}
              onChange={(e) => setField('ends_at', e.target.value)}
              className={inputClass(!!errors.ends_at)}
            />
          </Field>
        </div>

        <Field
          label="Доп. атрибуты (JSON)"
          htmlFor="project-attributes"
          error={errors.attributes}
          hint='Произвольный JSON-объект, например {"fleet_size": 12}'
        >
          <textarea
            id="project-attributes"
            rows={3}
            value={form.attributes}
            disabled={submitting}
            placeholder="{}"
            spellCheck={false}
            onChange={(e) => setField('attributes', e.target.value)}
            className={cx(inputClass(!!errors.attributes), 'resize-y font-mono text-xs')}
          />
        </Field>
      </form>
    </Modal>
  );
}
