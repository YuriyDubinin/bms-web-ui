import { KeyRound, Lock, ShieldCheck, ShieldOff, Terminal } from 'lucide-react';
import { Chip, Tooltip, type ChipTone } from '@shared/ui';
import { cn } from '@shared/lib';
import {
  SERVER_AUTH_METHOD_LABELS,
  SERVER_ENVIRONMENT_LABELS,
  SERVER_PROTOCOL_LABELS,
} from '../model/labels';
import type { ServerAuthMethod, ServerEnvironment, ServerProtocol } from '../model/types';

const ENV_TONES: Record<ServerEnvironment, ChipTone> = {
  PRODUCTION: 'accent',
  STAGING: 'warning',
  DEVELOPMENT: 'info',
  TESTING: 'info',
  OTHER: 'neutral',
};

export function ServerEnvironmentBadge({ environment }: { environment: ServerEnvironment }) {
  return <Chip tone={ENV_TONES[environment] ?? 'neutral'}>{SERVER_ENVIRONMENT_LABELS[environment] ?? environment}</Chip>;
}

export function ServerProtocolBadge({ protocol }: { protocol: ServerProtocol }) {
  return (
    <Chip tone="neutral" mono>
      {SERVER_PROTOCOL_LABELS[protocol] ?? protocol}
    </Chip>
  );
}

export function ServerActiveBadge({
  active,
  pulse = false,
}: {
  active: boolean;
  /** Анимированная пульсация для активного (для карточек). */
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {active && pulse ? (
        <span className="relative inline-flex h-2 w-2 shrink-0 text-state-success">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-state-success' : 'bg-fg-muted')}
        />
      )}
      <span className={cn('text-xs', active ? 'text-fg-secondary' : 'text-fg-muted')}>
        {active ? 'Active' : 'Disabled'}
      </span>
    </span>
  );
}

export function ServerLastStatus({ status }: { status?: string }) {
  if (!status) return <span className="font-mono text-[11px] text-fg-muted">not checked</span>;
  const ok = status.toUpperCase() === 'OK';
  return (
    <Chip tone={ok ? 'success' : 'error'} mono>
      {status}
    </Chip>
  );
}

export function ServerCreds({
  hasPassword,
  hasPrivateKey,
}: {
  hasPassword: boolean;
  hasPrivateKey: boolean;
}) {
  if (hasPrivateKey) {
    // SSH-ключ — подсвечиваем акцентом со свечением: это «идеальный» способ входа.
    return (
      <KeyRound
        size={13}
        aria-label="SSH private key stored"
        className="text-accent drop-shadow-[0_0_5px_currentColor]"
      />
    );
  }
  if (hasPassword) {
    return <Lock size={13} aria-label="Password stored" className="text-fg-secondary" />;
  }
  return <Terminal size={13} aria-label="No stored secret (agent / none)" className="text-fg-muted" />;
}

export function ServerAuthMethodLabel({ method }: { method: ServerAuthMethod }) {
  return (
    <span className="font-mono text-xs text-fg-secondary">
      {SERVER_AUTH_METHOD_LABELS[method] ?? method}
    </span>
  );
}

/**
 * Индикатор «установлен ли публичный SSH-ключ приложения в authorized_keys
 * этого сервера». Стильный компактный chip-badge: иконка + мини-лейбл «SSH».
 *  - installed=true  → success-тон со свечением (вход по ключу подтверждён);
 *  - installed=false → muted-тон (ключ ещё не положен).
 */
export function ServerSshKeyBadge({ installed }: { installed: boolean }) {
  const tooltip = installed
    ? 'App SSH key is installed and verified on this server'
    : 'App SSH key is not installed on this server';
  const Icon = installed ? ShieldCheck : ShieldOff;
  return (
    <Tooltip content={tooltip}>
      <span
        role="status"
        aria-label={tooltip}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-tight',
          installed
            ? 'border-state-success/40 bg-state-success-muted text-state-success'
            : 'border-border-subtle bg-bg-2 text-fg-muted',
        )}
      >
        <Icon
          size={11}
          aria-hidden
          className={installed ? 'drop-shadow-[0_0_4px_currentColor]' : ''}
        />
        SSH
      </span>
    </Tooltip>
  );
}
