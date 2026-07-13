/* eslint-disable react-refresh/only-export-components -- notify.tsx — это namespace-объект с методами, не компонент */
import type { ReactNode } from 'react';
import { toast } from 'sonner';

export type NotifyOptions = {
  description?: ReactNode;
  /** Короткий код в моноширинном чипе (правый угол). Например, "422" / "VALIDATION_ERROR". */
  code?: string;
  action?: { label: string; onClick: () => void };
  /** Переопределить длительность, ms. */
  duration?: number;
};

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

function CodeChip({ code }: { code: string }) {
  return (
    <span
      className="ml-2 inline-flex items-center rounded-sm border border-border-subtle bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-fg-muted"
      aria-hidden
    >
      {code}
    </span>
  );
}

function compose(message: ReactNode, opts?: NotifyOptions): ReactNode {
  // `OK` — это самый частый success-код, и он избыточен рядом с заголовком тоста;
  // прячем именно его, остальные коды (AUTH_FAILED, 422, …) показываем как раньше.
  if (!opts?.code || opts.code === 'OK') return message;
  return (
    <span className="inline-flex items-center">
      <span>{message}</span>
      <CodeChip code={opts.code} />
    </span>
  );
}

function mapOpts(opts: NotifyOptions | undefined, defaultDuration: number) {
  return {
    description: opts?.description,
    duration: opts?.duration ?? defaultDuration,
    action: opts?.action
      ? { label: opts.action.label, onClick: opts.action.onClick }
      : undefined,
  };
}

export const notify = {
  success(message: ReactNode, opts?: NotifyOptions) {
    return toast.success(compose(message, opts), mapOpts(opts, DEFAULT_DURATION));
  },
  error(message: ReactNode, opts?: NotifyOptions) {
    return toast.error(compose(message, opts), mapOpts(opts, ERROR_DURATION));
  },
  warning(message: ReactNode, opts?: NotifyOptions) {
    return toast.warning(compose(message, opts), mapOpts(opts, DEFAULT_DURATION));
  },
  info(message: ReactNode, opts?: NotifyOptions) {
    return toast.info(compose(message, opts), mapOpts(opts, DEFAULT_DURATION));
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
