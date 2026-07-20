import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  createService,
  updateService,
  type Project,
  type Service,
  type ServiceInput,
  type ServiceStatus,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, Modal, SelectSearch } from '@app/ui';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABELS,
} from './model';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const FORM_ID = 'service-form';

const NAME_MIN = 2;
const NAME_MAX = 255;
const CATEGORY_MAX = 255;
const DESCRIPTION_MAX = 5000;

type FieldKey =
  | 'name'
  | 'project_id'
  | 'category'
  | 'description'
  | 'price'
  | 'currency'
  | 'duration_min'
  | 'attributes';
type Errors = Partial<Record<FieldKey, string>>;

function inputClass(hasError: boolean): string {
  return cx(
    // min-w-0 обязателен: иначе числовые/нативные инпуты на мобильных не сжимаются и вылезают.
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

export type ServiceFormDialogProps = {
  open: boolean;
  /** null — режим создания; объект — режим редактирования. */
  service: Service | null;
  /** Проекты организации для выбора «домашнего» проекта услуги. */
  projects: Project[];
  /** Предвыбранный проект при создании (например, со страницы проекта). */
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  project_id: string;
  category: string;
  description: string;
  price: string;
  currency: string;
  duration_min: string;
  status: ServiceStatus;
  attributes: string;
};

function emptyForm(projectId = ''): FormState {
  return {
    name: '',
    project_id: projectId,
    category: '',
    description: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    duration_min: '',
    status: 'ACTIVE',
    attributes: '',
  };
}

function formFromService(s: Service): FormState {
  return {
    name: s.name,
    project_id: s.project_id ?? '',
    category: s.category,
    description: s.description,
    price: s.price !== null && s.price !== undefined ? String(s.price) : '',
    // Всегда рубль: валюта в продукте одна, старые записи с иной валютой нормализуем к RUB.
    currency: DEFAULT_CURRENCY,
    duration_min: s.duration_min !== null && s.duration_min !== undefined ? String(s.duration_min) : '',
    status: s.status,
    attributes:
      s.attributes && Object.keys(s.attributes).length > 0
        ? JSON.stringify(s.attributes, null, 2)
        : '',
  };
}

export function ServiceFormDialog({
  open,
  service,
  projects,
  defaultProjectId,
  onClose,
  onSaved,
}: ServiceFormDialogProps) {
  const { token, logout } = useAuth();
  const isEdit = !!service;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Заполняем форму при открытии: PUT перезаписывает услугу целиком, поэтому подставляем ВСЕ поля.
  // При создании подставляем предвыбранный проект (defaultProjectId), если он задан.
  useEffect(() => {
    if (!open) return;
    setForm(service ? formFromService(service) : emptyForm(defaultProjectId));
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, service, defaultProjectId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): { errors: Errors; price: number | null; duration: number | null; attributes: Record<string, unknown> } => {
    const next: Errors = {};
    const name = form.name.trim();
    if (name.length < NAME_MIN) next.name = 'Минимум 2 символа';
    else if (name.length > NAME_MAX) next.name = 'Слишком длинное название';
    if (form.category.trim().length > CATEGORY_MAX) next.category = 'Максимум 255 символов';
    if (form.description.trim().length > DESCRIPTION_MAX) next.description = 'Максимум 5000 символов';

    let price: number | null = null;
    const rawPrice = form.price.trim();
    if (rawPrice) {
      const parsed = Number(rawPrice);
      if (Number.isNaN(parsed)) next.price = 'Введите число';
      else if (parsed < 0) next.price = 'Цена не может быть отрицательной';
      else price = parsed;
    }

    let duration: number | null = null;
    const rawDuration = form.duration_min.trim();
    if (rawDuration) {
      const parsed = Number(rawDuration);
      if (!Number.isInteger(parsed)) next.duration_min = 'Введите целое число минут';
      else if (parsed < 1) next.duration_min = 'Минимум 1 минута';
      else duration = parsed;
    }

    let attributes: Record<string, unknown> = {};
    const rawAttrs = form.attributes.trim();
    if (rawAttrs) {
      try {
        const parsed: unknown = JSON.parse(rawAttrs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.attributes = 'Должен быть JSON-объект, например {"room": "VIP"}';
        } else {
          attributes = parsed as Record<string, unknown>;
        }
      } catch {
        next.attributes = 'Некорректный JSON';
      }
    }

    return { errors: next, price, duration, attributes };
  };

  const applyServerError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        void logout();
        return;
      }
      if (err.status === 404 || err.code === 'SERVICE_NOT_FOUND') {
        setFormError('Услуга не найдена — возможно, она была удалена. Обновите список.');
        return;
      }
      if (err.status === 422 && err.details?.length) {
        const mapped: Errors = {};
        for (const d of err.details) {
          if (
            d.field === 'name' ||
            d.field === 'project_id' ||
            d.field === 'category' ||
            d.field === 'description' ||
            d.field === 'price' ||
            d.field === 'currency' ||
            d.field === 'duration_min' ||
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

    const { errors: validationErrors, price, duration, attributes } = validate();
    setErrors(validationErrors);
    setFormError(null);
    if (Object.keys(validationErrors).length > 0) return;

    // PUT = полная замена: незаполненные project_id/price/duration_min НЕ отправляем —
    // бэкенд трактует отсутствие поля как сброс в null (а явный null в теле он отвергает).
    // Так один и тот же payload корректно и создаёт услугу, и очищает поля при редактировании.
    const payload: ServiceInput = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      currency: (form.currency || DEFAULT_CURRENCY).toUpperCase(),
      status: form.status,
      attributes,
      ...(form.project_id ? { project_id: form.project_id } : {}),
      ...(price !== null ? { price } : {}),
      ...(duration !== null ? { duration_min: duration } : {}),
    };

    setSubmitting(true);
    try {
      if (isEdit && service) {
        await updateService(token, { ...payload, id: service.id });
      } else {
        await createService(token, payload);
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
      title={isEdit ? 'Редактировать услугу' : 'Новая услуга'}
      description={isEdit ? service?.name : 'Заполните данные услуги'}
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

        <Field label="Название" htmlFor="service-name" required error={errors.name}>
          <input
            id="service-name"
            type="text"
            value={form.name}
            maxLength={NAME_MAX}
            disabled={submitting}
            placeholder="Например: Бухгалтерское обслуживание"
            onChange={(e) => setField('name', e.target.value)}
            className={inputClass(!!errors.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Проект"
            htmlFor="service-project"
            error={errors.project_id}
            hint="«Домашнее» направление услуги. Можно не выбирать."
          >
            <SelectSearch
              id="service-project"
              value={form.project_id}
              disabled={submitting}
              hasError={!!errors.project_id}
              placeholder="Без проекта"
              onChange={(v) => setField('project_id', v)}
              options={[
                { value: '', label: 'Без проекта' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              searchPlaceholder="Поиск проекта…"
            />
          </Field>

          <Field
            label="Категория"
            htmlFor="service-category"
            error={errors.category}
            hint="Свободный текст, например «spa» или «docs»."
          >
            <input
              id="service-category"
              type="text"
              value={form.category}
              maxLength={CATEGORY_MAX}
              disabled={submitting}
              placeholder="Например: Бухгалтерия"
              onChange={(e) => setField('category', e.target.value)}
              className={inputClass(!!errors.category)}
            />
          </Field>
        </div>

        <Field label="Описание" htmlFor="service-description" error={errors.description}>
          <textarea
            id="service-description"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            disabled={submitting}
            placeholder="Краткое описание услуги"
            onChange={(e) => setField('description', e.target.value)}
            className={cx(inputClass(!!errors.description), 'resize-y')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Цена" htmlFor="service-price" error={errors.price}>
            <input
              id="service-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.price}
              disabled={submitting}
              placeholder="0.00"
              onChange={(e) => setField('price', e.target.value)}
              className={inputClass(!!errors.price)}
            />
          </Field>

          <Field label="Валюта" htmlFor="service-currency" error={errors.currency}>
            <SelectSearch
              id="service-currency"
              value={form.currency}
              disabled={submitting}
              hasError={!!errors.currency}
              onChange={(v) => setField('currency', v)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
              searchPlaceholder="Поиск валюты…"
            />
          </Field>

          <Field label="Длительность, мин" htmlFor="service-duration" error={errors.duration_min}>
            <input
              id="service-duration"
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              value={form.duration_min}
              disabled={submitting}
              placeholder="60"
              onChange={(e) => setField('duration_min', e.target.value)}
              className={inputClass(!!errors.duration_min)}
            />
          </Field>
        </div>

        <Field label="Статус" htmlFor="service-status">
          <SelectSearch
            id="service-status"
            value={form.status}
            disabled={submitting}
            onChange={(v) => setField('status', v as ServiceStatus)}
            options={SERVICE_STATUSES.map((s) => ({ value: s, label: SERVICE_STATUS_LABELS[s] }))}
          />
        </Field>

        <Field
          label="Доп. атрибуты (JSON)"
          htmlFor="service-attributes"
          error={errors.attributes}
          hint='Произвольный JSON-объект, например {"warranty_days": 30}'
        >
          <textarea
            id="service-attributes"
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
