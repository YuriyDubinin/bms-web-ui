import { Lock, Star, Unlock } from 'lucide-react';
import { Chip } from '@shared/ui';
import { cn } from '@shared/lib';
import type { RegistryType } from '@entities/registry';
import { REGISTRY_TYPE_LABELS } from '@features/manage-registry';

export function RegistryTypeBadge({ type }: { type: RegistryType }) {
  return (
    <Chip tone="neutral" mono>
      {REGISTRY_TYPE_LABELS[type] ?? type}
    </Chip>
  );
}

export function RegistryActiveBadge({
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

export function RegistryLastStatus({ status }: { status?: string }) {
  if (!status) return <span className="font-mono text-[11px] text-fg-muted">not checked</span>;
  const ok = status.toUpperCase() === 'OK';
  return (
    <Chip tone={ok ? 'success' : 'error'} mono>
      {status}
    </Chip>
  );
}

export function RegistryCreds({ has }: { has: boolean }) {
  return has ? (
    <Lock size={13} aria-label="Credentials stored" className="text-accent" />
  ) : (
    <Unlock size={13} aria-label="No credentials" className="text-fg-muted" />
  );
}

export function RegistryDefaultMark({ isDefault }: { isDefault: boolean }) {
  if (!isDefault) return null;
  return (
    <Star size={13} aria-label="Default registry" className="fill-accent text-accent" />
  );
}
