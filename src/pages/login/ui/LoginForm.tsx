import { useRef, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Lock, Mail } from 'lucide-react';
import { ApiError, isCredentialsError } from '@shared/api';
import { Button, Input, Spinner, notify } from '@shared/ui';
import { useSessionStore } from '@entities/session';
import { loginSchema, type LoginFormValues } from '../model';
import { CapsLockHint } from './CapsLockHint';

const MIN_LOADING_MS = 350;
const SUCCESS_HOLD_MS = 200;
const DEFAULT_REDIRECT = '/core';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

type SubmitPhase = 'idle' | 'loading' | 'success';

type LocationState = { from?: { pathname: string } } | null;

function buttonLabel(phase: SubmitPhase): string {
  switch (phase) {
    case 'loading':
      return 'Authenticating…';
    case 'success':
      return 'Welcome';
    default:
      return 'Continue';
  }
}

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useSessionStore((s) => s.login);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  const [phase, setPhase] = useState<SubmitPhase>('idle');
  /** Если true — следующий focus на password очистит поле (мера после ошибки кредов). */
  const passwordWasErroredRef = useRef<boolean>(false);

  const passwordReg = register('password');
  // RHF не предоставляет onFocus в register — собираем вручную.
  const onPasswordFocus = () => {
    if (passwordWasErroredRef.current) {
      setValue('password', '', { shouldValidate: false });
      passwordWasErroredRef.current = false;
    }
  };

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    if (phase !== 'idle') return; // защита от двойного submit
    setPhase('loading');
    try {
      const loginPromise = login(values.email, values.password);
      const delayPromise = sleep(MIN_LOADING_MS);
      await Promise.all([loginPromise, delayPromise]);

      setPhase('success');
      await sleep(SUCCESS_HOLD_MS);

      const from = (location.state as LocationState)?.from?.pathname ?? DEFAULT_REDIRECT;
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setPhase('idle');

      if (err instanceof ApiError) {
        if (isCredentialsError(err.code)) {
          notify.error('Invalid email or password');
          setValue('password', '', { shouldValidate: false });
          passwordWasErroredRef.current = true;
          setFocus('password');
          return;
        }
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          for (const detail of err.details) {
            if (detail.field === 'email' || detail.field === 'password') {
              setError(detail.field, { type: 'server', message: detail.message });
            }
          }
          return;
        }
        if (err.code === 'NETWORK_ERROR') {
          notify.error('Network error', { description: 'Backend unreachable' });
          return;
        }
        if (err.code === 'TIMEOUT') {
          notify.error('Request timed out');
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

      <div>
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          leftIcon={<Lock size={14} aria-hidden />}
          showToggle
          error={errors.password?.message}
          disabled={fieldsDisabled}
          required
          {...passwordReg}
          onFocus={onPasswordFocus}
        />
        <CapsLockHint />
      </div>

      <Button
        type="submit"
        className="mt-2 w-full"
        size="lg"
        disabled={fieldsDisabled}
        aria-busy={phase === 'loading' || undefined}
        leftIcon={
          phase === 'loading' ? (
            <Spinner size={14} label="Authenticating" />
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
