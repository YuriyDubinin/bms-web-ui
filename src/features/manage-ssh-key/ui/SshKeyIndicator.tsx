import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { IconButton, Spinner, Tooltip } from '@shared/ui';
import { cn } from '@shared/lib';
import { useSshCheckQuery, type SshKeyState } from '@entities/system';
import { SshKeyDialog } from './SshKeyDialog';

const TOOLTIP: Record<SshKeyState | 'loading', string> = {
  loading: 'Checking SSH key…',
  valid: 'SSH key ready — view & copy',
  missing: 'SSH key not created — click to generate',
  invalid: 'SSH key corrupted — click to recreate',
  error: 'SSH key check failed — click to fix',
};

/**
 * Индикатор SSH-ключа приложения в верхней панели Core/Main.
 * Зелёный (акцент со свечением) — ключ готов; красный — нет/битый/ошибка.
 * Клик открывает модалку с ключом (копирование) и действиями create/delete/recreate.
 * Проверка дёргается на маунте (вместе с остальными запросами) и после мутаций.
 */
export function SshKeyIndicator() {
  const { data, isLoading } = useSshCheckQuery();
  const [open, setOpen] = useState(false);

  const state: SshKeyState | 'loading' = isLoading && !data ? 'loading' : (data?.state ?? 'error');
  const ready = state === 'valid';
  const problem = state === 'missing' || state === 'invalid' || state === 'error';

  return (
    <>
      <Tooltip content={TOOLTIP[state]}>
        <IconButton
          aria-label={TOOLTIP[state]}
          size="sm"
          onClick={() => setOpen(true)}
          className={cn(
            'border',
            ready && 'border-accent/40 bg-accent-muted',
            problem && 'border-state-error/40 bg-state-error-muted',
          )}
        >
          {state === 'loading' ? (
            <Spinner size={13} label="Checking SSH key" />
          ) : (
            <KeyRound
              size={13}
              aria-hidden
              className={cn(
                ready && 'text-accent drop-shadow-[0_0_5px_currentColor]',
                problem && 'text-state-error',
              )}
            />
          )}
        </IconButton>
      </Tooltip>

      <SshKeyDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
