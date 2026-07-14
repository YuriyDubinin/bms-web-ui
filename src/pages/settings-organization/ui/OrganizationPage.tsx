import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@shared/api';
import { Button, Card, Chip, FullScreenSpinner, Input, Textarea, notify } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { sessionSelectors, useSessionStore } from '@entities/session';
import { useCustomerQuery, useUpdateCustomer, type Customer } from '@entities/customer';
import {
  ORGANIZATION_FORM_FIELDS,
  organizationFormSchema,
  type OrganizationFormValues,
} from '../model';

function valuesFromCustomer(c: Customer): OrganizationFormValues {
  return {
    name: c.name,
    legal_name: c.legal_name ?? '',
    industry: c.industry ?? '',
    email: c.email,
    phone: c.phone ?? '',
    timezone: c.timezone,
    locale: c.locale,
    settings: c.settings && Object.keys(c.settings).length > 0 ? JSON.stringify(c.settings, null, 2) : '',
  };
}

export function OrganizationPage() {
  useDocumentTitle('Organization');
  const canEdit = useSessionStore(sessionSelectors.isOwnerOrAdmin);
  const { data: customer, isLoading } = useCustomerQuery();
  const updateMut = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      legal_name: '',
      industry: '',
      email: '',
      phone: '',
      timezone: 'UTC',
      locale: 'ru',
      settings: '',
    },
  });

  useEffect(() => {
    if (customer) reset(valuesFromCustomer(customer));
  }, [customer, reset]);

  if (isLoading || !customer) {
    return <FullScreenSpinner label="Loading organization" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    let settings: Record<string, unknown> | undefined;
    const trimmedSettings = values.settings.trim();
    if (trimmedSettings) {
      try {
        settings = JSON.parse(trimmedSettings) as Record<string, unknown>;
      } catch {
        setError('settings', { type: 'validation', message: 'Must be a valid JSON object' });
        return;
      }
    }

    try {
      await updateMut.mutateAsync({
        name: values.name.trim(),
        legal_name: values.legal_name.trim() || undefined,
        industry: values.industry.trim() || undefined,
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        timezone: values.timezone.trim() || undefined,
        locale: values.locale.trim() || undefined,
        settings,
      });
      notify.success('Organization updated');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          for (const d of err.details) {
            if ((ORGANIZATION_FORM_FIELDS as readonly string[]).includes(d.field)) {
              setError(d.field as (typeof ORGANIZATION_FORM_FIELDS)[number], {
                type: 'server',
                message: d.message,
              });
            }
          }
          return;
        }
        notify.error(err.message || 'Request failed', { code: err.code });
        return;
      }
      notify.error('Something went wrong');
    }
  });

  return (
    <>
      <PageHeader
        title="Organization"
        subtitle={'// company profile & settings'}
        actions={
          <div className="flex items-center gap-2">
            <Chip tone="accent" mono>
              {customer.subscription_plan}
            </Chip>
            <Chip tone={customer.subscription_status === 'ACTIVE' ? 'success' : 'neutral'} mono>
              {customer.subscription_status}
            </Chip>
          </div>
        }
      />

      <Card className="max-w-2xl">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              error={errors.name?.message}
              disabled={isSubmitting || !canEdit}
              {...register('name')}
            />
            <Input
              label="Legal name"
              error={errors.legal_name?.message}
              disabled={isSubmitting || !canEdit}
              {...register('legal_name')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Industry"
              error={errors.industry?.message}
              disabled={isSubmitting || !canEdit}
              {...register('industry')}
            />
            <Input
              label="Email"
              type="email"
              required
              error={errors.email?.message}
              disabled={isSubmitting || !canEdit}
              {...register('email')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Phone"
              error={errors.phone?.message}
              disabled={isSubmitting || !canEdit}
              {...register('phone')}
            />
            <Input
              label="Timezone"
              placeholder="UTC"
              error={errors.timezone?.message}
              disabled={isSubmitting || !canEdit}
              {...register('timezone')}
            />
            <Input
              label="Locale"
              placeholder="ru"
              error={errors.locale?.message}
              disabled={isSubmitting || !canEdit}
              {...register('locale')}
            />
          </div>

          <Textarea
            label="Settings (JSON)"
            rows={5}
            placeholder="{}"
            className="font-mono text-xs"
            error={errors.settings?.message}
            disabled={isSubmitting || !canEdit}
            {...register('settings')}
          />

          {canEdit ? (
            <div className="flex justify-end border-t border-border-subtle pt-4">
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          ) : (
            <p className="text-xs text-fg-muted">Only OWNER/ADMIN can edit organization settings.</p>
          )}
        </form>
      </Card>
    </>
  );
}
