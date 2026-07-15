import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  createClient,
  updateClient,
  type Client,
  type ClientInput,
  type ClientStatus,
  type Project,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, Modal } from '@app/ui';
import {
  ADDRESS_COMMENT_KEY,
  ADDRESS_FIELDS,
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  clientName,
} from './model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const FORM_ID = 'client-form';

const NAME_MAX = 255;
const EMAIL_MAX = 255;
const PHONE_MAX = 50;
const SOURCE_MAX = 255;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = 'name' | 'email' | 'phone' | 'source' | 'project_id' | 'attributes';
type Errors = Partial<Record<FieldKey, string>>;

/** Все ключи адреса (именованные поля + комментарий) — для сборки/разбора JSON. */
const ADDRESS_KEYS = [...ADDRESS_FIELDS.map((f) => f.key), ADDRESS_COMMENT_KEY];

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

/** Заголовок логического блока формы (например, «Адрес»). */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-border-subtle pt-4 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
      {children}
    </p>
  );
}

export type ClientFormDialogProps = {
  open: boolean;
  /** null — режим создания; объект — режим редактирования. */
  client: Client | null;
  /** Проекты организации для выбора «домашнего» проекта клиента. */
  projects: Project[];
  /** Предвыбранный проект при создании (например, со страницы проекта). */
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  source: string;
  project_id: string;
  address: Record<string, string>;
  attributes: string;
};

function emptyAddress(): Record<string, string> {
  return Object.fromEntries(ADDRESS_KEYS.map((k) => [k, '']));
}

function emptyForm(projectId = ''): FormState {
  return {
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    status: 'LEAD',
    source: '',
    project_id: projectId,
    address: emptyAddress(),
    attributes: '',
  };
}

function formFromClient(c: Client): FormState {
  const address = emptyAddress();
  if (c.address) {
    for (const key of ADDRESS_KEYS) {
      const v = c.address[key];
      if (v !== undefined && v !== null) address[key] = String(v);
    }
  }
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    company_name: c.company_name,
    email: c.email,
    phone: c.phone,
    status: c.status,
    source: c.source,
    project_id: c.project_id ?? '',
    address,
    attributes:
      c.attributes && Object.keys(c.attributes).length > 0
        ? JSON.stringify(c.attributes, null, 2)
        : '',
  };
}

