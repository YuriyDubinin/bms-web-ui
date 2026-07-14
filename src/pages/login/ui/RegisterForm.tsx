import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Lock, Mail, User } from 'lucide-react';
import { ApiError, isExistsError } from '@shared/api';
import { Button, Input, Spinner, notify } from '@shared/ui';
import { useSessionStore } from '@entities/session';
import { registerSchema, type RegisterFormValues } from '../model';

const MIN_LOADING_MS = 350;
const SUCCESS_HOLD_MS = 200;
const DEFAULT_REDIRECT = '/dashboard';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

type SubmitPhase = 'idle' | 'loading' | 'success';

function buttonLabel(phase: SubmitPhase): string {
  switch (phase) {
    case 'loading':
      return 'Creating…';
    case 'success':
      return 'Welcome';
    default:
      return 'Create organization';
  }
}

export function RegisterForm() {
  const navigate = useNavigate();
  const registerOrg = useSessionStore((s) => s.register);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { company_name: '', full_name: '', email: '', password: '' },
    mode: 'onSubmit',
  });

  const [phase, setPhase] = useState<SubmitPhase>('idle');

  const onSubmit: SubmitHandler<RegisterFormValues> = async (values) => {
    if (phase !== 'idle') return;
    setPhase('loading');
    try {
      const registerPromise = registerOrg(
        values.company_name,
        values.full_name,
        values.email,
        values.password,
      );
      const delayPromise = sleep(MIN_LOADING_MS);
      await Promise.all([registerPromise, delayPromise]);

      setPhase('success');
      await sleep(SUCCESS_HOLD_MS);
      navigate(DEFAULT_REDIRECT, { replace: true });
    } catch (err: unknown) {
      setPhase('idle');

      if (err instanceof ApiError) {
        if (isExistsError(err.code)) {
          setError('email', { type: 'server', message: 'Email already registered' });
          return;
        }
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          for (const detail of err.details) {
            if (detail.field in { company_name: 1, full_name: 1, email: 1, password: 1 }) {
              setError(detail.field as keyof RegisterFormValues, {
                type: 'server',
                message: detail.message,
              });
            }
          }
          return;
        }
        notify.error('Something went wrong', { description: err.code });
        return;
      }
      notify.error('Something went wrong');
    }
  };

  const fieldsDisabled = phase !== 'idle';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-busy={phase === 'loading' || undefined}
      className="flex flex-col gap-3"
    >
      <Input
        label="Company name"
        autoComplete="organization"
        leftIcon={<Building2 size={14} aria-hidden />}
        error={errors.company_name?.message}
        disabled={fieldsDisabled}
        required
        {...register('company_name')}
      />
      <Input
        label="Your name"
        autoComplete="name"
        leftIcon={<User size={14} aria-hidden />}
        error={errors.full_name?.message}
        disabled={fieldsDisabled}
        required
        {...register('full_name')}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="username"
        spellCheck={false}
        leftIcon={<Mail size={14} aria-hidden />}
        error={errors.email?.message}
        disabled={fieldsDisabled}
        required
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        leftIcon={<Lock size={14} aria-hidden />}
        showToggle
        helper="8–72 characters"
        error={errors.password?.message}
        disabled={fieldsDisabled}
        required
        {...register('password')}
      />

      <Button
        type="submit"
        className="mt-2 w-full"
        size="lg"
        disabled={fieldsDisabled}
        aria-busy={phase === 'loading' || undefined}
        leftIcon={
          phase === 'loading' ? (
            <Spinner size={14} label="Creating" />
          ) : phase === 'success' ? (
            <Check size={16} aria-hidden />
          ) : undefined
        }
      >
        {buttonLabel(phase)}
      </Button>
    </form>
  );
}
