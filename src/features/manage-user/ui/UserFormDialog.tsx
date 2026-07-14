import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, isExistsError } from '@shared/api';
import { Button, Checkbox, Dialog, Input, Select, notify } from '@shared/ui';
import { useCreateUser, useUpdateUser, type CreateUserInput, type UpdateUserInput, type User } from '@entities/user';
import { ROLE_OPTIONS, USER_FORM_FIELDS, userFormSchema, type UserFormValues } from '../model/schema';

export type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задан — режим редактирования; иначе — создание. */
  user?: User | null;
};

const FORM_ID = 'user-form';

function emptyValues(): UserFormValues {
  return { email: '', full_name: '', role: 'STAFF', password: '', is_active: true };
}

function valuesFromUser(u: User): UserFormValues {
  return { email: u.email, full_name: u.full_name, role: u.role, password: '', is_active: u.is_active };
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (open) reset(user ? valuesFromUser(user) : emptyValues());
  }, [open, user, reset]);

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((USER_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof USER_FORM_FIELDS)[number], { type: 'server', message: d.message });
          }
        }
        return;
      }
      if (isExistsError(err.code)) {
        setError('email', { type: 'server', message: 'Email already taken' });
        return;
      }
      if (err.code === 'FORBIDDEN') {
        notify.error('Not allowed', { description: err.message });
        return;
      }
      notify.error(err.message || 'Request failed', { code: err.code });
      return;
    }
    notify.error('Something went wrong');
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && user) {
        const input: UpdateUserInput = {
          id: user.id,
          email: values.email.trim(),
          full_name: values.full_name.trim(),
          role: values.role,
          is_active: values.is_active,
          ...(values.password ? { password: values.password } : {}),
        };
        await updateMut.mutateAsync(input);
        notify.success('User updated', { description: values.full_name });
      } else {
        const input: CreateUserInput = {
          email: values.email.trim(),
          full_name: values.full_name.trim(),
          role: values.role,
          password: values.password,
          is_active: values.is_active,
        };
        await createMut.mutateAsync(input);
        notify.success('User created', { description: values.full_name });
      }
      onOpenChange(false);
    } catch (err) {
      applyServerError(err);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
      title={isEdit ? 'Edit team member' : 'Invite team member'}
      description={isEdit ? user?.email : 'Create an operator account'}
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
          label="Full name"
          required
          error={errors.full_name?.message}
          disabled={isSubmitting}
          {...register('full_name')}
        />
        <Input
          label="Email"
          type="email"
          required
          error={errors.email?.message}
          disabled={isSubmitting}
          autoComplete="off"
          {...register('email')}
        />
        <Select
          label="Role"
          options={ROLE_OPTIONS}
          error={errors.role?.message}
          disabled={isSubmitting}
          {...register('role')}
        />
        <Input
          label="Password"
          type="password"
          showToggle
          helper={isEdit ? 'Leave empty to keep current password' : '8–72 characters'}
          error={errors.password?.message}
          disabled={isSubmitting}
          autoComplete="new-password"
          {...register('password')}
        />
        {isEdit ? (
          <Checkbox
            label="Active"
            hint="Disabled operators cannot sign in."
            disabled={isSubmitting}
            {...register('is_active')}
          />
        ) : null}
      </form>
    </Dialog>
  );
}