export function ClientFormDialog({
  open,
  client,
  projects,
  defaultProjectId,
  onClose,
  onSaved,
}: ClientFormDialogProps) {
  const { token, logout } = useAuth();
  const isEdit = !!client;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Заполняем форму при открытии: PUT перезаписывает клиента целиком, поэтому подставляем ВСЕ поля.
  useEffect(() => {
    if (!open) return;
    setForm(client ? formFromClient(client) : emptyForm(defaultProjectId));
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, client, defaultProjectId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const setAddressField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
  };
  const clearError = (key: FieldKey) => {
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): { errors: Errors; attributes: Record<string, unknown> } => {
    const next: Errors = {};

    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const company = form.company_name.trim();
    if (!first && !last && !company) {
      next.name = 'Укажите имя, фамилию или название компании';
    } else if (first.length > NAME_MAX || last.length > NAME_MAX || company.length > NAME_MAX) {
      next.name = 'Максимум 255 символов в каждом поле';
    }

    const email = form.email.trim();
    if (email && (email.length > EMAIL_MAX || !EMAIL_RE.test(email))) {
      next.email = 'Введите корректный email';
    }
    if (form.phone.trim().length > PHONE_MAX) next.phone = 'Максимум 50 символов';
    if (form.source.trim().length > SOURCE_MAX) next.source = 'Максимум 255 символов';

    let attributes: Record<string, unknown> = {};
    const rawAttrs = form.attributes.trim();
    if (rawAttrs) {
      try {
        const parsed: unknown = JSON.parse(rawAttrs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.attributes = 'Должен быть JSON-объект, например {"vip": true}';
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
      if (err.status === 404 || err.code === 'CLIENT_NOT_FOUND') {
        setFormError('Клиент не найден — возможно, он был удалён. Обновите список.');
        return;
      }
      if (err.status === 422 && err.details?.length) {
        const mapped: Errors = {};
        for (const d of err.details) {
          if (d.field === 'name') mapped.name = 'Укажите имя, фамилию или название компании';
          else if (d.field === 'email') mapped.email = d.message;
          else if (d.field === 'phone') mapped.phone = d.message;
          else if (d.field === 'source') mapped.source = d.message;
          else if (d.field === 'project_id') mapped.project_id = d.message;
          else if (d.field === 'attributes' || d.field === 'address')
            mapped.attributes = d.message;
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

    // Собираем адрес из непустых полей. Пустой адрес не отправляем — бэкенд поставит null.
    const address: Record<string, string> = {};
    for (const key of ADDRESS_KEYS) {
      const v = (form.address[key] ?? '').trim();
      if (v) address[key] = v;
    }
    const hasAddress = Object.keys(address).length > 0;

    // PUT = полная замена. Строки шлём как есть (пустые сбрасываются в ''); project_id и address
    // при отсутствии опускаем — бэкенд трактует это как null (явный null он не принимает).
    const payload: ClientInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      company_name: form.company_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      source: form.source.trim(),
      attributes,
      ...(form.project_id ? { project_id: form.project_id } : {}),
      ...(hasAddress ? { address } : {}),
    };

    setSubmitting(true);
    try {
      if (isEdit && client) {
        await updateClient(token, { ...payload, id: client.id });
      } else {
        await createClient(token, payload);
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
      title={isEdit ? 'Редактировать клиента' : 'Новый клиент'}
      description={isEdit && client ? clientName(client) : 'Заполните данные клиента'}
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

        {/* Имя / компания — хотя бы одно обязательно */}
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Имя" htmlFor="client-first-name">
              <input
                id="client-first-name"
                type="text"
                value={form.first_name}
                maxLength={NAME_MAX}
                disabled={submitting}
                placeholder="Иван"
                onChange={(e) => {
                  setField('first_name', e.target.value);
                  clearError('name');
                }}
                className={inputClass(!!errors.name)}
              />
            </Field>
            <Field label="Фамилия" htmlFor="client-last-name">
              <input
                id="client-last-name"
                type="text"
                value={form.last_name}
                maxLength={NAME_MAX}
                disabled={submitting}
                placeholder="Петров"
                onChange={(e) => {
                  setField('last_name', e.target.value);
                  clearError('name');
                }}
                className={inputClass(!!errors.name)}
              />
            </Field>
          </div>
          <Field
            label="Компания"
            htmlFor="client-company"
            error={errors.name}
            hint="Заполните хотя бы одно: имя, фамилию или компанию."
          >
            <input
              id="client-company"
              type="text"
              value={form.company_name}
              maxLength={NAME_MAX}
              disabled={submitting}
              placeholder="ООО «Ромашка»"
              onChange={(e) => {
                setField('company_name', e.target.value);
                clearError('name');
              }}
              className={inputClass(!!errors.name)}
            />
          </Field>
        </div>

        {/* Контакты */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="client-email" error={errors.email}>
            <input
              id="client-email"
              type="email"
              value={form.email}
              maxLength={EMAIL_MAX}
              disabled={submitting}
              placeholder="ivan@romashka.ru"
              onChange={(e) => {
                setField('email', e.target.value);
                clearError('email');
              }}
              className={inputClass(!!errors.email)}
            />
          </Field>
          <Field label="Телефон" htmlFor="client-phone" error={errors.phone}>
            <input
              id="client-phone"
              type="tel"
              value={form.phone}
              maxLength={PHONE_MAX}
              disabled={submitting}
              placeholder="+7 900 123-45-67"
              onChange={(e) => {
                setField('phone', e.target.value);
                clearError('phone');
              }}
              className={inputClass(!!errors.phone)}
            />
          </Field>
        </div>

        {/* Статус / источник / проект */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Статус" htmlFor="client-status">
            <select
              id="client-status"
              value={form.status}
              disabled={submitting}
              onChange={(e) => setField('status', e.target.value as ClientStatus)}
              className={inputClass(false)}
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Источник" htmlFor="client-source" error={errors.source}>
            <input
              id="client-source"
              type="text"
              value={form.source}
              maxLength={SOURCE_MAX}
              disabled={submitting}
              placeholder="website, referral…"
              onChange={(e) => {
                setField('source', e.target.value);
                clearError('source');
              }}
              className={inputClass(!!errors.source)}
            />
          </Field>
          <Field label="Проект" htmlFor="client-project" error={errors.project_id}>
            <select
              id="client-project"
              value={form.project_id}
              disabled={submitting}
              onChange={(e) => {
                setField('project_id', e.target.value);
                clearError('project_id');
              }}
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
        </div>

        {/* Адрес */}
        <SectionLabel>Адрес</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADDRESS_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`client-addr-${f.key}`}>
              <input
                id={`client-addr-${f.key}`}
                type="text"
                value={form.address[f.key] ?? ''}
                disabled={submitting}
                placeholder={f.placeholder}
                onChange={(e) => setAddressField(f.key, e.target.value)}
                className={inputClass(false)}
              />
            </Field>
          ))}
        </div>
        <Field label="Комментарий к адресу" htmlFor={`client-addr-${ADDRESS_COMMENT_KEY}`}>
          <input
            id={`client-addr-${ADDRESS_COMMENT_KEY}`}
            type="text"
            value={form.address[ADDRESS_COMMENT_KEY] ?? ''}
            disabled={submitting}
            placeholder="Например: домофон 10, вход со двора"
            onChange={(e) => setAddressField(ADDRESS_COMMENT_KEY, e.target.value)}
            className={inputClass(false)}
          />
        </Field>

        {/* Доп. атрибуты */}
        <SectionLabel>Дополнительно</SectionLabel>
        <Field
          label="Доп. атрибуты (JSON)"
          htmlFor="client-attributes"
          error={errors.attributes}
          hint='Произвольный JSON-объект, например {"vip": true}'
        >
          <textarea
            id="client-attributes"
            rows={3}
            value={form.attributes}
            disabled={submitting}
            placeholder="{}"
            spellCheck={false}
            onChange={(e) => {
              setField('attributes', e.target.value);
              clearError('attributes');
            }}
            className={cx(inputClass(!!errors.attributes), 'resize-y font-mono text-xs')}
          />
        </Field>
      </form>
    </Modal>
  );
}
