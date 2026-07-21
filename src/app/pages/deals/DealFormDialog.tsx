import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  createDeal,
  updateDeal,
  type Client,
  type Deal,
  type DealInput,
  type DealStatus,
  type DealType,
  type Process,
  type Project,
  type Service,
  type User,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, Modal, SelectSearch } from '@app/ui';
import { clientName } from '../clients/model';
import {
  CURRENCIES,
  DEAL_STATUSES,
  DEAL_STATUS_LABELS,
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  DEFAULT_CURRENCY,
  formatDateTime,
} from './model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const FORM_ID = 'deal-form';

const TITLE_MIN = 2;
const TITLE_MAX = 255;
const DESCRIPTION_MAX = 10000;

type FieldKey =
  | 'title'
  | 'description'
  | 'amount'
  | 'currency'
  | 'probability'
  | 'expected_close_at'
  | 'project_id'
  | 'client_id'
  | 'service_id'
  | 'process_id'
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

export type DealFormDialogProps = {
  open: boolean;
  /** null — режим создания; объект — режим редактирования. */
  deal: Deal | null;
  projects: Project[];
  clients: Client[];
  /** Услуги организации — для привязки «основной» услуги сделки. */
  services: Service[];
  /** Процессы организации — для привязки сделки к процессу. */
  processes: Process[];
  /** Операторы организации — для выбора ответственного. */
  users: User[];
  /** Предвыбранный проект при создании (например, со страницы проекта). */
  defaultProjectId?: string;
  /** Предзаполненная дата закрытия при создании из календаря (YYYY-MM-DD). */
  defaultCloseAt?: string;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  title: string;
  description: string;
  status: DealStatus;
  type: DealType;
  amount: string;
  currency: string;
  probability: string;
  expected_close_at: string;
  project_id: string;
  client_id: string;
  service_id: string;
  process_id: string;
  assigned_to: string;
  attributes: string;
};

function emptyForm(projectId = '', closeDate = ''): FormState {
  return {
    title: '',
    description: '',
    status: 'NEW',
    type: 'INCOME',
    amount: '',
    currency: DEFAULT_CURRENCY,
    probability: '',
    expected_close_at: closeDate,
    project_id: projectId,
    client_id: '',
    service_id: '',
    process_id: '',
    assigned_to: '',
    attributes: '',
  };
}

function formFromDeal(d: Deal): FormState {
  return {
    title: d.title,
    description: d.description,
    status: d.status,
    type: d.type,
    amount: d.amount !== null && d.amount !== undefined ? String(d.amount) : '',
    // Всегда рубль: валюта в продукте одна, старые записи с иной валютой нормализуем к RUB.
    currency: DEFAULT_CURRENCY,
    probability: d.probability !== null && d.probability !== undefined ? String(d.probability) : '',
    expected_close_at: d.expected_close_at ?? '',
    project_id: d.project_id ?? '',
    client_id: d.client_id ?? '',
    service_id: d.service_id ?? '',
    process_id: d.process_id ?? '',
    assigned_to: d.assigned_to ?? '',
    attributes:
      d.attributes && Object.keys(d.attributes).length > 0
        ? JSON.stringify(d.attributes, null, 2)
        : '',
  };
}

