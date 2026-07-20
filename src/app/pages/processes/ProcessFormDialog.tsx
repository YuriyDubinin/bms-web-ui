import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  createProcess,
  updateProcess,
  type Process,
  type ProcessInput,
  type ProcessStatus,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, Modal, SelectSearch } from '@app/ui';
import { PROCESS_STATUSES, PROCESS_STATUS_LABELS, formatDateTime } from './model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const FORM_ID = 'process-form';

const NAME_MIN = 2;
const NAME_MAX = 255;
const DESCRIPTION_MAX = 5000;

type FieldKey = 'name' | 'description' | 'attributes';
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

export type ProcessFormDialogProps = {
  open: boolean;
  /** null — режим создания; объект — режим редактирования. */
  process: Process | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  description: string;
  status: ProcessStatus;
  attributes: string;
};

function emptyForm(): FormState {
  return { name: '', description: '', status: 'ACTIVE', attributes: '' };
}

function formFromProcess(p: Process): FormState {
  return {
    name: p.name,
    description: p.description,
    status: p.status,
    attributes:
      p.attributes && Object.keys(p.attributes).length > 0
        ? JSON.stringify(p.attributes, null, 2)
        : '',
  };
}

export function ProcessFormDialog({ open, process, onClose, onSaved }: ProcessFormDialogProps) {
  const { token, logout } = useAuth();
  const isEdit = !!process;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Заполняем форму при открытии: PUT перезаписывает процесс целиком, поэтому подставляем ВСЕ поля.
  useEffect(() => {
    if (!open) return;
    setForm(process ? formFromProcess(process) : emptyForm());
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, process]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): { errors: Errors; attributes: Record<string, unknown> } => {
    const next: Errors = {};
    const name = form.name.trim();
    if (name.length < NAME_MIN) next.name = 'Минимум 2 символа';
    else if (name.length > NAME_MAX) next.name = 'Максимум 255 символов';
    if (form.description.trim().length > DESCRIPTION_MAX) next.description = 'Слишком длинное описание';

    let attributes: Record<string, unknown> = {};
    const rawAttrs = form.attributes.trim();
    if (rawAttrs) {
      try {
        const parsed: unknown = JSON.parse(rawAttrs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.attributes = 'Должен быть JSON-объект, например {"owner": "Иванов"}';
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
      if (err.status === 404 || err.code === 'PROCESS_NOT_FOUND') {
        setFormError('Процесс не найден — возможно, он был удалён. Обновите список.');
        return;
      }
      if (err.status === 422 && err.details?.length) {
        const mapped: Errors = {};
        for (const d of err.details) {
          if (d.field === 'name' || d.field === 'description' || d.field === 'attributes') {
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

    // PUT = полная замена. Отправляем все поля целиком; closed_at — read-only, его не шлём.
    const payload: ProcessInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      attributes,
    };

    setSubmitting(true);
    try {
      if (isEdit && process) {
        await updateProcess(token, { ...payload, id: process.id });
      } else {
        await createProcess(token, payload);
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
      title={isEdit ? 'Редактировать процесс' : 'Новый процесс'}
      description={isEdit ? process?.name : 'Заполните данные процесса'}
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

        <Field label="Название" htmlFor="process-name" required error={errors.name}>
          <input
            id="process-name"
            type="text"
            value={form.name}
            maxLength={NAME_MAX}
            disabled={submitting}
            placeholder="Например: Оформление сделки под ключ"
            onChange={(e) => setField('name', e.target.value)}
            className={inputClass(!!errors.name)}
          />
        </Field>

        <Field label="Описание" htmlFor="process-description" error={errors.description}>
          <textarea
            id="process-description"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            disabled={submitting}
            placeholder="Краткое описание процесса"
            onChange={(e) => setField('description', e.target.value)}
            className={cx(inputClass(!!errors.description), 'resize-y')}
          />
        </Field>

        <Field
          label="Статус"
          htmlFor="process-status"
          hint="«Завершён» и «Провален» закрывают процесс — дата завершения проставится автоматически."
        >
          <SelectSearch
            id="process-status"
            value={form.status}
            disabled={submitting}
            onChange={(v) => setField('status', v as ProcessStatus)}
            options={PROCESS_STATUSES.map((s) => ({ value: s, label: PROCESS_STATUS_LABELS[s] }))}
          />
        </Field>

        <SectionLabel>Дополнительно</SectionLabel>
        <Field
          label="Доп. атрибуты (JSON)"
          htmlFor="process-attributes"
          error={errors.attributes}
          hint='Произвольный JSON-объект, например {"owner": "Иванов"}'
        >
          <textarea
            id="process-attributes"
            rows={3}
            value={form.attributes}
            disabled={submitting}
            placeholder="{}"
            spellCheck={false}
            onChange={(e) => setField('attributes', e.target.value)}
            className={cx(inputClass(!!errors.attributes), 'resize-y font-mono text-xs')}
          />
        </Field>

        {isEdit && process ? (
          <>
            <SectionLabel>Служебное</SectionLabel>
            <dl className="grid grid-cols-1 gap-3 rounded-md bg-bg-2/40 p-3 text-xs sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-fg-muted">Создан</dt>
                <dd className="mt-0.5 text-fg-secondary">{formatDateTime(process.created_at)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-muted">Обновлён</dt>
                <dd className="mt-0.5 text-fg-secondary">{formatDateTime(process.updated_at)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-muted">Завершён</dt>
                <dd className="mt-0.5 text-fg-secondary">{formatDateTime(process.closed_at)}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
