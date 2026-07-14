import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, isExistsError, type EntityType } from '@shared/api';
import { Button, Checkbox, Dialog, Input, Select, notify } from '@shared/ui';
import {
  CUSTOM_FIELD_TYPE_OPTIONS,
  selectChoicesFromOptions,
  useCreateDefinition,
  useUpdateDefinition,
  type CustomFieldDefinition,
} from '@entities/custom-field';
import { customFieldDefinitionFormSchema, type CustomFieldDefinitionFormValues } from '../model/schema';

export type CustomFieldDefinitionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  definition?: CustomFieldDefinition | null;
};

const FORM_ID = 'custom-field-definition-form';

function emptyValues(): CustomFieldDefinitionFormValues {
  return { field_key: '', label: '', field_type: 'TEXT', choices: '', is_required: false, sort_order: '0' };
}

function valuesFromDefinition(d: CustomFieldDefinition): CustomFieldDefinitionFormValues {
  return {
    field_key: d.field_key,
    label: d.label,
    field_type: d.field_type,
    choices: selectChoicesFromOptions(d.options).join(', '),
    is_required: d.is_required,
    sort_order: String(d.sort_order ?? 0),
  };
}

export function CustomFieldDefinitionDialog({
  open,
  onOpenChange,
  entityType,
  definition,
}: CustomFieldDefinitionDialogProps) {
  const isEdit = !!definition;
  const createMut = useCreateDefinition();
  const updateMut = useUpdateDefinition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomFieldDefinitionFormValues>({
    resolver: zodResolver(customFieldDefinitionFormSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (open) reset(definition ? valuesFromDefinition(definition) : emptyValues());
  }, [open, definition, reset]);

  const fieldType = watch('field_type');

  const onSubmit = handleSubmit(async (values) => {
    const choices = values.choices
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const options = values.field_type === 'SELECT' && choices.length > 0 ? { choices } : undefined;

    try {
      if (isEdit && definition) {
        await updateMut.mutateAsync({
          id: definition.id,
          label: values.label.trim(),
          field_type: values.field_type,
          options,
          is_required: values.is_required,
          sort_order: values.sort_order.trim() ? Number(values.sort_order) : undefined,
        });
        notify.success('Field updated', { description: values.label });
      } else {
        await createMut.mutateAsync({
          entity_type: entityType,
          field_key: values.field_key.trim(),
          label: values.label.trim(),
          field_type: values.field_type,
          options,
          is_required: values.is_required,
          sort_order: values.sort_order.trim() ? Number(values.sort_order) : undefined,
        });
        notify.success('Field created', { description: values.label });
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (isExistsError(err.code)) {
          setError('field_key', { type: 'server', message: 'Key already used for this entity type' });
          return;
        }
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          for (const d of err.details) {
            if (d.field === 'field_key' || d.field === 'label') setError(d.field, { type: 'server', message: d.message });
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
      title={isEdit ? 'Edit field' : 'New field'}
      className="w-[min(94vw,480px)]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Key"
          placeholder="fleet_size"
          helper={isEdit ? 'Cannot be changed' : 'lowercase, digits, underscore'}
          error={errors.field_key?.message}
          disabled={isSubmitting || isEdit}
          {...register('field_key')}
        />
        <Input
          label="Label"
          required
          error={errors.label?.message}
          disabled={isSubmitting}
          {...register('label')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            options={CUSTOM_FIELD_TYPE_OPTIONS}
            error={errors.field_type?.message}
            disabled={isSubmitting}
            {...register('field_type')}
          />
          <Input
            label="Sort order"
            inputMode="numeric"
            error={errors.sort_order?.message}
            disabled={isSubmitting}
            {...register('sort_order')}
          />
        </div>

        {fieldType === 'SELECT' ? (
          <Input
            label="Choices"
            placeholder="small, medium, large"
            helper="Comma-separated list of options"
            error={errors.choices?.message}
            disabled={isSubmitting}
            {...register('choices')}
          />
        ) : null}

        <Checkbox label="Required" disabled={isSubmitting} {...register('is_required')} />
      </form>
    </Dialog>
  );
}