export function DealFormDialog({
  open,
  deal,
  projects,
  clients,
  services,
  processes,
  users,
  defaultProjectId,
  defaultCloseAt,
  onClose,
  onSaved,
}: DealFormDialogProps) {
  const { token, logout } = useAuth();
  const isEdit = !!deal;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Заполняем форму при открытии: PUT перезаписывает сделку целиком, поэтому подставляем ВСЕ поля.
  useEffect(() => {
    if (!open) return;
    setForm(deal ? formFromDeal(deal) : emptyForm(defaultProjectId, defaultCloseAt));
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, deal, defaultProjectId, defaultCloseAt]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): {
    errors: Errors;
    amount: number | null;
    probability: number | null;
    attributes: Record<string, unknown>;
  } => {
    const next: Errors = {};
    const title = form.title.trim();
    if (title.length < TITLE_MIN) next.title = 'Минимум 2 символа';
    else if (title.length > TITLE_MAX) next.title = 'Максимум 255 символов';
    if (form.description.trim().length > DESCRIPTION_MAX) next.description = 'Слишком длинное описание';

    let amount: number | null = null;
    const rawAmount = form.amount.trim();
    if (rawAmount) {
      const parsed = Number(rawAmount);
      if (Number.isNaN(parsed)) next.amount = 'Введите число';
      else if (parsed < 0) next.amount = 'Сумма не может быть отрицательной';
      else amount = parsed;
    }

    let probability: number | null = null;
    const rawProb = form.probability.trim();
    if (rawProb) {
      const parsed = Number(rawProb);
      if (!Number.isInteger(parsed)) next.probability = 'Введите целое число';
      else if (parsed < 0 || parsed > 100) next.probability = 'От 0 до 100';
      else probability = parsed;
    }

    let attributes: Record<string, unknown> = {};
    const rawAttrs = form.attributes.trim();
    if (rawAttrs) {
      try {
        const parsed: unknown = JSON.parse(rawAttrs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.attributes = 'Должен быть JSON-объект, например {"source": "tender"}';
        } else {
          attributes = parsed as Record<string, unknown>;
        }
      } catch {
        next.attributes = 'Некорректный JSON';
      }
    }

    return { errors: next, amount, probability, attributes };
  };

  const applyServerError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        void logout();
        return;
      }
      if (err.status === 404 || err.code === 'DEAL_NOT_FOUND') {
        setFormError('Сделка не найдена — возможно, она была удалена. Обновите список.');
        return;
      }
      if (err.status === 422 && err.details?.length) {
        const mapped: Errors = {};
        for (const d of err.details) {
          if (
            d.field === 'title' ||
            d.field === 'description' ||
            d.field === 'amount' ||
            d.field === 'currency' ||
            d.field === 'probability' ||
            d.field === 'expected_close_at' ||
            d.field === 'project_id' ||
            d.field === 'client_id' ||
            d.field === 'service_id' ||
            d.field === 'process_id' ||
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

    const { errors: validationErrors, amount, probability, attributes } = validate();
    setErrors(validationErrors);
    setFormError(null);
    if (Object.keys(validationErrors).length > 0) return;

    // PUT = полная замена. Незаданные сумму/вероятность/дату/привязки опускаем — бэкенд
    // трактует отсутствие как null. closed_at/created_by не отправляем — read-only.
    const payload: DealInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      type: form.type,
      currency: (form.currency || DEFAULT_CURRENCY).toUpperCase(),
      attributes,
      ...(amount !== null ? { amount } : {}),
      ...(probability !== null ? { probability } : {}),
      ...(form.expected_close_at ? { expected_close_at: form.expected_close_at } : {}),
      ...(form.project_id ? { project_id: form.project_id } : {}),
      ...(form.client_id ? { client_id: form.client_id } : {}),
      ...(form.service_id ? { service_id: form.service_id } : {}),
      ...(form.process_id ? { process_id: form.process_id } : {}),
      ...(form.assigned_to ? { assigned_to: form.assigned_to } : {}),
    };

    setSubmitting(true);
    try {
      if (isEdit && deal) {
        await updateDeal(token, { ...payload, id: deal.id });
      } else {
        await createDeal(token, payload);
      }
      onSaved();
    } catch (err) {
      applyServerError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const authorName = deal?.created_by
    ? (users.find((u) => u.id === deal.created_by)?.full_name ?? '—')
    : '—';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Редактировать сделку' : 'Новая сделка'}
      description={isEdit ? deal?.title : 'Заполните данные сделки'}
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

        <Field label="Название" htmlFor="deal-title" required error={errors.title}>
          <input
            id="deal-title"
            type="text"
            value={form.title}
            maxLength={TITLE_MAX}
            disabled={submitting}
            placeholder="Например: Поставка оборудования по годовому контракту"
            onChange={(e) => setField('title', e.target.value)}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <Field label="Описание" htmlFor="deal-description" error={errors.description}>
          <textarea
            id="deal-description"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            disabled={submitting}
            placeholder="Суть и условия сделки"
            onChange={(e) => setField('description', e.target.value)}
            className={cx(inputClass(!!errors.description), 'resize-y')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Статус" htmlFor="deal-status">
            <SelectSearch
              id="deal-status"
              value={form.status}
              disabled={submitting}
              onChange={(v) => setField('status', v as DealStatus)}
              options={DEAL_STATUSES.map((s) => ({ value: s, label: DEAL_STATUS_LABELS[s] }))}
            />
          </Field>
          <Field label="Тип" htmlFor="deal-type">
            <SelectSearch
              id="deal-type"
              value={form.type}
              disabled={submitting}
              onChange={(v) => setField('type', v as DealType)}
              options={DEAL_TYPES.map((t) => ({ value: t, label: DEAL_TYPE_LABELS[t] }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Сумма" htmlFor="deal-amount" error={errors.amount}>
            <input
              id="deal-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.amount}
              disabled={submitting}
              placeholder="0.00"
              onChange={(e) => setField('amount', e.target.value)}
              className={inputClass(!!errors.amount)}
            />
          </Field>
          <Field label="Валюта" htmlFor="deal-currency" error={errors.currency}>
            <SelectSearch
              id="deal-currency"
              value={form.currency}
              disabled={submitting}
              hasError={!!errors.currency}
              searchPlaceholder="Поиск валюты…"
              onChange={(v) => setField('currency', v)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
            />
          </Field>
          <Field label="Вероятность, %" htmlFor="deal-probability" error={errors.probability}>
            <input
              id="deal-probability"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step="1"
              value={form.probability}
              disabled={submitting}
              placeholder="0–100"
              onChange={(e) => setField('probability', e.target.value)}
              className={inputClass(!!errors.probability)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Дата закрытия (план)" htmlFor="deal-close" error={errors.expected_close_at}>
            <input
              id="deal-close"
              type="date"
              value={form.expected_close_at}
              disabled={submitting}
              onChange={(e) => setField('expected_close_at', e.target.value)}
              className={inputClass(!!errors.expected_close_at)}
            />
          </Field>
          <Field label="Ответственный" htmlFor="deal-assignee" error={errors.assigned_to}>
            <SelectSearch
              id="deal-assignee"
              value={form.assigned_to}
              disabled={submitting}
              hasError={!!errors.assigned_to}
              placeholder="Без ответственного"
              searchPlaceholder="Поиск сотрудника…"
              onChange={(v) => setField('assigned_to', v)}
              options={[
                { value: '', label: 'Без ответственного' },
                ...users.map((u) => ({ value: u.id, label: u.full_name || u.email })),
              ]}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Проект" htmlFor="deal-project" error={errors.project_id}>
            <SelectSearch
              id="deal-project"
              value={form.project_id}
              disabled={submitting}
              hasError={!!errors.project_id}
              placeholder="Без проекта"
              searchPlaceholder="Поиск проекта…"
              onChange={(v) => setField('project_id', v)}
              options={[
                { value: '', label: 'Без проекта' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Field>
          <Field label="Клиент" htmlFor="deal-client" error={errors.client_id}>
            <SelectSearch
              id="deal-client"
              value={form.client_id}
              disabled={submitting}
              hasError={!!errors.client_id}
              placeholder="Без клиента"
              searchPlaceholder="Поиск клиента…"
              onChange={(v) => setField('client_id', v)}
              options={[
                { value: '', label: 'Без клиента' },
                ...clients.map((c) => ({ value: c.id, label: clientName(c) })),
              ]}
            />
          </Field>
          <Field label="Услуга" htmlFor="deal-service" error={errors.service_id}>
            <SelectSearch
              id="deal-service"
              value={form.service_id}
              disabled={submitting}
              hasError={!!errors.service_id}
              placeholder="Без услуги"
              searchPlaceholder="Поиск услуги…"
              onChange={(v) => setField('service_id', v)}
              options={[
                { value: '', label: 'Без услуги' },
                ...services.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
        </div>

        <Field
          label="Процесс"
          htmlFor="deal-process"
          error={errors.process_id}
          hint="В рамках какого процесса выполняется сделка"
        >
          <SelectSearch
            id="deal-process"
            value={form.process_id}
            disabled={submitting}
            hasError={!!errors.process_id}
            placeholder="Без процесса"
            searchPlaceholder="Поиск процесса…"
            onChange={(v) => setField('process_id', v)}
            options={[
              { value: '', label: 'Без процесса' },
              ...processes.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </Field>

        <SectionLabel>Дополнительно</SectionLabel>
        <Field
          label="Доп. атрибуты (JSON)"
          htmlFor="deal-attributes"
          error={errors.attributes}
          hint='Произвольный JSON-объект, например {"source": "tender"}'
        >
          <textarea
            id="deal-attributes"
            rows={3}
            value={form.attributes}
            disabled={submitting}
            placeholder="{}"
            spellCheck={false}
            onChange={(e) => setField('attributes', e.target.value)}
            className={cx(inputClass(!!errors.attributes), 'resize-y font-mono text-xs')}
          />
        </Field>

        {isEdit && deal ? (
          <>
            <SectionLabel>Служебное</SectionLabel>
            <dl className="grid grid-cols-1 gap-3 rounded-md bg-bg-2/40 p-3 text-xs sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-fg-muted">Автор</dt>
                <dd className="mt-0.5 truncate text-fg-secondary">{authorName}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-muted">Создана</dt>
                <dd className="mt-0.5 text-fg-secondary">{formatDateTime(deal.created_at)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-muted">Закрыта</dt>
                <dd className="mt-0.5 text-fg-secondary">
                  {deal.closed_at ? formatDateTime(deal.closed_at) : '—'}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
