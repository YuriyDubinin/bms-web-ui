import { useState, type FormEvent } from 'react';
import { ApiError } from '@app/api';
import { ThemeSwitcher } from '@app/theme';
import type { ThemeId } from '@app/theme';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 255;
const PASSWORD_MAX = 72;

export type LoginPageProps = {
  theme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  /** Бросает ApiError при неуспехе; резолвится — App сам переключит на главную. */
  onLogin: (email: string, password: string) => Promise<void>;
};

type FieldErrors = { email?: string; password?: string };

function inputClasses(hasError: boolean): string {
  return cx(
    'w-full rounded-md border bg-bg-1 px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted',
    'transition-colors duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-state-error focus:border-state-error focus:ring-2 focus:ring-state-error-muted'
      : 'border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent-muted',
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function LoginPage({ theme, onThemeChange, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = 'Введите email';
    else if (trimmed.length > EMAIL_MAX) next.email = 'Слишком длинный email';
    else if (!EMAIL_RE.test(trimmed)) next.email = 'Некорректный email';

    if (!password) next.password = 'Введите пароль';
    else if (password.length > PASSWORD_MAX) next.password = 'Пароль слишком длинный';

    return next;
  };

  const mapError = (err: unknown): void => {
    if (err instanceof ApiError) {
      // 422 — не пройдена валидация полей. Клиентская проверка обычно ловит это раньше,
      // но на всякий случай подсвечиваем поля из details (сообщения — на русском).
      if (err.status === 422 && err.details?.length) {
        const fieldErrors: FieldErrors = {};
        for (const detail of err.details) {
          if (detail.field === 'email') fieldErrors.email = 'Некорректный email';
          else if (detail.field === 'password') fieldErrors.password = 'Некорректный пароль';
        }
        if (fieldErrors.email || fieldErrors.password) {
          setErrors(fieldErrors);
          return;
        }
        setFormError('Проверьте правильность введённых данных.');
        return;
      }
      // 401 — намеренно единое сообщение (сервер не различает «нет email» и «неверный пароль»).
      if (err.status === 401) {
        setFormError('Неверный email или пароль.');
        return;
      }
      if (err.code === 'NETWORK_ERROR') {
        setFormError('Не удалось связаться с сервером. Проверьте подключение.');
        return;
      }
      if (err.code === 'TIMEOUT') {
        setFormError('Превышено время ожидания. Попробуйте ещё раз.');
        return;
      }
      if (err.status === 400) {
        setFormError('Ошибка запроса. Попробуйте ещё раз.');
        return;
      }
      setFormError('Что-то пошло не так, попробуйте позже.');
      return;
    }
    setFormError('Что-то пошло не так, попробуйте позже.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    try {
      await onLogin(email, password);
      // Успех: App переключит на главную. Компонент размонтируется.
    } catch (err) {
      mapError(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-0 text-fg-primary transition-colors duration-300">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeSwitcher value={theme} onChange={onThemeChange} />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-20">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-fg-muted">BMS</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Вход в систему</h1>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Введите данные для доступа к платформе
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-state-error-muted px-3 py-2.5 text-sm text-state-error"
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="mt-0.5 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-fg-secondary">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                spellCheck={false}
                maxLength={EMAIL_MAX}
                required
                placeholder="you@company.com"
                value={email}
                disabled={submitting}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={inputClasses(!!errors.email)}
              />
              {errors.email ? (
                <p id="login-email-error" role="alert" className="text-xs text-state-error">
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-fg-secondary">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={PASSWORD_MAX}
                  required
                  placeholder="••••••••"
                  value={password}
                  disabled={submitting}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={cx(inputClasses(!!errors.password), 'pr-10')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-fg-muted transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
              {errors.password ? (
                <p id="login-password-error" role="alert" className="text-xs text-state-error">
                  {errors.password}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-on transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                    className="animate-spin"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Вход…
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <p className="mt-10 font-mono text-[11px] text-fg-muted">
            BMS © {new Date().getFullYear()} — платформа для оптимизации бизнеса
          </p>
        </div>
      </div>
    </div>
  );
}
